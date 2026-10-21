import { Types } from "mongoose";
import { CustomError } from "../errors/customError.error";
import { Booking, BOOKING_STATUSES, BookingStatus } from "../models/booking.model";
import { Branch } from "../models/branch.model";
import { Product } from "../models/product.model";

const PAGE_SIZE = 20;

export interface CreatePublicBookingInput {
  productId?: string;
  branchId?: string;
  customer?: { name?: string; email?: string; phone?: string };
  preferredAt?: string;
  notes?: string;
}

/** Reserva sin pago en línea: el cliente agenda y paga en la sucursal. */
export async function createPublic(input: CreatePublicBookingInput) {
  const productId = String(input.productId ?? "");
  if (!Types.ObjectId.isValid(productId)) {
    throw new CustomError("El servicio elegido no es válido", 400);
  }
  const product = await Product.findById(productId);
  if (!product || !product.isPublished || !product.bookable) {
    throw new CustomError("Ese servicio no admite reservas en línea", 400);
  }

  const branchId = String(input.branchId ?? "");
  if (!Types.ObjectId.isValid(branchId)) {
    throw new CustomError("La sucursal elegida no es válida", 400);
  }
  const branch = await Branch.findById(branchId);
  if (!branch || !branch.isActive) {
    throw new CustomError("La sucursal elegida no está disponible", 400);
  }

  const customer = {
    name: String(input.customer?.name ?? "").trim(),
    email: String(input.customer?.email ?? "").trim().toLowerCase(),
    phone: String(input.customer?.phone ?? "").trim(),
  };
  if (!customer.name || !customer.phone) {
    throw new CustomError("El nombre y el teléfono son obligatorios para reservar", 400);
  }

  const preferredAt = new Date(String(input.preferredAt ?? ""));
  if (Number.isNaN(preferredAt.getTime())) {
    throw new CustomError("La fecha de la reserva no es válida", 400);
  }

  return Booking.create({
    product: product._id,
    branch: branch._id,
    order: null,
    customer,
    preferredAt,
    notes: String(input.notes ?? "").trim(),
  });
}

export async function list(filters: { status?: string; page?: number }) {
  const page = Math.max(1, Number(filters.page) || 1);
  const query: Record<string, unknown> = {};
  if (filters.status && (BOOKING_STATUSES as readonly string[]).includes(filters.status)) {
    query.status = filters.status;
  }

  const total = await Booking.countDocuments(query);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const items = await Booking.find(query)
    .populate("product", "name slug")
    .populate("branch", "name")
    .sort({ preferredAt: 1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE);

  return { items, total, page, pages };
}

export async function updateStatus(id: string, status: string) {
  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) {
    throw new CustomError("Estado de reserva inválido", 400);
  }
  if (!Types.ObjectId.isValid(id)) throw new CustomError("Reserva no encontrada", 404);

  const booking = await Booking.findById(id);
  if (!booking) throw new CustomError("Reserva no encontrada", 404);

  booking.status = status as BookingStatus;
  await booking.save();
  return booking.populate([
    { path: "product", select: "name slug" },
    { path: "branch", select: "name" },
  ]);
}
