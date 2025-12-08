// controllers/message.controller.js
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import {
  sendText,
  sendImage,
  sendDocument,
  sendTemplate,
  markAsRead,
} from "../services/whatsapp.service.js";
import { getIO } from "../sockets/chatSocket.js";
import { findOrCreateConversationByPhone } from "../utils/helpers.js";
import axios from "axios";
import multer from "multer";
import FormData from "form-data";

// ------------------------------
// Multer setup (in-memory, but with size limit)
// ------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max – protects RAM under load
  },
});

// ---------- helpers ----------

function emitAck(convId, msg, clientId) {
  const io = getIO();
  io.to(String(convId)).emit("messageAck", {
    clientId,
    _id: msg._id,
    conversationId: String(convId),
    body: msg.body,
    mediaUrl: msg.mediaUrl,
    mediaType: msg.mediaType || null,
    mimeType: msg.mimeType || null,
    senderType: "agent",
    senderName: msg.senderName,
    createdAt: msg.createdAt,
    status: msg.status,
    msgId: msg.msgId,
  });
}

// optionally used if you want to push new agent messages to all agents
function emitNewMessage(conv, msg) {
  const io = getIO();
  io.to(String(conv._id)).emit("newMessage", {
    conversation: {
      _id: conv._id,
      phone: conv.phone,
      name: conv.name || conv.phone,
    },
    message: {
      _id: msg._id,
      conversationId: String(conv._id),
      body: msg.body,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType || null,
      mimeType: msg.mimeType || null,
      senderType: msg.senderType,
      senderName: msg.senderName,
      createdAt: msg.createdAt,
      status: msg.status,
      msgId: msg.msgId,
    },
  });
}

// Small helper: update conversation last message without hydrating full doc
async function updateConversationLastMessage(convId, text) {
  await Conversation.updateOne(
    { _id: convId },
    {
      lastMessage: text,
      updatedAt: new Date(),
    }
  );
}

// ---------- send text (business -> customer) ----------
export async function sendTextController(req, res) {
  try {
    const { conversationId, to, body, clientId } = req.body;

    if (!body || typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ error: "Message body is required" });
    }

    let conv = null;
    let targetPhone = to;

    if (conversationId) {
      // only select what we actually need
      conv = await Conversation.findById(conversationId)
        .select("_id phone")
        .lean();

      if (!conv) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      targetPhone = conv.phone;
    } else if (!targetPhone) {
      return res
        .status(400)
        .json({ error: "Provide conversationId or to phone" });
    }

    if (!conv) {
      conv = await findOrCreateConversationByPhone(targetPhone);
    }

    const metaRes = await sendText(targetPhone, body);
    const waId = metaRes?.data?.messages?.[0]?.id || null;

    const msg = await Message.create({
      conversationId: conv._id,
      from: "business",
      to: targetPhone,
      senderType: "agent",
      senderName: req.user?.name || null,
      body,
      status: "sent",
      msgId: waId,
      meta: metaRes?.data || {},
    });

    await updateConversationLastMessage(conv._id, body);

    emitAck(conv._id, msg, clientId);
    return res.json({ ok: true, message: msg });
  } catch (err) {
    console.error("sendTextController error:", err.response?.data || err);
    return res.status(500).json({ error: "Failed to send message" });
  }
}

// ---------- send image (URL-based) ----------
export async function sendImageController(req, res) {
  try {
    const { conversationId, to, imageUrl, caption, clientId } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }

    let conv = null;
    let targetPhone = to;

    if (conversationId) {
      conv = await Conversation.findById(conversationId)
        .select("_id phone")
        .lean();

      if (!conv) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      targetPhone = conv.phone;
    } else if (!targetPhone) {
      return res
        .status(400)
        .json({ error: "Provide conversationId or to phone" });
    }

    if (!conv) {
      conv = await findOrCreateConversationByPhone(targetPhone);
    }

    const metaRes = await sendImage(targetPhone, imageUrl, caption);
    const waId = metaRes?.data?.messages?.[0]?.id || null;

    const msg = await Message.create({
      conversationId: conv._id,
      from: "business",
      to: targetPhone,
      senderType: "agent",
      senderName: req.user?.name || null,
      body: caption || "",
      mediaUrl: imageUrl,
      mediaType: "image",
      status: "sent",
      msgId: waId,
      meta: metaRes?.data || {},
    });

    const lastText = caption || "[image]";
    await updateConversationLastMessage(conv._id, lastText);

    emitAck(conv._id, msg, clientId);

    return res.json({ ok: true, message: msg });
  } catch (err) {
    console.error("sendImageController error:", err.response?.data || err);
    return res.status(500).json({ error: "Failed to send image" });
  }
}

// ---------- send document (URL-based) ----------
export async function sendDocumentController(req, res) {
  try {
    const { conversationId, to, fileUrl, filename, clientId } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: "fileUrl is required" });
    }

    let conv = null;
    let targetPhone = to;

    if (conversationId) {
      conv = await Conversation.findById(conversationId)
        .select("_id phone")
        .lean();

      if (!conv) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      targetPhone = conv.phone;
    } else if (!targetPhone) {
      return res
        .status(400)
        .json({ error: "Provide conversationId or to phone" });
    }

    if (!conv) {
      conv = await findOrCreateConversationByPhone(targetPhone);
    }

    const metaRes = await sendDocument(targetPhone, fileUrl, filename);
    const waId = metaRes?.data?.messages?.[0]?.id || null;

    const body = filename || "[document]";

    const msg = await Message.create({
      conversationId: conv._id,
      from: "business",
      to: targetPhone,
      senderType: "agent",
      senderName: req.user?.name || null,
      body,
      mediaUrl: fileUrl,
      mediaType: "document",
      status: "sent",
      msgId: waId,
      meta: metaRes?.data || {},
    });

    await updateConversationLastMessage(conv._id, body);

    emitAck(conv._id, msg, clientId);

    return res.json({ ok: true, message: msg });
  } catch (err) {
    console.error("sendDocumentController error:", err.response?.data || err);
    return res.status(500).json({ error: "Failed to send document" });
  }
}

