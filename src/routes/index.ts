import express, { Application } from "express";
import authRoutes from "./auth.routes";
import healthRoutes from "./health.routes";
import categoryRoutes from "./category.routes";
import productRoutes from "./product.routes";
import branchRoutes from "./branch.routes";
import orderRoutes from "./order.routes";
import bookingRoutes from "./booking.routes";
import examResultRoutes from "./examResult.routes";
import customerRoutes from "./customer.routes";
import adminRoutes from "./admin.routes";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as bannerController from "../controllers/banner.controller";
import * as reviewController from "../controllers/review.controller";

function routerApi(app: Application) {
  const router = express.Router();
  app.use("/api", router);

  router.use("/health", healthRoutes);
  router.use("/auth", authRoutes);
  router.use("/categories", categoryRoutes);
  router.use("/products", productRoutes);
  router.use("/branches", branchRoutes);
  router.use("/orders", orderRoutes);
  router.use("/bookings", bookingRoutes);
  router.use("/exam-results", examResultRoutes);
  router.use("/customers", customerRoutes);
  router.get("/banners", bannerController.listActive);
  router.get("/reviews", reviewController.listPublic);
  router.post("/reviews", authMiddleware, reviewController.upsertMine);
  router.use("/admin", adminRoutes);
}

export default routerApi;
