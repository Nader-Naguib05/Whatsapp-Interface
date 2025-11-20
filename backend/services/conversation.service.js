import Conversation from "../models/conversation.model.js";

async function findOrCreateConversationByPhone(phone) {
  const normalized = normalizePhone(phone);
  let conv = await Conversation.findOne({ phone: normalized });
  if (!conv) {
    conv = new Conversation({ phone: normalized, lastMessage: '', unreadCount: 0 });
    await conv.save();
  }
  return conv;
}