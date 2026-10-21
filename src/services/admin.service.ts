import { Booking } from "../models/booking.model";
import { ExamResult } from "../models/examResult.model";
import { Order } from "../models/order.model";
import { Product } from "../models/product.model";
import { User } from "../models/user.model";

const PAGE_SIZE = 20;

/** Resumen del panel: un número por tarjeta. */
export async function stats() {
  const [
    products,
    published,
    unpriced,
    orders,
    paidOrders,
    bookings,
    pendingBookings,
    customers,
    examResults,
  ] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ isPublished: true }),
    Product.countDocuments({ price: { $lte: 0 } }),
    Order.countDocuments(),
    Order.countDocuments({ status: "paid" }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: "pending" }),
    User.countDocuments({ accountType: "customer" }),
    ExamResult.countDocuments(),
  ]);

  return {
    products,
    published,
    unpriced,
    orders,
    paidOrders,
    bookings,
    pendingBookings,
    customers,
    examResults,
  };
}

/** Clientes registrados. El password tiene select: false, nunca viaja. */
export async function listCustomers(filters: { search?: string; page?: number }) {
  const page = Math.max(1, Number(filters.page) || 1);
  const query: Record<string, unknown> = { accountType: "customer" };

  if (filters.search) {
    const regex = {
      $regex: String(filters.search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
    query.$or = [{ name: regex }, { email: regex }];
  }

  const total = await User.countDocuments(query);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const items = await User.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE);

  return { items, total, page, pages };
}
