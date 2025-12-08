import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: "",
    },
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    tag: {
      type: String,
      enum: ["بدون", "مشاكل", "زبائن", "كباتن"],
      default: "بدون",
    },
    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

ConversationSchema.index({ updatedAt: -1 });
ConversationSchema.index({ lastMessageAt: -1 });

export const Conversation = mongoose.model(
  "Conversation",
  ConversationSchema
);
