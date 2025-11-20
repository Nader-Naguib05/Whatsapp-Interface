// routes/conversationRoutes.mjs
import express from 'express';
import { listConversations, getConversation } from '../controllers/conversation.controller.js';

const router = express.Router();

router.get('/', listConversations);
router.get('/:id', getConversation);

export default router;