// ---------- send template ----------
export async function sendTemplateController(req, res) {
  try {
    const {
      conversationId,
      to,
      templateName,
      language,
      components,
      clientId,
    } = req.body;

    if (!templateName) {
      return res.status(400).json({ error: "templateName is required" });
    }

    let conv = null;
    let targetPhone = to;

    if (conversationId) {
      conv = await Conversation.findById(conversationId)
        .select("_id phone")
        .lean();

      if (!conv) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      targetPhone = conv.phone;
    } else if (!targetPhone) {
      return res
        .status(400)
        .json({ error: "Provide conversationId or to phone" });
    }

    if (!conv) {
      conv = await findOrCreateConversationByPhone(targetPhone);
    }

    const metaRes = await sendTemplate(
      targetPhone,
      templateName,
      language || "en_US",
      components || []
    );
    const waId = metaRes?.data?.messages?.[0]?.id || null;

    const body = `Template: ${templateName}`;

    const msg = await Message.create({
      conversationId: conv._id,
      from: "business",
      to: targetPhone,
      senderType: "agent",
      senderName: req.user?.name || null,
      body,
      status: "sent",
      msgId: waId,
      meta: metaRes?.data || {},
    });

    await updateConversationLastMessage(conv._id, body);

    emitAck(conv._id, msg, clientId);

    return res.json({ ok: true, message: msg });
  } catch (err) {
    console.error("sendTemplateController error:", err.response?.data || err);
    return res.status(500).json({ error: "Failed to send template" });
  }
}

// ---------- mark as read ----------
export async function markAsReadController(req, res) {
  try {
    const { messageId } = req.body;
    if (!messageId) {
      return res.status(400).json({ error: "messageId required" });
    }

    await markAsRead(messageId);

    return res.json({ ok: true });
  } catch (err) {
    console.error("markAsReadController error:", err.response?.data || err);
    return res.status(500).json({ error: "Failed to mark as read" });
  }
}

// ---------- upload media (file -> buffer -> meta -> send) ----------
export const uploadMediaAndSendController = [
  upload.single("file"),

  async (req, res) => {
    try {
      const { conversationId, mime, clientId, caption } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      if (!conversationId) {
        return res.status(400).json({ error: "conversationId required" });
      }

      // Fetch conversation
      const conv = await Conversation.findById(conversationId)
        .select("_id phone")
        .lean();

      if (!conv) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const targetPhone = conv.phone;
      const mimeType = mime || file.mimetype || "application/octet-stream";

      // ------------------------------
      // 1. Upload file buffer to Meta
      // ------------------------------
      const formData = new FormData();

      // REQUIRED OR META THROWS (#100) messaging_product error
      formData.append("messaging_product", "whatsapp");

      formData.append("file", file.buffer, {
        filename: file.originalname,
        contentType: mimeType,
      });

      formData.append("type", mimeType);

      const uploadRes = await axios.post(
        `https://graph.facebook.com/v20.0/${process.env.META_PHONE_NUMBER_ID}/media`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
            ...formData.getHeaders(),
          },
        }
      );

      const mediaId = uploadRes.data.id;

      // ------------------------------
      // 2. Determine message type
      // ------------------------------
      let messageType = "document";
      const msgPayload = {};

      if (mimeType.startsWith("image/")) {
        messageType = "image";
        msgPayload.image = { id: mediaId, caption: caption || undefined };
      } else if (mimeType.startsWith("video/")) {
        messageType = "video";
        msgPayload.video = { id: mediaId, caption: caption || undefined };
      } else if (mimeType.startsWith("audio/")) {
        messageType = "audio";
        msgPayload.audio = { id: mediaId };
      } else {
        messageType = "document";
        msgPayload.document = {
          id: mediaId,
          filename: file.originalname.replace(/\s+/g, "_"),
          caption: caption || undefined,
        };
      }

      // ------------------------------
      // 3. Send the WhatsApp Message
      // ------------------------------
      const sendMsgRes = await axios.post(
        `https://graph.facebook.com/v20.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: targetPhone,
          type: messageType,
          ...msgPayload,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      const waId = sendMsgRes?.data?.messages?.[0]?.id || null;

      // ------------------------------
      // 4. Save Message to DB
      // ------------------------------
      const displayBody =
        caption ||
        file.originalname ||
        (messageType === "image"
          ? "[image]"
          : messageType === "video"
          ? "[video]"
          : messageType === "audio"
          ? "[audio]"
          : "[document]");

      const saved = await Message.create({
        conversationId: conv._id,
        from: "business",
        to: targetPhone,
        senderType: "agent",
        senderName: req.user?.name || null,
        body: displayBody,
        mediaType: messageType,
        mimeType,
        mediaUrl: `${process.env.BASE_URL}/media/${mediaId}`,
        status: "sent",
        msgId: waId,
        meta: sendMsgRes.data,
      });

      await updateConversationLastMessage(conv._id, displayBody);

      // ------------------------------
      // 5. Emit real-time ACK to UI
      // ------------------------------
      emitAck(conv._id, saved, clientId);

      return res.json({ ok: true, message: saved });
    } catch (err) {
      console.error(
        "uploadMediaAndSend error:",
        err.response?.data || err
      );
      return res.status(500).json({ error: "Failed to send media" });
    }
  },
];
