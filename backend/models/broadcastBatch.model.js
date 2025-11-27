import mongoose from "mongoose";

const { Schema } = mongoose;

const broadcastBatchSchema = new Schema(
  {
    name: { type: String }, // campaign name

    templateName: { type: String, required: true },
    language: { type: String, default: "en_US" },

    totalNumbers: { type: Number, required: true },
    queuedCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
    },

    originalFileName: { type: String },

    // optional: link to user/organization later
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

export const BroadcastBatch = mongoose.model(
  "BroadcastBatch",
  broadcastBatchSchema
);
