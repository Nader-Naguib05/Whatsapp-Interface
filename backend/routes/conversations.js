// routes/conversationRoutes.mjs
import express from 'express';
import { listConversations, getConversation, resetUnreadController } from '../controllers/conversation.controller.js';

const router = express.Router();

router.get('/', listConversations);
router.get('/:id', getConversation);

router.post("/reset-unread", resetUnreadController);

export default router;
