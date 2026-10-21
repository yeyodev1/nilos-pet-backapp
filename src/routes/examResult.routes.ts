import { Router } from "express";
import * as examResultController from "../controllers/examResult.controller";

const router = Router();

router.get("/", examResultController.findByDocumentId);

export default router;
