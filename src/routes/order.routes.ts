import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { optionalAuthMiddleware } from "../middlewares/optionalAuth.middleware";
import * as orderController from "../controllers/order.controller";

const router = Router();

// Auth opcional: con Bearer válido la orden queda asociada al usuario.
router.post("/", optionalAuthMiddleware, orderController.create);
router.post("/confirm", orderController.confirm);
router.get("/mine", authMiddleware, orderController.listMine);

export default router;
