// routes/conversationRoutes.mjs
import express from 'express';
import { listConversations, getConversation, resetUnreadController, updateTag } from '../controllers/conversation.controller.js';

const router = express.Router();

router.get('/', listConversations);
router.get('/:id', getConversation);

router.patch("/:id/tag", updateTag);

router.post("/reset-unread", resetUnreadController);

export default router;
