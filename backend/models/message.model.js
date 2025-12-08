// models/message.model.js
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,              // 🔥 basic index
    },
    senderType: {
      type: String,
      enum: ["agent", "customer"],
      required: true,
    },
    from: String,
    to: String,
    body: { type: String, default: "" },
    caption: { type: String, default: null },
    msgId: {
      type: String,
      index: true,
    },
    mediaUrl: String,
    mediaType: String,
    mimeType: String,
    mediaId: String,
    fileName: String,
    status: {
      type: String,
      default: "sent",
    },
    senderName: {
      type: String,
      default: null,
    },
    meta: Object,
    raw: Object,
  },
  { timestamps: true }
);

// 🔥 Core index for chat history & pagination
MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model("Message", MessageSchema);
