import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    // Customer phone number (indexed because it's used to match incoming messages)
    phone: {
      type: String,
      required: true,
      index: true,
    },

    // Optional display name (if you fetch WA profile in future)
    name: {
      type: String,
      default: "",
    },

    // Last message content
    lastMessage: {
      type: String,
      default: "",
    },

    // When last message was sent or received
    lastMessageAt: {
      type: Date,
      default: null,
    },

    // Unread counter for agent dashboard
    unreadCount: {
      type: Number,
      default: 0,
    },

    // Extra metadata (useful for future features)
    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

export const Conversation = mongoose.model("Conversation", ConversationSchema);
