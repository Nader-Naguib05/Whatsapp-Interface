// utils/broadcastRateLimiter.js
import axios from "axios";
import { BroadcastMessage } from "../models/broadcastMessage.model.js";
import { BroadcastBatch } from "../models/broadcastBatch.model.js";

const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const META_TOKEN = process.env.META_ACCESS_TOKEN;

// Simple in-memory queue for "what to send next"
let jobQueue = [];
let isRunning = false;

// Tune this later based on your account tier
const RATE_LIMIT_PER_SECOND = 20;

function sendWhatsAppTemplate({ phone, templateName, language, components }) {
  const url = `https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/messages`;

  return axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        components: components || [],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${META_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

async function handleJobSend(jobData) {
  const { messageId } = jobData;
  if (!messageId) return;

  const msg = await BroadcastMessage.findById(messageId);
  if (!msg) return;

  // Mark processing
  msg.status = "processing";
  msg.attempts = (msg.attempts || 0) + 1;
  await msg.save();

  try {
    const response = await sendWhatsAppTemplate(jobData);

    msg.status = "success";
    msg.lastError = null;
    msg.metaMessageId =
      response?.data?.messages && response.data.messages[0]?.id
        ? response.data.messages[0].id
        : null;
    msg.sentAt = new Date();
    await msg.save();

    if (msg.batch) {
      const batch = await BroadcastBatch.findByIdAndUpdate(
        msg.batch,
        {
          $inc: { successCount: 1 },
          $set: { status: "processing" },
        },
        { new: true }
      );

      if (batch) {
        const processed =
          (batch.successCount || 0) + (batch.failedCount || 0);

        if (processed >= batch.totalNumbers) {
          batch.status = "completed";
          batch.finishedAt = new Date();
          await batch.save();
        }
      }
    }
  } catch (err) {
    const errorPayload = err?.response?.data || err.message;

    msg.status = "failed";
    msg.lastError = errorPayload;
    await msg.save();

    if (msg.batch) {
      const batch = await BroadcastBatch.findByIdAndUpdate(
        msg.batch,
        {
          $inc: { failedCount: 1 },
          $set: { status: "processing" },
        },
        { new: true }
      );

      if (batch) {
        const processed =
          (batch.successCount || 0) + (batch.failedCount || 0);

        // Optional: if everything failed, mark as failed
        if (processed >= batch.totalNumbers) {
          batch.status = "failed";
          batch.finishedAt = new Date();
          await batch.save();
        }
      }
    }

    // Phase 2: retry logic goes here (requeue if attempts < MAX_ATTEMPTS)
  }
}

function startProcessor() {
  if (isRunning) return;

  isRunning = true;

  setInterval(async () => {
    if (!jobQueue.length) return;

    const jobsToSend = jobQueue.splice(0, RATE_LIMIT_PER_SECOND);

    for (const job of jobsToSend) {
      try {
        await handleJobSend(job.data);
      } catch (err) {
        console.error("Broadcast worker job error:", err.message);
      }
    }
  }, 1000);
}

export function addJob(data) {
  // "data" should contain: phone, templateName, language, components, batchId?
  return new Promise(async (resolve, reject) => {
    try {
      const msg = await BroadcastMessage.create({
        batch: data.batchId || null,
        phone: data.phone,
        templateName: data.templateName,
        language: data.language || "en_US",
        components: data.components || [],
        status: "queued",
        attempts: 0,
      });

      if (data.batchId) {
        await BroadcastBatch.findByIdAndUpdate(data.batchId, {
          $inc: { queuedCount: 1 },
        });
      }

      jobQueue.push({
        data: {
          ...data,
          messageId: msg._id,
        },
      });

      startProcessor();

      // Resolve as soon as it's QUEUED (not when it's SENT)
      resolve({
        queued: true,
        messageId: msg._id,
      });
    } catch (err) {
      reject(err);
    }
  });
}
