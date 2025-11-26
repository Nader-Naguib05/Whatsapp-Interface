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

    // Join / leave a conversation room
    socket.on("joinConversation", (conversationId) => {
      socket.join(String(conversationId));
    });

    socket.on("leaveConversation", (conversationId) => {
      socket.leave(String(conversationId));
    });

    // Agent sends message via socket (business -> customer)
    socket.on(
      "message:send",
      async ({ clientId, conversationId, text }) => {
        try {
          const conv = await Conversation.findById(conversationId);
          if (!conv) return;

          // Send via WhatsApp API
          const metaRes = await sendText(conv.phone, text);
          const waId =
            metaRes?.data?.messages?.[0]?.id || null;

          // Save DB message
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

          // Emit ACK so frontend replaces optimistic bubble
          io.to(String(conversationId)).emit("messageAck", {
            clientId,
            _id: msg._id,
            conversationId: String(conversationId),
            body: msg.body,
            senderType: "agent",
            createdAt: msg.createdAt,
            status: msg.status,
            msgId: msg.msgId,
          });
        } catch (err) {
          console.error("message:send socket error:", err);
        }
      }
    );


    socket.on("disconnect", () => {
      // console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io)
    throw new Error(
      "Socket.IO not initialized. Call setupSockets(server) first."
    );
  return io;
}
