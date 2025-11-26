import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    // Business → customer or customer → business
    senderType: {
      type: String,
      enum: ["agent", "customer"],
      required: true,
    },

    from: String,
    to: String,

    // MAIN TEXT
    body: {
      type: String,
      default: "",
    },

    // 🔥 THE OFFICIAL WHATSAPP MESSAGE ID
    msgId: {
      type: String,
      index: true, // fast lookup for delivery/read updates
    },

    // MEDIA SUPPORT
    mediaUrl: String,

    // META STATUS: "sent", "delivered", "read", "failed", "received"
    status: {
      type: String,
      default: "sent",
    },

    // RAW META MESSAGE FROM WHATSAPP
    meta: Object,

    raw: Object,
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", MessageSchema);
