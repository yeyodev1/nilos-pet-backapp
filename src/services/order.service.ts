import { Types } from "mongoose";
import { env } from "../config/env";
import { CustomError } from "../errors/customError.error";
import { Booking } from "../models/booking.model";
import { Branch } from "../models/branch.model";
import { Order, nextOrderNumber, ORDER_STATUSES } from "../models/order.model";
import { Product, finalPrice } from "../models/product.model";
import { sendOrderConfirmation } from "./email.service";
import * as payphoneService from "./payphone.service";

const PAGE_SIZE = 20;

export interface CreateOrderInput {
  items?: {
    productId?: string;
    qty?: number;
    branchId?: string | null;
    scheduledFor?: string | null;
  }[];
  customer?: { name?: string; email?: string; phone?: string; documentId?: string };
  fulfillment?: string;
  branchId?: string | null;
  deliveryAddress?: string;
}

/** Único por intento de pago y ≤ 50 caracteres, como exige la Cajita. */
function buildClientTransactionId(): string {
  return `NP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function requireActiveBranch(branchId: string, context: string) {
  if (!Types.ObjectId.isValid(branchId)) {
    throw new CustomError(`La sucursal elegida para ${context} no es válida`, 400);
  }
  const branch = await Branch.findById(branchId);
  if (!branch || !branch.isActive) {
    throw new CustomError(`La sucursal elegida para ${context} no está disponible`, 400);
  }
  return branch;
}

export async function createOrder(input: CreateOrderInput, userId: string | null) {
  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (rawItems.length === 0) {
    throw new CustomError("El carrito está vacío", 400);
  }

  const customer = {
    name: String(input.customer?.name ?? "").trim(),
    email: String(input.customer?.email ?? "")
      .trim()
      .toLowerCase(),
    phone: String(input.customer?.phone ?? "").trim(),
    documentId: String(input.customer?.documentId ?? "").trim(),
  };
  if (!customer.name || !customer.email) {
    throw new CustomError("El nombre y el correo del comprador son obligatorios", 400);
  }

  const fulfillment = input.fulfillment === "delivery" ? "delivery" : "pickup";
  const deliveryAddress = String(input.deliveryAddress ?? "").trim();
  if (fulfillment === "delivery" && !deliveryAddress) {
    throw new CustomError("La dirección de entrega es obligatoria para envíos a domicilio", 400);
  }

  let orderBranch: Types.ObjectId | null = null;
  if (input.branchId) {
    const branch = await requireActiveBranch(String(input.branchId), "el retiro");
    orderBranch = branch._id;
  }

  // El total se calcula SIEMPRE con los precios de la base: el cliente solo manda ids y cantidades.
  const items = [];
  let total = 0;

  for (const raw of rawItems) {
    const productId = String(raw.productId ?? "");
    if (!Types.ObjectId.isValid(productId)) {
      throw new CustomError("Uno de los productos del carrito no es válido", 400);
    }

    const product = await Product.findById(productId);
    if (
      !product ||
      !product.isPublished ||
      product.price <= 0 ||
      product.priceFrom ||
      !product.payOnline
    ) {
      throw new CustomError(
        `El producto "${product?.name ?? "desconocido"}" no está disponible para la venta`,
        400,
      );
    }

    const qty = Number(raw.qty) || 1;
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw new CustomError(`La cantidad de "${product.name}" no es válida`, 400);
    }

    let itemBranch: Types.ObjectId | null = null;
    let scheduledFor: Date | null = null;

    if (product.type !== "physical" && product.bookable) {
      if (!raw.branchId || !raw.scheduledFor) {
        throw new CustomError(
          `El servicio "${product.name}" necesita sucursal y fecha para reservar`,
          400,
        );
      }
      const branch = await requireActiveBranch(String(raw.branchId), `"${product.name}"`);
      itemBranch = branch._id;
      scheduledFor = new Date(String(raw.scheduledFor));
      if (Number.isNaN(scheduledFor.getTime())) {
        throw new CustomError(`La fecha de la reserva de "${product.name}" no es válida`, 400);
      }
    }

    items.push({
      product: product._id,
      name: product.name,
      price: finalPrice(product),
      qty,
      branch: itemBranch,
      scheduledFor,
    });
    total += finalPrice(product) * qty;
  }

  const order = await Order.create({
    number: await nextOrderNumber(),
    user: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null,
    customer,
    items,
    total,
    clientTransactionId: buildClientTransactionId(),
    status: "pending",
    fulfillment,
    branch: orderBranch,
    deliveryAddress,
  });

  // Configuración de la Cajita: el token viaja al navegador por diseño de Payphone,
  // pero sale del backend para poder rotarlo sin redeploy del frontend.
  const cajita = {
    token: env.PAYPHONE_TOKEN,
    storeId: env.PAYPHONE_STORE_ID,
    clientTransactionId: order.clientTransactionId,
    amount: order.total,
    amountWithoutTax: order.total,
    reference: `Compra Nilos Pet #${order.number}`,
  };

  return { order, cajita };
}

