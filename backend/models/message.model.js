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

    /* --------------------------------------------------
       TEXT + CAPTION
    -------------------------------------------------- */
    body: { type: String, default: "" },     // "[Image]" or text
    caption: { type: String, default: null }, // actual caption for media

    /* --------------------------------------------------
       WHATSAPP OFFICIAL MESSAGE ID
    -------------------------------------------------- */
    msgId: {
      type: String,
      index: true,
    },

    /* --------------------------------------------------
       MEDIA SUPPORT
    -------------------------------------------------- */
    mediaUrl: String,    // our proxy URL: /media/:MEDIA_ID
    mediaType: String,   // "image" | "video" | "audio" | "document"
    mimeType: String,    // "image/jpeg", "application/pdf", etc.
    mediaId: String,     // WhatsApp media ID, essential for fetching
    fileName: String,    // "invoice.pdf", "photo.jpg"

    /* --------------------------------------------------
       STATUS: sent, delivered, read, failed, received
    -------------------------------------------------- */
    status: {
      type: String,
      default: "sent",
    },

    senderName: {
      type: String,
      default: null,
    },

    /* --------------------------------------------------
       RAW META FROM WHATSAPP
    -------------------------------------------------- */
    meta: Object,
    raw: Object,
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", MessageSchema);
