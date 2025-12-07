// sockets/chatSocket.mjs
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { sendText } from "../services/whatsapp.service.js";

let io = null;

export function setupSockets(server) {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", async (socket) => {
    console.log("🔥 Socket connected:", socket.id);

    /* ------------------------------------
     *  AUTHENTICATION
     * ------------------------------------ */
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        console.log("❌ No token provided to socket");
        socket.disconnect();
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("name role");

      if (!user) {
        console.log("❌ Invalid user for socket");
        socket.disconnect();
        return;
      }

      socket.user = user;
      console.log(`🔥 Socket authenticated as: ${user.name}`);

    } catch (err) {
      console.log("❌ Socket auth error:", err.message);
      socket.disconnect();
      return;
    }

    /* ------------------------------------
     *  JOIN / LEAVE ROOMS
     * ------------------------------------ */
    socket.on("joinConversation", (conversationId) => {
      socket.join(String(conversationId));
    });

    socket.on("leaveConversation", (conversationId) => {
      socket.leave(String(conversationId));
    });

    /* ------------------------------------
     *  AGENT SENDS MESSAGE
     * ------------------------------------ */
    socket.on("message:send", async ({ clientId, conversationId, text }) => {
      try {
        if (!socket.user) {
          console.log("❌ Unauthorized socket send");
          return;
        }

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
          senderName: socket.user.name,   // 🔥 ADDED
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
          senderName: socket.user.name,   // 🔥 ADDED
          createdAt: msg.createdAt,
          status: msg.status,
          msgId: msg.msgId,
        };

        // Emit to agents viewing this conversation
        io.to(String(conversationId)).emit("messageAck", ackPayload);

        // Update sidebar for all agents
        io.emit("conversation:update", {
          id: conv._id,
          phone: conv.phone,
          name: conv.name || conv.phone,
          lastMessage: text,
          lastMessageAt: msg.createdAt,
          unreadCount: conv.unreadCount || 0,
        });

        // Global event for new message
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
            mediaUrl: msg.mediaUrl || null,
            senderType: "agent",
            senderName: socket.user.name,   // 🔥 ADDED
            createdAt: msg.createdAt,
            status: msg.status,
            msgId: msg.msgId,
          },
        });

      } catch (err) {
        console.error("❌ message:send socket error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`⚠️ Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}
