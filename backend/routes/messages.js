// routes/messageRoutes.mjs
import express from "express";
import {
  sendTextController,
  sendImageController,
  sendDocumentController,
  sendTemplateController,
  markAsReadController,
  uploadMediaAndSendController,
} from "../controllers/message.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/markAsRead", markAsReadController);

router.use(requireAuth);
router.post("/sendText", sendTextController);
router.post("/sendImage", sendImageController);
router.post("/sendDocument", sendDocumentController);
router.post("/sendTemplate", sendTemplateController);

// Multipart endpoint for file -> upload -> send
router.post("/uploadMedia", uploadMediaAndSendController);

export default router;
