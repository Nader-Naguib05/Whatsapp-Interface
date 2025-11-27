// routes/messageRoutes.mjs
import express from 'express';
import {
  sendTextController,
  sendImageController,
  sendDocumentController,
  sendTemplateController,
  markAsReadController,
  uploadMediaAndSendController,
} from '../controllers/message.controller.js';

const router = express.Router();

router.post('/sendText', sendTextController);
router.post('/sendTemplate', sendTemplateController);
router.post('/markAsRead', markAsReadController);

router.post("/uploadMedia", uploadMediaAndSendController);

export default router;
