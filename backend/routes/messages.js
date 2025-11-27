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

const router = express.Router();

router.post("/sendText", sendTextController);
router.post("/sendImage", sendImageController);
router.post("/sendDocument", sendDocumentController);
router.post("/sendTemplate", sendTemplateController);
router.post("/markAsRead", markAsReadController);

// Multipart endpoint for file -> upload -> send
router.post("/uploadMedia", uploadMediaAndSendController);

export default router;
