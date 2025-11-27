// controllers/webhookController.mjs
import pkg from "express";
const { Request, Response } = pkg;

import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { getIO } from "../sockets/chatSocket.js";
import { parseIncoming } from "../services/whatsapp.service.js";
import { findOrCreateConversationByPhone } from "../utils/helpers.js";

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

export async function verifyWebhook(req, res) {
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    return res.status(200).send(challenge);
  }
  return res.status(403).send("Forbidden");
}

export async function receiveWebhook(req, res) {
  try {
    const events = parseIncoming(req.body);
    if (!events.length) return res.sendStatus(200);

    const io = getIO();

    for (const ev of events) {
      // 🟢 Incoming message
      if (ev.event === "message") {
        if (!ev.text) continue;

        const conv = await findOrCreateConversationByPhone(ev.from);

        const messageDoc = await Message.create({
          conversationId: conv._id,
          from: ev.from,
          to: ev.to,
          senderType: "customer",
          body: ev.text,
          status: "received",
          createdAt: new Date(Number(ev.timestamp) * 1000),
          raw: ev.raw,
          msgId: ev.msgId,
        });

        // Update conversation meta
        conv.lastMessage = ev.text;
        conv.lastMessageAt = messageDoc.createdAt;
        conv.unreadCount = (conv.unreadCount || 0) + 1;
        await conv.save();

        const convoPayload = {
          _id: conv._id,
          phone: conv.phone,
          name: conv.name || conv.phone,
          lastMessage: ev.text,
          lastMessageAt: messageDoc.createdAt,
          unreadCount: conv.unreadCount,
        };

        const msgPayload = {
          _id: messageDoc._id,
          conversationId: String(conv._id),
          body: messageDoc.body,
          mediaUrl: messageDoc.mediaUrl || null,
          senderType: "customer",
          createdAt: messageDoc.createdAt,
          status: messageDoc.status,
          msgId: messageDoc.msgId,
        };

        // 1) NEW conversation event (global)
        io.emit("conversation:new", convoPayload);

        // 2) New message event (global)
        io.emit("newMessage", {
          conversation: convoPayload,
          message: msgPayload,
        });

        // 3) Also send to room if agent is inside it
        io.to(String(conv._id)).emit("newMessage", {
          conversation: convoPayload,
          message: msgPayload,
        });

        continue;
      }

      // 🟣 Status updates
      if (ev.event === "status") {
        const { messageId, status } = ev;
        if (!messageId || !status) continue;

        const msg = await Message.findOne({ msgId: messageId });
        if (!msg) continue;

        await Message.updateOne({ msgId: messageId }, { status });

        io.emit("messageStatus", {
          conversationId: String(msg.conversationId),
          messageId,
          status,
        });

        io.to(String(msg.conversationId)).emit("messageStatus", {
          conversationId: String(msg.conversationId),
          messageId,
          status,
        });
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("Webhook receive error:", err);
    return res.sendStatus(500);
  }
}
