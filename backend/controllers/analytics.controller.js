// src/controllers/analytics.controller.js

import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { BroadcastBatch } from "../models/broadcastBatch.model.js";
import { BroadcastMessage } from "../models/broadcastMessage.model.js";

/**
 * Helper: create a map of the last N days with zeroed counts.
 * Returns array of { date: 'YYYY-MM-DD', label: 'Thu', total: 0, agent: 0, customer: 0 }
 */
function buildLastNDaysSkeleton(n = 7) {
  const days = [];
  const today = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - i
    );
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, {
      weekday: "short",
    });

    days.push({
      date: iso,
      label,
      total: 0,
      agent: 0,
      customer: 0,
    });
  }

  return days;
}

/**
 * Helper: compute response time stats over last X days.
 * Logic:
 *  - Iterate messages ordered by conversation + createdAt
 *  - When we see a customer message, store its time
 *  - When we see the next agent message in same conversation, compute diff
 */
async function computeResponseTimeStats(sinceDate) {
  const docs = await Message.find({ createdAt: { $gte: sinceDate } })
    .select("conversationId senderType createdAt")
    .sort({ conversationId: 1, createdAt: 1 })
    .lean();

  const lastCustomerMessageByConv = new Map();
  const responseTimes = [];

  for (const msg of docs) {
    const convId = String(msg.conversationId);

    if (msg.senderType === "customer") {
      lastCustomerMessageByConv.set(convId, msg.createdAt);
    } else if (msg.senderType === "agent") {
      const lastCustomerAt = lastCustomerMessageByConv.get(convId);
      if (lastCustomerAt) {
        const diffSec =
          (new Date(msg.createdAt).getTime() -
            new Date(lastCustomerAt).getTime()) /
          1000;

        // ignore negative / crazy outliers > 24h
        if (diffSec >= 0 && diffSec <= 24 * 3600) {
          responseTimes.push(diffSec);
        }

        // consume this customer message
        lastCustomerMessageByConv.delete(convId);
      }
    }
  }

  if (!responseTimes.length) {
    return {
      sampleSize: 0,
      avgSeconds: null,
      medianSeconds: null,
      p90Seconds: null,
    };
  }

  responseTimes.sort((a, b) => a - b);
  const sampleSize = responseTimes.length;

  const sum = responseTimes.reduce((acc, v) => acc + v, 0);
  const avgSeconds = sum / sampleSize;
  const medianSeconds = responseTimes[Math.floor(sampleSize / 2)];
  const p90Seconds =
    responseTimes[Math.min(sampleSize - 1, Math.floor(sampleSize * 0.9))];

  return {
    sampleSize,
    avgSeconds,
    medianSeconds,
    p90Seconds,
  };
}

/**
 * GET /api/analytics/dashboard
 * Main dashboard endpoint: conversations, messages, broadcast, response time, volume.
 */
export const getDashboardAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const since7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const since30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // ----- BASIC COUNTS -----
    const [
      totalConversations,
      totalMessages,
      agentMessages,
      customerMessages,
      activeConversationsLast24h,
      totalBroadcastBatches,
      totalBroadcastMessages,
    ] = await Promise.all([
      Conversation.countDocuments({}), // total convos
      Message.countDocuments({}), // total messages
      Message.countDocuments({ senderType: "agent" }),
      Message.countDocuments({ senderType: "customer" }),
      Conversation.countDocuments({ lastMessageAt: { $gte: since24h } }),
      BroadcastBatch.countDocuments({}),
      BroadcastMessage.countDocuments({}),
    ]);

    // ----- MESSAGE VOLUME LAST 7 DAYS -----
    const rawVolume = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: since7Days },
        },
      },
      {
        $group: {
          _id: {
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            senderType: "$senderType",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.day",
          countsBySender: {
            $push: {
              k: "$_id.senderType",
              v: "$count",
            },
          },
          total: { $sum: "$count" },
        },
      },
      {
        $project: {
          _id: 0,
          day: "$_id",
          total: 1,
          counts: {
            $arrayToObject: "$countsBySender",
          },
        },
      },
      {
        $sort: { day: 1 },
      },
    ]);

    const skeleton = buildLastNDaysSkeleton(7);
    const volumeMap = new Map(rawVolume.map((d) => [d.day, d]));

    const messageVolume = skeleton.map((d) => {
      const m = volumeMap.get(d.date);
      return {
        date: d.date,
        label: d.label,
        total: m?.total || 0,
        agent: m?.counts?.agent || 0,
        customer: m?.counts?.customer || 0,
      };
    });

    const maxVolume = messageVolume.reduce(
      (max, d) => (d.total > max ? d.total : max),
      0
    );

    // ----- BROADCAST ANALYTICS -----
    const recentBatches = await BroadcastBatch.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "name templateName language totalNumbers queuedCount successCount failedCount status startedAt finishedAt createdAt"
      )
      .lean();

    const broadcastCampaigns = recentBatches.map((b) => {
      const total = b.totalNumbers || 0;
      const success = b.successCount || 0;
      const failed = b.failedCount || 0;
      const queued = b.queuedCount || 0;
      const delivered = success;
      const successRate = total > 0 ? (success / total) * 100 : 0;

      return {
        id: String(b._id),
        name: b.name || b.templateName,
        templateName: b.templateName,
        language: b.language,
        total,
        queued,
        success,
        failed,
        delivered,
        successRate,
        status: b.status,
        createdAt: b.createdAt,
        startedAt: b.startedAt,
        finishedAt: b.finishedAt,
      };
    });

    // Summaries
    const broadcastSummary = {
      totalBatches: totalBroadcastBatches,
      totalMessages: totalBroadcastMessages,
      lastCampaigns: broadcastCampaigns,
    };

    // ----- RESPONSE TIME METRICS (LAST 30 DAYS FOR BETTER SAMPLE) -----
    const responseTimeStats = await computeResponseTimeStats(since30Days);

    // ----- BUILD OVERVIEW CARDS -----
    const overviewStats = [
      {
        label: "Total Conversations",
        value: totalConversations,
        helperText: "All-time conversations",
        tone: "primary",
      },
      {
        label: "Active in Last 24h",
        value: activeConversationsLast24h,
        helperText: "Customers engaged today",
        tone: "success",
      },
      {
        label: "Total Messages",
        value: totalMessages,
        helperText: "All-time messages",
        tone: "primary",
      },
      {
        label: "Broadcast Messages",
        value: totalBroadcastMessages,
        helperText: "Sent via campaigns",
        tone: "accent",
      },
    ];

    // messages overview
    const messageOverview = {
      totalMessages,
      agentMessages,
      customerMessages,
      messageVolume,
      maxVolume,
    };

    // response time display-ready
    const responseTime = {
      sampleSize: responseTimeStats.sampleSize,
      avgSeconds: responseTimeStats.avgSeconds,
      medianSeconds: responseTimeStats.medianSeconds,
      p90Seconds: responseTimeStats.p90Seconds,
    };

    // Final payload
    return res.json({
      overview: {
        stats: overviewStats,
      },
      messages: messageOverview,
      broadcast: broadcastSummary,
      responseTime,
      meta: {
        generatedAt: now,
        window: {
          volumeLastNDays: 7,
          responseTimeLastNDays: 30,
        },
      },
    });
  } catch (err) {
    console.error("Analytics dashboard error:", err);
    return res.status(500).json({
      error: "Failed to compute analytics",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
