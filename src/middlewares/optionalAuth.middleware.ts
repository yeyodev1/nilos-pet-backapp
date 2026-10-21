import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthRequest, JwtPayload } from "../types/AuthRequest";

/**
 * Como authMiddleware pero sin exigir sesión: si llega un Bearer válido deja
 * req.user, y si no hay token (o está vencido) sigue como invitado.
 * Sirve para el checkout, que acepta compras con y sin cuenta.
 */
export function optionalAuthMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(authHeader.split(" ")[1], env.JWT_SECRET) as JwtPayload;
    } catch {
      // Token inválido o vencido: la compra sigue como invitado en vez de fallar.
    }
  }

  next();
}
