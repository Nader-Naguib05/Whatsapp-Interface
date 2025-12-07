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

        // 🔥 OFFICIAL WHATSAPP MESSAGE ID
        msgId: {
            type: String,
            index: true, // fast lookup for delivery/read updates
        },

        // MEDIA SUPPORT
        mediaUrl: String, // our proxy URL, e.g. /media/:id
        mediaType: String, // "image" | "video" | "audio" | "document"
        mimeType: String, // "image/jpeg", "application/pdf", etc.

        // META STATUS: "sent", "delivered", "read", "failed", "received"
        status: {
            type: String,
            default: "sent",
        },

        senderName: {
            type: String,
            default: null,
        },

        // RAW META MESSAGE FROM WHATSAPP
        meta: Object,

        raw: Object,
    },
    { timestamps: true }
);

export const Message = mongoose.model("Message", MessageSchema);
