// controllers/conversationController.mjs
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';

export async function listConversations(req, res) {
  try {
    const convs = await Conversation.find().sort({ updatedAt: -1 }).limit(200);
    return res.json(convs);
  } catch (err) {
    console.error('listConversations error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export async function getConversation(req, res) {
  try {
    const { id } = req.params;
    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ error: 'Not found' });

    const messages = await Message.find({ conversationId: id }).sort({ createdAt: 1 });
    return res.json({ conversation: conv, messages });
  } catch (err) {
    console.error('getConversation error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export async function resetUnreadController(req, res) {
  try {
    const { conversationId } = req.body;

    await Conversation.updateOne(
      { _id: conversationId },
      { unreadCount: 0 }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("resetUnreadController error:", err);
    return res.status(500).json({ error: "Failed to reset unread" });
  }
}

export const updateTag = async (req, res) => {
    try {
        const { tag } = req.body;

        if (!["بدون", "مشاكل", "زبائن", "كباتن"].includes(tag)) {
            return res.status(400).json({ message: "Invalid tag." });
        }

        const conv = await Conversation.findByIdAndUpdate(
            req.params.id,
            { tag },
            { new: true }
        );

        if (!conv) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        res.json(conv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};