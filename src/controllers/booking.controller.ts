import { Request, Response, NextFunction } from "express";
import * as bookingService from "../services/booking.service";

/**
 * POST /api/bookings — body: { productId, branchId, customer: { name, email?, phone },
 * preferredAt, notes? }. Reserva sin pago en línea.
 */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.createPublic(req.body ?? {});
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/bookings — query: status, page */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.list({
      status: req.query.status ? String(req.query.status) : undefined,
      page: Number(req.query.page) || 1,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/admin/bookings/:id — body: { status } */
export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.updateStatus(
      String(req.params.id),
      String(req.body?.status ?? ""),
    );
    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
}
