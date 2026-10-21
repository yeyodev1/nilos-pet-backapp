import { Request, Response, NextFunction } from "express";
import { CustomError } from "../errors/customError.error";
import * as productService from "../services/product.service";

/** GET /api/products — query: search, category (slug), type, featured, page, limit */
export async function listPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await productService.listPublic({
      search: req.query.search ? String(req.query.search) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
      type: req.query.type ? String(req.query.type) : undefined,
      featured: req.query.featured === "true",
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || undefined,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/** GET /api/products/:slug — solo publicados. */
export async function getBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.getBySlug(String(req.params.slug));
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/products — query: search, category, type, published, priced, page, limit */
export async function listAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await productService.listAdmin({
      search: req.query.search ? String(req.query.search) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
      type: req.query.type ? String(req.query.type) : undefined,
      published: req.query.published ? String(req.query.published) : undefined,
      priced: req.query.priced ? String(req.query.priced) : undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || undefined,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/products/:id */
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.getById(String(req.params.id));
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
}

/** POST /api/admin/products */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.create(req.body ?? {});
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

/** PUT /api/admin/products/:id */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.update(String(req.params.id), req.body ?? {});
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/admin/products/:id */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await productService.remove(String(req.params.id));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

/** POST /api/admin/products/:id/images — multipart, campo "image". */
export async function addImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file?.buffer) throw new CustomError("Adjunta una imagen", 400);
    const product = await productService.addImage(String(req.params.id), req.file.buffer);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/admin/products/:id/images/:publicId — publicId URL-encoded. */
export async function removeImage(req: Request, res: Response, next: NextFunction) {
  try {
    // Express ya decodifica el %2F del publicId de Cloudinary (carpeta/archivo).
    const product = await productService.removeImage(
      String(req.params.id),
      String(req.params.publicId),
    );
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
}
