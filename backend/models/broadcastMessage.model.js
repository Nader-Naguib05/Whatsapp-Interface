// models/broadcastMessage.model.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const broadcastMessageSchema = new Schema(
  {
    batch: {
      type: Schema.Types.ObjectId,
      ref: "BroadcastBatch",
      index: true,
    },

    phone: { type: String, required: true },

    templateName: { type: String, required: true },
    language: { type: String, default: "en_US" },
    components: { type: Array, default: [] },

    status: {
      type: String,
      enum: ["queued", "processing", "success", "failed"],
      default: "queued",
      index: true,
    },

    attempts: { type: Number, default: 0 },

    metaMessageId: { type: String }, // WhatsApp message id
    lastError: { type: Schema.Types.Mixed, default: null },

    sentAt: { type: Date },
  },
  { timestamps: true }
);

export const BroadcastMessage = mongoose.model(
  "BroadcastMessage",
  broadcastMessageSchema
);
