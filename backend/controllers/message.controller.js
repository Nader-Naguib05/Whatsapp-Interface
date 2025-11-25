// controllers/messageController.mjs
import { Message } from '../models/message.model.js';
import { Conversation } from '../models/conversation.model.js';
import { sendText, sendImage, sendDocument, sendTemplate, markAsRead } from '../services/whatsapp.service.js';
import { getIO } from '../sockets/chatSocket.js';
import { findOrCreateConversationByPhone } from '../utils/helpers.js';

// send text (business -> customer)
export async function sendTextController(req, res) {
  try {
    const { conversationId, to, body } = req.body;
    let conv = null;
    let targetPhone = to;

    if (conversationId) {
      conv = await Conversation.findById(conversationId);
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });
      targetPhone = conv.phone;
    } else if (!targetPhone) {
      return res.status(400).json({ error: 'Provide conversationId or to phone' });
    }

    if (!conv) conv = await findOrCreateConversationByPhone(targetPhone);

    // Send via Meta API
    const metaRes = await sendText(targetPhone, body);

    // Save message
    const msg = new Message({
      conversationId: conv._id,
      from: 'business',
      to: targetPhone,
      senderType: 'agent',
      body,
      status: 'sent',
      meta: metaRes?.data || {}
    });

    await msg.save();

    // Update conversation
    conv.lastMessage = body;
    conv.updatedAt = new Date();
    await conv.save();

    // ❌ DO NOT EMIT TO THE SAME AGENT UI
    // Only emit to customers or other agents (if multi-agent system)
    // getIO().to(String(conv._id)).emit('newMessage', { conversation: conv, message: msg });

    return res.json({ ok: true, message: msg });

  } catch (err) {
    console.error('sendTextController error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}


export async function sendImageController(req, res) {
  try {
    const { conversationId, to, imageUrl, caption } = req.body;
    let conv = null;
    let targetPhone = to;

    if (conversationId) {
      conv = await Conversation.findById(conversationId);
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });
      targetPhone = conv.phone;
    } else if (!targetPhone) {
      return res.status(400).json({ error: 'Provide conversationId or to phone' });
    }

    if (!conv) conv = await findOrCreateConversationByPhone(targetPhone);

    const metaRes = await sendImage(targetPhone, imageUrl, caption);

    const msg = new Message({
      conversationId: conv._id,
      from: 'business',
      to: targetPhone,
      senderType: 'agent',
      body: caption || '',
      mediaUrl: imageUrl,
      status: 'sent',
      meta: metaRes?.data || {}
    });

    await msg.save();

    conv.lastMessage = caption || '[image]';
    conv.updatedAt = new Date();
    await conv.save();

    try { getIO().to(String(conv._id)).emit('newMessage', { conversation: conv, message: msg }); } catch (e) {}

    return res.json({ ok: true, message: msg });
  } catch (err) {
    console.error('sendImageController error:', err);
    return res.status(500).json({ error: 'Failed to send image' });
  }
}

export async function sendDocumentController(req, res) {
  try {
    const { conversationId, to, fileUrl, filename } = req.body;
    let conv = null;
    let targetPhone = to;

    if (conversationId) {
      conv = await Conversation.findById(conversationId);
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });
      targetPhone = conv.phone;
    } else if (!targetPhone) {
      return res.status(400).json({ error: 'Provide conversationId or to phone' });
    }

    if (!conv) conv = await findOrCreateConversationByPhone(targetPhone);

    const metaRes = await sendDocument(targetPhone, fileUrl, filename);

    const msg = new Message({
      conversationId: conv._id,
      from: 'business',
      to: targetPhone,
      senderType: 'agent',
      body: filename || '[document]',
      mediaUrl: fileUrl,
      status: 'sent',
      meta: metaRes?.data || {}
    });

    await msg.save();

    conv.lastMessage = filename || '[document]';
    conv.updatedAt = new Date();
    await conv.save();

    try { getIO().to(String(conv._id)).emit('newMessage', { conversation: conv, message: msg }); } catch (e) {}

    return res.json({ ok: true, message: msg });
  } catch (err) {
    console.error('sendDocumentController error:', err);
    return res.status(500).json({ error: 'Failed to send document' });
  }
}

export async function sendTemplateController(req, res) {
  try {
    const { conversationId, to, templateName, language, components } = req.body;
    let conv = null;
    let targetPhone = to;

    if (conversationId) {
      conv = await Conversation.findById(conversationId);
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });
      targetPhone = conv.phone;
    } else if (!targetPhone) {
      return res.status(400).json({ error: 'Provide conversationId or to phone' });
    }

    if (!conv) conv = await findOrCreateConversationByPhone(targetPhone);

    const metaRes = await sendTemplate(targetPhone, templateName, language || 'en_US', components || []);

    const msg = new Message({
      conversationId: conv._id,
      from: 'business',
      to: targetPhone,
      senderType: 'agent',
      body: `Template: ${templateName}`,
      status: 'sent',
      meta: metaRes?.data || {}
    });

    await msg.save();

    conv.lastMessage = `Template: ${templateName}`;
    conv.updatedAt = new Date();
    await conv.save();

    try { getIO().to(String(conv._id)).emit('newMessage', { conversation: conv, message: msg }); } catch (e) {}

    return res.json({ ok: true, message: msg });
  } catch (err) {
    console.error('sendTemplateController error:', err);
    return res.status(500).json({ error: 'Failed to send template' });
  }
}

export async function markAsReadController(req, res) {
  try {
    const { messageId } = req.body;
    if (!messageId) return res.status(400).json({ error: 'messageId required' });

    await markAsRead(messageId);

    return res.json({ ok: true });
  } catch (err) {
    console.error('markAsReadController error:', err);
    return res.status(500).json({ error: 'Failed to mark as read' });
  }
}
