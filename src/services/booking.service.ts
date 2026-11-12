import { Types } from "mongoose";
import { CustomError } from "../errors/customError.error";
import { Booking, BOOKING_STATUSES, BookingStatus } from "../models/booking.model";
import { Branch } from "../models/branch.model";
import { Product } from "../models/product.model";
import { env } from "../config/env";
import { layout, sendEmail } from "./email.service";

const PAGE_SIZE = 20;

export interface CreatePublicBookingInput {
  productId?: string;
  branchId?: string;
  customer?: { name?: string; email?: string; phone?: string };
  pet?: { name?: string; species?: string; breed?: string };
  preferredAt?: string;
  preferredEnd?: string;
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
    email: String(input.customer?.email ?? "")
      .trim()
      .toLowerCase(),
    phone: String(input.customer?.phone ?? "").trim(),
  };
  if (!customer.name || !customer.phone) {
    throw new CustomError("El nombre y el teléfono son obligatorios para reservar", 400);
  }

  const pet = {
    name: String(input.pet?.name ?? "").trim(),
    species: String(input.pet?.species ?? "").trim(),
    breed: String(input.pet?.breed ?? "").trim(),
  };
  if (!pet.name || !pet.species || !pet.breed) {
    throw new CustomError("El nombre, la especie y la raza de la mascota son obligatorios", 400);
  }

  const preferredAt = new Date(String(input.preferredAt ?? ""));
  if (Number.isNaN(preferredAt.getTime())) {
    throw new CustomError("La fecha de la reserva no es válida", 400);
  }

  let preferredEnd: Date | null = null;
  if (input.preferredEnd) {
    preferredEnd = new Date(String(input.preferredEnd));
    if (Number.isNaN(preferredEnd.getTime()) || preferredEnd < preferredAt) {
      throw new CustomError("La fecha de salida no es válida", 400);
    }
  }

  const booking = await Booking.create({
    product: product._id,
    branch: branch._id,
    order: null,
    customer,
    pet,
    preferredAt,
    preferredEnd,
    notes: String(input.notes ?? "").trim(),
  });

  // Aviso al local. sendEmail nunca lanza: sin Resend la reserva igual queda en el panel.
  const day = (date: Date) => date.toLocaleDateString("es-EC", { timeZone: "America/Guayaquil" });
  await sendEmail(
    env.ADMIN_EMAIL,
    `Nueva reserva: ${product.name} — ${branch.name}`,
    layout(
      "Nueva reserva",
      `<p><strong>${product.name}</strong> en ${branch.name}<br/>
       Fecha: ${day(preferredAt)}${preferredEnd ? ` al ${day(preferredEnd)}` : ""}</p>
       <p>${escapeHtml(customer.name)} · ${escapeHtml(customer.phone)} · ${escapeHtml(customer.email)}<br/>
       Mascota: ${escapeHtml(pet.name)} (${escapeHtml(pet.species)}, ${escapeHtml(pet.breed)})</p>
       <p>Confírmala desde el panel, en Reservas.</p>`,
    ),
  );

  return booking;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
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
