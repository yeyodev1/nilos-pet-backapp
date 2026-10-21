import { Router } from "express";
import * as bookingController from "../controllers/booking.controller";

const router = Router();

router.post("/", bookingController.create);

export default router;
