import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  from: String,
  to: String,
  senderType: { type: String, enum: ['customer', 'agent', 'system'], default: 'customer' },
  body: String,
  type: { type: String, default: 'text' },
  meta: Object,
  status: { type: String, enum: ['received','sent','delivered','read'], default: 'received' },
  createdAt: { type: Date, default: Date.now }
});

export const Message = mongoose.model("Message", MessageSchema);
 

