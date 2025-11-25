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
    console.log("events:", events);
    if (!events.length) return res.sendStatus(200);

    for (const ev of events) {
        
      if (ev.event === "message") {
        if (!ev.text) continue; // ignore empty payloads

        const conv = await findOrCreateConversationByPhone(ev.from);

        const messageDoc = new Message({
          conversationId: conv._id,
          from: ev.from,
          to: ev.to,
          senderType: "customer",
          body: ev.text,
          status: "received",
          createdAt: new Date(Number(ev.timestamp) * 1000),
          raw: ev.raw
        });

        await messageDoc.save();

        conv.lastMessage = ev.text;
        conv.unreadCount = (conv.unreadCount || 0) + 1;
        conv.updatedAt = new Date();
        await conv.save();

        getIO().to(String(conv._id)).emit("newMessage", {
          conversation: conv,
          message: messageDoc
        });

        continue;
      }

      // -------------------------------
      // 🟣 CASE 2: Read/Delivery status
      // -------------------------------
      if (ev.event === "status") {
        // You choose how you want to use this:
        
        // Example: update message status in DB
        await Message.updateOne(
          { msgId: ev.messageId },
          { status: ev.status }
        );

        // And optionally emit to frontend:
        getIO().emit("messageStatusUpdate", {
          messageId: ev.messageId,
          status: ev.status
        });

        continue;
      }
    }

    return res.sendStatus(200);
    
  } catch (err) {
    console.error("Webhook receive error:", err);
    return res.sendStatus(500);
  }
}
