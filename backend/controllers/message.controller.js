// controllers/messageController.mjs
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

// ---------- helpers ----------

function emitAck(convId, msg, clientId) {
  const io = getIO();
  io.to(String(convId)).emit("messageAck", {
    clientId,
    _id: msg._id,
    conversationId: String(convId),
    body: msg.body,
    mediaUrl: msg.mediaUrl,
    senderType: "agent",
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
      senderType: msg.senderType,
      createdAt: msg.createdAt,
      status: msg.status,
      msgId: msg.msgId,
    },
  });
}

// ---------- send text (business -> customer) ----------

export async function sendTextController(req, res) {
  try {
    const { conversationId, to, body, clientId } = req.body;
    let conv = null;
    let targetPhone = to;

    if (conversationId) {
      conv = await Conversation.findById(conversationId);
      if (!conv)
        return res
          .status(404)
          .json({ error: "Conversation not found" });
      targetPhone = conv.phone;
    } else if (!targetPhone) {
      return res
        .status(400)
        .json({ error: "Provide conversationId or to phone" });
    }

    if (!conv)
      conv = await findOrCreateConversationByPhone(targetPhone);

    const metaRes = await sendText(targetPhone, body);
    const waId = metaRes?.data?.messages?.[0]?.id || null;

    const msg = await Message.create({
      conversationId: conv._id,
      from: "business",
      to: targetPhone,
      senderType: "agent",
      body,
      status: "sent",
      msgId: waId,
      meta: metaRes?.data || {},
    });

    conv.lastMessage = body;
    conv.updatedAt = new Date();
    await conv.save();

    emitAck(conv._id, msg, clientId);

    return res.json({ ok: true, message: msg });
  } catch (err) {
    console.error("sendTextController error:", err);
    return res
      .status(500)
      .json({ error: "Failed to send message" });
  }
}

// ---------- send image ----------

export async function sendImageController(req, res) {
  try {
    const { conversationId, to, imageUrl, caption, clientId } =
      req.body;
    let conv = null;
    let targetPhone = to;

    if (conversationId) {
      conv = await Conversation.findById(conversationId);
      if (!conv)
        return res
          .status(404)
          .json({ error: "Conversation not found" });
      targetPhone = conv.phone;
    } else if (!targetPhone) {
      return res
        .status(400)
        .json({ error: "Provide conversationId or to phone" });
    }

    if (!conv)
      conv = await findOrCreateConversationByPhone(targetPhone);

    const metaRes = await sendImage(
      targetPhone,
      imageUrl,
      caption
    );
    const waId = metaRes?.data?.messages?.[0]?.id || null;

    const msg = await Message.create({
      conversationId: conv._id,
      from: "business",
      to: targetPhone,
      senderType: "agent",
      body: caption || "",
      mediaUrl: imageUrl,
      status: "sent",
      msgId: waId,
      meta: metaRes?.data || {},
    });

    conv.lastMessage = caption || "[image]";
    conv.updatedAt = new Date();
    await conv.save();

    emitAck(conv._id, msg, clientId);

    return res.json({ ok: true, message: msg });
  } catch (err) {
    console.error("sendImageController error:", err);
    return res
      .status(500)
      .json({ error: "Failed to send image" });
  }
}

// ---------- send document ----------

