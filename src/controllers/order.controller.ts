import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { CustomError } from "../errors/customError.error";
import * as orderService from "../services/order.service";

/**
 * POST /api/orders — body: { items: [{ productId, qty, branchId?, scheduledFor? }],
 * customer: { name, email, phone?, documentId? }, fulfillment?, branchId?, deliveryAddress? }
 * Con Bearer válido la orden queda asociada al usuario; sin token es de invitado.
 */
export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await orderService.createOrder(req.body ?? {}, req.user?.userId ?? null);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/** POST /api/orders/confirm — body: { id, clientTransactionId } (lo que manda Payphone). */
export async function confirm(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, clientTransactionId } = req.body ?? {};
    const order = await orderService.confirmOrder(
      String(id ?? ""),
      String(clientTransactionId ?? ""),
    );
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
}

/** GET /api/orders/mine — query: page */
export async function listMine(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new CustomError("No autorizado", 401);
    const result = await orderService.listMine(req.user.userId, Number(req.query.page) || 1);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/orders — query: status, page */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await orderService.list({
      status: req.query.status ? String(req.query.status) : undefined,
      page: Number(req.query.page) || 1,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/orders/:id */
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await orderService.getById(req.params.id);
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
}
