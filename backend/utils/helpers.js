import { Conversation } from '../models/conversation.model.js';

export function normalizePhone(phone) {
  return phone.replace(/[^+0-9]/g, '');
}

export async function findOrCreateConversationByPhone(phone) {
  const normalized = normalizePhone(phone);
  let conv = await Conversation.findOne({ phone: normalized });
  if (!conv) {
    conv = new Conversation({ phone: normalized, lastMessage: '', unreadCount: 0 });
    await conv.save();
  }
  return conv;
}
