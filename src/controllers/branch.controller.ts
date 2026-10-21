import { Request, Response, NextFunction } from "express";
import * as branchService from "../services/branch.service";

/** GET /api/branches — solo sucursales activas. */
export async function listActive(_req: Request, res: Response, next: NextFunction) {
  try {
    const branches = await branchService.listActive();
    res.status(200).json(branches);
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/branches — todas. */
export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const branches = await branchService.list();
    res.status(200).json(branches);
  } catch (error) {
    next(error);
  }
}

/** POST /api/admin/branches — body: { name, address?, city?, phone?, mapsUrl?, isActive? } */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const branch = await branchService.create(req.body ?? {});
    res.status(201).json(branch);
  } catch (error) {
    next(error);
  }
}

/** PUT /api/admin/branches/:id */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const branch = await branchService.update(req.params.id, req.body ?? {});
    res.status(200).json(branch);
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/admin/branches/:id — desactiva, no borra. */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const branch = await branchService.remove(req.params.id);
    res.status(200).json(branch);
  } catch (error) {
    next(error);
  }
}
