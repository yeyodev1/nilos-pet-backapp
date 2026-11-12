import { Request, Response, NextFunction } from "express";
import { CustomError } from "../errors/customError.error";
import { Review } from "../models/review.model";
import { User } from "../models/user.model";
import { AuthRequest } from "../types/AuthRequest";

/** GET /api/reviews y /api/admin/reviews — las 30 más recientes. */
export async function listPublic(_req: Request, res: Response, next: NextFunction) {
  try {
    const reviews = await Review.find().sort({ updatedAt: -1 }).limit(30).select("-user");
    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
}

/** POST /api/reviews — body: { rating, text }. Una por cuenta: reenviar la reemplaza. */
export async function upsertMine(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new CustomError("No autorizado", 401);
    const rating = Number(req.body?.rating);
    const text = String(req.body?.text ?? "").trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new CustomError("La calificación va de 1 a 5 estrellas", 400);
    }
    if (text.length < 10 || text.length > 600) {
      throw new CustomError("La reseña debe tener entre 10 y 600 caracteres", 400);
    }

    const user = await User.findById(req.user.userId);
    if (!user) throw new CustomError("Usuario no encontrado", 404);

    const review = await Review.findOneAndUpdate(
      { user: user._id },
      { $set: { rating, text, name: user.name || "Cliente Nilos Pet" } },
      { new: true, upsert: true, runValidators: true },
    );
    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/admin/reviews/:id — moderación. */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const review = await Review.findByIdAndDelete(String(req.params.id));
    if (!review) throw new CustomError("Reseña no encontrada", 404);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
