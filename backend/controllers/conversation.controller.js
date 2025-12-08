// controllers/conversationController.mjs
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
// ----------------------------------------------------------
// GET /conversations
// Supports BOTH:
//   - Full unpaginated fetch (OLD)
//   - Cursor-based pagination (NEW)
// ----------------------------------------------------------
export async function listConversations(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 0, 200);
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

    // --------------------------------------------------------
    // MODE 1: NEW PAGINATED API
    // --------------------------------------------------------
    if (limit > 0 || cursor) {
      const pageSize = limit || 50;

      const query = {};

      // cursor = conversations updated BEFORE this timestamp
      if (cursor instanceof Date && !isNaN(cursor)) {
        query.updatedAt = { $lt: cursor };
      }

      const convs = await Conversation.find(query)
        .sort({ updatedAt: -1 }) // newest first
        .limit(pageSize)
        .select("_id phone name lastMessage lastMessageAt unreadCount tag updatedAt")
        .lean();

      // determine next cursor
      const nextCursor =
        convs.length > 0 ? convs[convs.length - 1].updatedAt : null;

      // check if more conversations exist
      const hasMore =
        convs.length === pageSize &&
        (await Conversation.exists({
          updatedAt: { $lt: convs[convs.length - 1].updatedAt },
        }));

      return res.json({
        conversations: convs,
        nextCursor,
        hasMore: Boolean(hasMore),
      });
    }

    // --------------------------------------------------------
    // MODE 2: LEGACY API (return everything)
    // --------------------------------------------------------
    const all = await Conversation.find()
      .sort({ updatedAt: -1 })
      .select("_id phone name lastMessage lastMessageAt unreadCount tag updatedAt")
      .lean();

    return res.json(all);
  } catch (err) {
    console.error("listConversations error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ------------------------------------------
// GET /conversations/:id
// Supports BOTH:
//   - Full fetch (OLD API)
//   - Paginated fetch (NEW API)
// ------------------------------------------
export async function getConversation(req, res) {
  try {
    const { id } = req.params;

    const limit = Math.min(parseInt(req.query.limit, 10) || 0, 200);
    const cursor = req.query.cursor || null;

    // Always fetch basic conversation info
    const conv = await Conversation.findById(id).lean();
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    // ------------------------------------------------------------
    // MODE 1: PAGINATED REQUEST (cursor OR limit passed)
    // ------------------------------------------------------------
    if (cursor || limit) {
      const pageSize = limit || 40;

      const query = { conversationId: id };

      if (cursor) {
        // Load messages *before* the cursor
        const cursorMsg = await Message.findById(cursor)
          .select("_id createdAt")
          .lean();

        if (cursorMsg) {
          query.createdAt = { $lt: cursorMsg.createdAt };
        }
      }

      // Fetch newest → oldest for efficiency
      let msgs = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(pageSize)
        .lean();

      // Reverse to oldest → newest for UI
      msgs.reverse();

      // Determine next cursor
      const nextCursor =
        msgs.length > 0 ? msgs[0]._id.toString() : null;

      // Does conversation have more?
      const hasMore =
        msgs.length === pageSize &&
        (await Message.exists({
          conversationId: id,
          createdAt: { $lt: msgs[0].createdAt },
        }));

      return res.json({
        messages: msgs,
        nextCursor,
        hasMore: Boolean(hasMore),
      });
    }

    // ------------------------------------------------------------
    // MODE 2: LEGACY REQUEST — return ALL messages
    // ------------------------------------------------------------
    const allMessages = await Message.find({ conversationId: id })
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      conversation: conv,
      messages: allMessages,
    });
  } catch (err) {
    console.error("getConversation error:", err);
    return res.status(500).json({ error: "Internal server error" });
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