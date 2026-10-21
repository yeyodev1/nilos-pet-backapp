import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";
import { uploadMiddleware } from "../middlewares/upload.middleware";
import * as adminController from "../controllers/admin.controller";
import * as bookingController from "../controllers/booking.controller";
import * as branchController from "../controllers/branch.controller";
import * as categoryController from "../controllers/category.controller";
import * as examResultController from "../controllers/examResult.controller";
import * as orderController from "../controllers/order.controller";
import * as productController from "../controllers/product.controller";

const router = Router();

// Todo el panel exige sesión de administración.
router.use(authMiddleware, adminMiddleware);

router.get("/stats", adminController.stats);
router.get("/customers", adminController.listCustomers);

router.get("/categories", categoryController.list);
router.post("/categories", categoryController.create);
router.put("/categories/:id", categoryController.update);
router.delete("/categories/:id", categoryController.remove);

router.get("/branches", branchController.list);
router.post("/branches", branchController.create);
router.put("/branches/:id", branchController.update);
router.delete("/branches/:id", branchController.remove);

router.get("/products", productController.listAdmin);
router.post("/products", productController.create);
router.get("/products/:id", productController.getById);
router.put("/products/:id", productController.update);
router.delete("/products/:id", productController.remove);
router.post("/products/:id/images", uploadMiddleware.single("image"), productController.addImage);
router.delete("/products/:id/images/:publicId", productController.removeImage);

router.get("/orders", orderController.list);
router.get("/orders/:id", orderController.getById);

router.get("/bookings", bookingController.list);
router.patch("/bookings/:id", bookingController.updateStatus);

router.get("/exam-results", examResultController.list);
router.post("/exam-results", uploadMiddleware.single("file"), examResultController.create);
router.delete("/exam-results/:id", examResultController.remove);

export default router;
