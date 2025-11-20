import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  phone: String,
  lastMessage: String,
  unreadCount: { type: Number, default: 0 },
}, { timestamps: true });

export const Conversation = mongoose.model('Conversation', conversationSchema);
