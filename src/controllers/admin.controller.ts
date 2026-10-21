import { Request, Response, NextFunction } from "express";
import * as adminService from "../services/admin.service";

/** GET /api/admin/stats */
export async function stats(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.stats();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/customers — query: search, page */
export async function listCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.listCustomers({
      search: req.query.search ? String(req.query.search) : undefined,
      page: Number(req.query.page) || 1,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
