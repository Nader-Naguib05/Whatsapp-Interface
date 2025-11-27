// sockets/chatSocket.mjs
import { Server } from "socket.io";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { sendText } from "../services/whatsapp.service.js";

let io = null;

export function setupSockets(server) {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Join / leave rooms
    socket.on("joinConversation", (conversationId) => {
      socket.join(String(conversationId));
    });

    socket.on("leaveConversation", (conversationId) => {
      socket.leave(String(conversationId));
    });

    // AGENT sends message
    socket.on("message:send", async ({ clientId, conversationId, text }) => {
      try {
        const conv = await Conversation.findById(conversationId);
        if (!conv) return;

        // Send to WhatsApp
        const metaRes = await sendText(conv.phone, text);
        const waId = metaRes?.data?.messages?.[0]?.id || null;

        // Save DB
        const msg = await Message.create({
          conversationId,
          from: "business",
          to: conv.phone,
          senderType: "agent",
          body: text,
          status: "sent",
          msgId: waId,
          meta: metaRes?.data || {},
        });

        // Update conversation meta
        conv.lastMessage = text;
        conv.lastMessageAt = msg.createdAt;
        await conv.save();

        const ackPayload = {
          clientId,
          _id: msg._id,
          conversationId: String(conversationId),
          body: msg.body,
          senderType: "agent",
          createdAt: msg.createdAt,
          status: msg.status,
          msgId: msg.msgId,
        };

        // 1) Emit to the agent currently viewing the chat (room)
        io.to(String(conversationId)).emit("messageAck", ackPayload);

        // 2) Emit globally so sidebar updates for all agents
        io.emit("conversation:update", {
          id: conv._id,
          phone: conv.phone,
          name: conv.name || conv.phone,
          lastMessage: text,
          lastMessageAt: msg.createdAt,
          unreadCount: conv.unreadCount || 0,
        });

        io.emit("newMessage", {
          conversation: {
            _id: conv._id,
            phone: conv.phone,
            name: conv.name || conv.phone,
          },
          message: {
            _id: msg._id,
            conversationId: String(conversationId),
            body: msg.body,
            mediaUrl: null,
            senderType: "agent",
            createdAt: msg.createdAt,
            status: msg.status,
            msgId: msg.msgId,
          },
        });

      } catch (err) {
        console.error("message:send socket error:", err);
      }
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}