/**
 * Confirma el pago contra Payphone. Idempotente: la página de respuesta se
 * recarga más de lo que uno cree y no debe duplicar reservas ni correos.
 */
export async function confirmOrder(id: number | string, clientTransactionId: string) {
  if (!clientTransactionId) {
    throw new CustomError("Falta el identificador de la transacción", 400);
  }

  const order = await Order.findOne({ clientTransactionId });
  if (!order) throw new CustomError("Orden no encontrada", 404);
  if (order.status === "paid") return order;

  const confirmation = await payphoneService.confirmPayment(id, clientTransactionId);
  order.payphoneResponse = confirmation;

  if (confirmation.statusCode === payphoneService.PAYPHONE_APPROVED) {
    // Antes de entregar nada, el monto cobrado debe cuadrar con la orden guardada.
    if (Number(confirmation.amount) !== order.total) {
      order.status = "failed";
      await order.save();
      throw new CustomError("El monto pagado no coincide con el total de la orden", 409);
    }

    order.status = "paid";
    await order.save();

    // Cada servicio agendado del carrito se vuelve una reserva pendiente de confirmar.
    for (const item of order.items) {
      if (!item.branch || !item.scheduledFor) continue;
      await Booking.create({
        product: item.product,
        branch: item.branch,
        order: order._id,
        customer: {
          name: order.customer.name,
          email: order.customer.email,
          phone: order.customer.phone,
        },
        preferredAt: item.scheduledFor,
        status: "pending",
      });
    }

    // sendOrderConfirmation nunca lanza: un correo caído no revierte un pago aprobado.
    await sendOrderConfirmation(order);
    return order;
  }

  if (confirmation.statusCode === payphoneService.PAYPHONE_CANCELED) {
    order.status = "canceled";
  } else {
    order.status = "failed";
  }
  await order.save();
  return order;
}

export async function listMine(userId: string, page = 1) {
  const currentPage = Math.max(1, Number(page) || 1);
  const query = { user: userId };

  const total = await Order.countDocuments(query);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const items = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE);

  return { items, total, page: currentPage, pages };
}

export async function list(filters: { status?: string; page?: number }) {
  const currentPage = Math.max(1, Number(filters.page) || 1);
  const query: Record<string, unknown> = {};
  if (filters.status && (ORDER_STATUSES as readonly string[]).includes(filters.status)) {
    query.status = filters.status;
  }

  const total = await Order.countDocuments(query);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const items = await Order.find(query)
    .populate("branch", "name")
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE);

  return { items, total, page: currentPage, pages };
}

export async function getById(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new CustomError("Orden no encontrada", 404);
  const order = await Order.findById(id)
    .populate("branch", "name")
    .populate("items.product", "name slug type")
    .populate("items.branch", "name");
  if (!order) throw new CustomError("Orden no encontrada", 404);
  return order;
}
