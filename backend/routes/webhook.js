// routes/webhookRoutes.mjs
import express from 'express';
import { verifyWebhook, receiveWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

router.get('/', verifyWebhook);
router.post('/', receiveWebhook);

export default router;
