import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

const META_BASE_URL = `https://graph.facebook.com/v17.0/${META_PHONE_NUMBER_ID}/messages`;

const HEADERS = {
  Authorization: `Bearer ${META_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
};

// ---------- UTIL ----------
function handleMetaError(err) {
  const metaErr = err.response?.data || err.message;
  console.error("Meta API Error:", metaErr);
  throw metaErr;
}

function buildPayload(to, type, data) {
  return {
    messaging_product: "whatsapp",
    to,
    type,
    [type]: data
  };
}

// ---------- SEND TEXT ----------
export async function sendText(to, body) {
  try {
    const payload = buildPayload(to, "text", { body });
    return await axios.post(META_BASE_URL, payload, { headers: HEADERS });
  } catch (err) {
    handleMetaError(err);
  }
}

// ---------- SEND IMAGE ----------
export async function sendImage(to, imageUrl, caption = "") {
  try {
    const payload = buildPayload(to, "image", {
      link: imageUrl,
      caption
    });

    return await axios.post(META_BASE_URL, payload, { headers: HEADERS });
  } catch (err) {
    handleMetaError(err);
  }
}

// ---------- SEND DOCUMENT ----------
export async function sendDocument(to, fileUrl, filename = "file.pdf") {
  try {
    const payload = buildPayload(to, "document", {
      link: fileUrl,
      filename
    });

    return await axios.post(META_BASE_URL, payload, { headers: HEADERS });
  } catch (err) {
    handleMetaError(err);
  }
}

// ---------- SEND TEMPLATE ----------
export async function sendTemplate(to, templateName, language = "en_US", components = []) {
  try {
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        components
      }
    };

    return await axios.post(META_BASE_URL, payload, { headers: HEADERS });
  } catch (err) {
    handleMetaError(err);
  }
}

// ---------- MARK AS READ ----------
export async function markAsRead(messageId) {
  try {
    const payload = {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId
    };

    return await axios.post(META_BASE_URL, payload, { headers: HEADERS });
  } catch (err) {
    handleMetaError(err);
  }
}

// ---------- PARSE INCOMING ----------
export function parseIncoming(body) {
  const entry = body.entry?.[0];
  if (!entry?.changes) return [];

  const out = [];

  for (const change of entry.changes) {
    const value = change.value;

    // --- incoming messages ---
    if (value.messages) {
      for (const m of value.messages) {
        out.push({
          event: "message",
          msgId: m.id,
          from: m.from,
          to: value.metadata?.phone_number_id,
          timestamp: m.timestamp,
          type: m.type,
          text: m.text?.body ?? null,
          raw: m
        });
      }
    }

    // --- delivery/read statuses ---
    if (value.statuses) {
      for (const s of value.statuses) {
        out.push({
          event: "status",
          status: s.status,
          messageId: s.id,
          timestamp: s.timestamp,
          raw: s
        });
      }
    }
  }

  return out;
}
