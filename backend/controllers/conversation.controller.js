// controllers/conversationController.mjs
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';

export async function listConversations(req, res) {
  try {
    const limit = Math.min(
      parseInt(req.query.limit, 10) || 200,
      500
    );

    // Optional cursor-based pagination (by updatedAt)
    const before = req.query.before ? new Date(req.query.before) : null;
    const query = {};

    if (before && !isNaN(before.getTime())) {
      query.updatedAt = { $lt: before };
    }

    const convs = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("phone name lastMessage lastMessageAt unreadCount tag updatedAt")
      .lean(); 

    return res.json(convs);
  } catch (err) {
    console.error("listConversations error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function getConversation(req, res) {
  try {
    const { id } = req.params;

    const conv = await Conversation.findById(id).lean();
    if (!conv) return res.status(404).json({ error: "Not found" });

    const limitParam = req.query.limit;
    const beforeId = req.query.beforeMessageId;
    const afterId = req.query.afterMessageId;

    let messages = [];

    // ✅ LEGACY BEHAVIOR: no pagination params → return all (for now)
    if (!limitParam && !beforeId && !afterId) {
      messages = await Message.find({ conversationId: id })
        .sort({ createdAt: 1 })
        .lean();
      return res.json({ conversation: conv, messages });
    }

    // ✅ SCALABLE PATH (use this in new frontend calls)
    const limit = Math.min(parseInt(limitParam, 10) || 50, 200);
    const query = { conversationId: id };

    if (beforeId) {
      const beforeMsg = await Message.findById(beforeId)
        .select("createdAt")
        .lean();
      if (beforeMsg) {
        query.createdAt = { $lt: beforeMsg.createdAt };
      }
    } else if (afterId) {
      const afterMsg = await Message.findById(afterId)
        .select("createdAt")
        .lean();
      if (afterMsg) {
        query.createdAt = { $gt: afterMsg.createdAt };
      }
    }

    // We fetch newest→oldest for efficiency then reverse for UI
    messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    messages.reverse();

    return res.json({ conversation: conv, messages });
  } catch (err) {
    console.error("getConversation error:", err);
    return res.status(500).json({ error: "Server error" });
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