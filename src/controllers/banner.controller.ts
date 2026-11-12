import { Request, Response, NextFunction } from "express";
import { CustomError } from "../errors/customError.error";
import { Banner } from "../models/banner.model";
import { deleteImage, uploadBuffer } from "../services/cloudinary.service";

/** GET /api/banners y /api/admin/banners — del más nuevo al más viejo. */
export async function listActive(_req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json(await Banner.find().sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
}

export const list = listActive;

/** POST /api/admin/banners — multipart: image (jpg, png, gif, tiff), title?, link? */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file?.buffer) throw new CustomError("Adjunta la imagen del banner", 400);
    const link = String(req.body?.link ?? "").trim();
    // Solo rutas internas o http(s): un "javascript:" en el href sería un XSS.
    if (link && !/^(\/|https?:\/\/)/i.test(link)) {
      throw new CustomError("El enlace debe empezar con / o con http(s)://", 400);
    }
    const image = await uploadBuffer(req.file.buffer, "nilos-pet/banners", true);
    const banner = await Banner.create({ title: String(req.body?.title ?? ""), link, image });
    res.status(201).json(banner);
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/admin/banners/:id */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const banner = await Banner.findByIdAndDelete(String(req.params.id));
    if (!banner) throw new CustomError("Banner no encontrado", 404);
    await deleteImage(banner.image.publicId).catch(() => undefined);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
