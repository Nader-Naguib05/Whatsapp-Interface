// routes/messageRoutes.mjs
import express from 'express';
import {
  sendTextController,
  sendImageController,
  sendDocumentController,
  sendTemplateController,
  markAsReadController
} from '../controllers/message.controller.js';

const router = express.Router();

router.post('/sendText', sendTextController);
router.post('/sendImage', sendImageController);
router.post('/sendDocument', sendDocumentController);
router.post('/sendTemplate', sendTemplateController);
router.post('/markAsRead', markAsReadController);

export default router;
