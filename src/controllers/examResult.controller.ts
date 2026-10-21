import { Request, Response, NextFunction } from "express";
import * as examResultService from "../services/examResult.service";

/** GET /api/exam-results?documentId=… — consulta pública por cédula. */
export async function findByDocumentId(req: Request, res: Response, next: NextFunction) {
  try {
    const results = await examResultService.findByDocumentId(String(req.query.documentId ?? ""));
    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/exam-results — query: documentId, page */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await examResultService.list({
      documentId: req.query.documentId ? String(req.query.documentId) : undefined,
      page: Number(req.query.page) || 1,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/exam-results — multipart, campo "file" (PDF o imagen) +
 * campos: documentId, title, date?, petName?, notes?
 */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await examResultService.create(req.body ?? {}, req.file?.buffer);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/admin/exam-results/:id — borra también el archivo en Cloudinary. */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await examResultService.remove(String(req.params.id));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