export async function sendDocumentController(req, res) {
  try {
    const { conversationId, to, fileUrl, filename, clientId } =
      req.body;
    let conv = null;
    let targetPhone = to;

    if (conversationId) {
      conv = await Conversation.findById(conversationId);
      if (!conv)
        return res
          .status(404)
          .json({ error: "Conversation not found" });
      targetPhone = conv.phone;
    } else if (!targetPhone) {
      return res
        .status(400)
        .json({ error: "Provide conversationId or to phone" });
    }

    if (!conv)
      conv = await findOrCreateConversationByPhone(targetPhone);

    const metaRes = await sendDocument(
      targetPhone,
      fileUrl,
      filename
    );
    const waId = metaRes?.data?.messages?.[0]?.id || null;

    const msg = await Message.create({
      conversationId: conv._id,
      from: "business",
      to: targetPhone,
      senderType: "agent",
      body: filename || "[document]",
      mediaUrl: fileUrl,
      status: "sent",
      msgId: waId,
      meta: metaRes?.data || {},
    });

    conv.lastMessage = filename || "[document]";
    conv.updatedAt = new Date();
    await conv.save();

    emitAck(conv._id, msg, clientId);

    return res.json({ ok: true, message: msg });
  } catch (err) {
    console.error("sendDocumentController error:", err);
    return res
      .status(500)
      .json({ error: "Failed to send document" });
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

    let conv = null;
    let targetPhone = to;

    if (conversationId) {
      conv = await Conversation.findById(conversationId);
      if (!conv)
        return res
          .status(404)
          .json({ error: "Conversation not found" });
      targetPhone = conv.phone;
    } else if (!targetPhone) {
      return res
        .status(400)
        .json({ error: "Provide conversationId or to phone" });
    }

    if (!conv)
      conv = await findOrCreateConversationByPhone(targetPhone);

    const metaRes = await sendTemplate(
      targetPhone,
      templateName,
      language || "en_US",
      components || []
    );
    const waId = metaRes?.data?.messages?.[0]?.id || null;

    const msg = await Message.create({
      conversationId: conv._id,
      from: "business",
      to: targetPhone,
      senderType: "agent",
      body: `Template: ${templateName}`,
      status: "sent",
      msgId: waId,
      meta: metaRes?.data || {},
    });

    conv.lastMessage = `Template: ${templateName}`;
    conv.updatedAt = new Date();
    await conv.save();

    emitAck(conv._id, msg, clientId);

    return res.json({ ok: true, message: msg });
  } catch (err) {
    console.error("sendTemplateController error:", err);
    return res
      .status(500)
      .json({ error: "Failed to send template" });
  }
}

// ---------- mark as read ----------

export async function markAsReadController(req, res) {
  try {
    const { messageId } = req.body;
    if (!messageId)
      return res
        .status(400)
        .json({ error: "messageId required" });

    await markAsRead(messageId);

    // optional: also broadcast read
    // const msg = await Message.findOne({ msgId: messageId });
    // if (msg) {
    //   getIO()
    //     .to(String(msg.conversationId))
    //     .emit("messageStatus", {
    //       conversationId: String(msg.conversationId),
    //       messageId,
    //       status: "read",
    //     });
    // }

    return res.json({ ok: true });
  } catch (err) {
    console.error("markAsReadController error:", err);
    return res
      .status(500)
      .json({ error: "Failed to mark as read" });
  }
}

// ---------- upload media (file -> buffer -> meta -> send) ----------
import multer from "multer";
import FormData from "form-data";
const upload = multer({ storage: multer.memoryStorage() });

export const uploadMediaAndSendController = [
  upload.single("file"),

  async (req, res) => {
    try {
      const { conversationId, mime, clientId } = req.body;
      const file = req.file;

      if (!file)
        return res.status(400).json({ error: "No file provided" });

      if (!conversationId)
        return res.status(400).json({ error: "conversationId required" });

      // Fetch conversation
      const conv = await Conversation.findById(conversationId);
      if (!conv)
        return res.status(404).json({ error: "Conversation not found" });

      const targetPhone = conv.phone;
      const mimeType = mime || file.mimetype;

      // ------------------------------
      // 1. Upload file buffer to Meta
      // ------------------------------

      const formData = new FormData();

      // *** REQUIRED OR META THROWS (#100) messaging_product error ***
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
      let msgPayload = {};

      if (mimeType.startsWith("image/")) {
        messageType = "image";
        msgPayload.image = { id: mediaId };
      } else if (mimeType.startsWith("video/")) {
        messageType = "video";
        msgPayload.video = { id: mediaId };
      } else if (mimeType.startsWith("audio/")) {
        messageType = "audio";
        msgPayload.audio = { id: mediaId };
      } else {
        messageType = "document";
        msgPayload.document = {
          id: mediaId,
          filename: file.originalname.replace(/\s+/g, "_"),
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

      const saved = await Message.create({
        conversationId: conv._id,
        from: "business",
        to: targetPhone,
        senderType: "agent",
        body: file.originalname,
        mediaType: mimeType,
        mediaUrl: `https://graph.facebook.com/v20.0/${mediaId}`,
        status: "sent",
        msgId: waId,
        meta: sendMsgRes.data,
      });

      conv.lastMessage = file.originalname;
      conv.updatedAt = new Date();
      await conv.save();

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
