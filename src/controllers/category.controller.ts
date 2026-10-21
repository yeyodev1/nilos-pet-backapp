import { Request, Response, NextFunction } from "express";
import * as categoryService from "../services/category.service";

/** GET /api/categories y GET /api/admin/categories */
export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await categoryService.list();
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
}

/** POST /api/admin/categories — body: { name, order? } */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.create(req.body ?? {});
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
}

/** PUT /api/admin/categories/:id — body: { name?, order? } */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.update(String(req.params.id), req.body ?? {});
    res.status(200).json(category);
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/admin/categories/:id */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await categoryService.remove(String(req.params.id));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
