import { Request, Response, NextFunction } from "express";
import * as customerService from "../services/customer.service";

/** POST /api/customers/lookup — body: { email, phone }. Autollenado para clientes que vuelven. */
export async function lookup(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.lookup(req.body ?? {});
    res.status(200).json({ customer });
  } catch (error) {
    next(error);
  }
}
