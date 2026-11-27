import { Router, Request, Response, NextFunction } from "express";
import * as customerController from "../controllers/customer.controller";

const router = Router();

// shortcut: límite en memoria por instancia (Vercel puede tener varias); pasar a Redis si hay abuso.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_TRIES = 10;
const tries = new Map<string, { count: number; until: number }>();

function throttle(req: Request, res: Response, next: NextFunction) {
  // Detrás del proxy de Vercel req.ip es el proxy: la IP real viene en x-forwarded-for.
  const key = String(req.headers["x-forwarded-for"] ?? req.ip ?? "?").split(",")[0].trim();
  const now = Date.now();
  const entry = tries.get(key);
  if (!entry || entry.until < now) {
    tries.set(key, { count: 1, until: now + WINDOW_MS });
    return next();
  }
  if (++entry.count > MAX_TRIES) {
    return res.status(429).json({ message: "Demasiados intentos. Prueba en unos minutos." });
  }
  next();
}

router.post("/lookup", throttle, customerController.lookup);

export default router;
