// controllers/webhookController.mjs
import pkg from 'express';
const { Request, Response } = pkg;
import { Message } from '../models/message.model.js';
import { Conversation } from '../models/conversation.model.js';
import { getIO } from '../sockets/chatSocket.js';
import { parseIncoming } from '../services/whatsapp.service.js';
import { findOrCreateConversationByPhone } from '../utils/helpers.js';

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

export async function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Forbidden');
}

export async function receiveWebhook(req, res) {
  try {
    const parsedMessages = parseIncoming(req.body);
    if (!parsedMessages.length) return res.status(200).send('No messages');

    for (const m of parsedMessages) {
      // create conversation (or find)
      const conv = await findOrCreateConversationByPhone(m.from);

      // create message doc
      const messageDoc = new Message({
        conversationId: conv._id,
        from: m.from,
        to: m.to,
        senderType: 'customer',
        body: m.text || '',
        meta: m.raw,
        status: 'received',
        createdAt: new Date(Number(m.timestamp) * 1000)
      });

      await messageDoc.save();

      // update conversation
      conv.lastMessage = m.text || '[media]';
      conv.unreadCount = (conv.unreadCount || 0) + 1;
      conv.updatedAt = new Date();
      await conv.save();

      // emit to socket room
      try {
        getIO().to(String(conv._id)).emit('newMessage', { conversation: conv, message: messageDoc });
      } catch (e) {
        console.warn('Socket emit failed (maybe not initialized)', e.message || e);
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('Webhook receive error:', err);
    return res.status(500).send('Server Error');
  }
}
