import { CustomError } from "../errors/customError.error";
import { Booking } from "../models/booking.model";
import { Order } from "../models/order.model";

export interface ReturningCustomer {
  name: string;
  email: string;
  phone: string;
  documentId: string;
  pet?: { name: string; species: string; breed: string };
}

/** Compara teléfonos sin importar formato: 0991234567 = +593 99 123 4567. */
export const samePhone = (a: string, b: string) => {
  const tail = (value: string) => value.replace(/\D/g, "").slice(-9);
  return tail(a).length === 9 && tail(a) === tail(b);
};

// Igualdad sin distinguir mayúsculas en el correo.
const CASELESS = { locale: "es", strength: 2 };

/**
 * Datos de la compra o reserva más reciente para un correo. Pide también el
 * teléfono: con solo el correo cualquiera vería la cédula y el celular ajenos.
 */
export async function lookup(input: { email?: string; phone?: string }) {
  const email = String(input.email ?? "").trim();
  const phone = String(input.phone ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email) || phone.replace(/\D/g, "").length < 9) {
    throw new CustomError("Escribe tu correo y tu celular completo", 400);
  }

  const [orders, bookings] = await Promise.all([
    Order.find({ "customer.email": email }).collation(CASELESS).sort({ createdAt: -1 }).limit(20).lean(),
    Booking.find({ "customer.email": email }).collation(CASELESS).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  const order = orders.find((o) => samePhone(o.customer.phone, phone));
  const booking = bookings.find((b) => samePhone(b.customer.phone, phone));
  if (!order && !booking) return null;

  // El nombre y teléfono salen del registro más nuevo; la cédula solo existe en órdenes.
  const newest = [order, booking]
    .filter((doc) => doc)
    .sort((a, b) => +new Date(b!.createdAt!) - +new Date(a!.createdAt!))[0]!;
  const customer: ReturningCustomer = {
    name: newest.customer.name,
    email: newest.customer.email,
    phone: newest.customer.phone,
    documentId: order?.customer.documentId ?? "",
  };
  if (booking?.pet?.name) customer.pet = booking.pet;
  return customer;
}
