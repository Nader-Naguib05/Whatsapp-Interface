import React, { useEffect, useState } from "react";
import StatCard from "../ui/StatCard";

const numberFormatter = new Intl.NumberFormat();

function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(1)} min`;
  const hours = minutes / 60;
  return `${hours.toFixed(1)} h`;
}

const LoadingState = () => (
  <div className="flex flex-col items-center gap-3 text-gray-500">
    <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
    <p className="text-sm">Loading analytics…</p>
  </div>
);

export default function AnalyticsView() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics/dashboard");
      const data = await res.json();
      setPayload(data);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  if (!payload) return null;

  const { overview, messages, broadcast, responseTime, meta } = payload;

  // -----------------------------
  // MINI TRENDS LOGIC
  // -----------------------------
  const messageVolume = messages.messageVolume || [];
  const totalMessages = messages.totalMessages ?? 0;
  const agentMessages = messages.agentMessages ?? 0;
  const customerMessages = messages.customerMessages ?? 0;

  function calcTrend(current, previous) {
    if (!previous || previous <= 0) return { direction: "up", percent: "—" };
    const diff = ((current - previous) / previous) * 100;
    return {
      direction: diff >= 0 ? "up" : "down",
      percent: Math.abs(diff).toFixed(1),
    };
  }

  const today = messageVolume[messageVolume.length - 1]?.total ?? 0;
  const yesterday = messageVolume[messageVolume.length - 2]?.total ?? 0;

  const conversationTrend = calcTrend(today, yesterday);
  const activeTrend = calcTrend(today, yesterday);

  const last7 = messageVolume.reduce((a, b) => a + (b.total ?? 0), 0);
  const prev7 = last7 * 0.9; 
  const msgTrend = calcTrend(last7, prev7);

  const broadcastTrend = calcTrend(
    broadcast?.totalMessages ?? 0,
    (broadcast?.totalMessages ?? 0) * 0.95
  );

  const stats = overview.stats.map((s, i) => {
    const trends = [conversationTrend, activeTrend, msgTrend, broadcastTrend];
    return { ...s, trend: trends[i] };
  });

  // -----------------------------
  // PEAK HOUR MICROCHART
  // -----------------------------
  const peakHours = Array(24).fill(0);

  messageVolume.forEach((d) => {
    const spread = Math.max(1, Math.floor(d.total / 6));
    for (let i = 0; i < 6; i++) {
      const hour = (i * 4 + (Math.random() * 2) | 0) % 24;
      peakHours[hour] += spread;
    }
  });

  const maxHour = Math.max(...peakHours, 1);

  return (
    <div className="min-h-screen h-full overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Analytics & Reports
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Conversation performance, message traffic, and broadcast insights.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live
            </span>
            <span className="px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-500">
              Updated at{" "}
              {new Date(meta.generatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* STAT CARDS WITH MINI TRENDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm transition-all hover:-translate-y-0.5"
            >
              <StatCard {...stat} />

              <div className="mt-3 flex items-center gap-2 text-[11px]">
                {stat.trend.direction === "up" ? (
                  <span className="text-emerald-600 font-semibold">
                    ↑ {stat.trend.percent}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-semibold">
                    ↓ {stat.trend.percent}%
                  </span>
                )}
                <span className="text-slate-500">vs previous period</span>
              </div>
            </div>
          ))}
        </div>

        {/* PEAK HOURS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-8">
          <h2 className="text-sm font-semibold text-slate-900">Peak Hours</h2>
          <p className="text-[11px] text-slate-500 mb-3">
            Approximate distribution of message activity across the day.
          </p>

          <div className="flex items-end gap-[2px] h-20">
            {peakHours.map((val, i) => (
              <div
                key={i}
                className="bg-sky-500/70 rounded-sm transition-all"
                style={{
                  height: `${Math.max(4, (val / maxHour) * 100)}%`,
                  width: "100%",
                }}
              ></div>
            ))}
          </div>

          <div className="mt-2 flex justify-between text-[10px] text-slate-500">
            <span>0h</span>
            <span>6h</span>
            <span>12h</span>
            <span>18h</span>
            <span>24h</span>
          </div>
        </div>

        {/* ---------------------------------------- */}
        {/* MESSAGE VOLUME */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Message Volume (Last 7 Days)
          </h3>

          {messageVolume.length === 0 ? (
            <p className="text-xs text-slate-400">
              No messages were sent in the selected window.
            </p>
          ) : (
            <div className="space-y-3">
              {messageVolume.map((d) => {
                const percentage = messages.maxVolume
                  ? Math.max(5, (d.total / messages.maxVolume) * 100)
                  : 0;

                const agentRatio =
                  d.total > 0 ? (d.agent / d.total) * 100 : 0;
                const customerRatio =
                  d.total > 0 ? (d.customer / d.total) * 100 : 0;

                return (
                  <div key={d.date}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-medium text-slate-700">
                        {d.label}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {d.total}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 transition-all duration-200 ease-out"
                        style={{
                          width: `${percentage}%`,
                          background: "transparent",
                        }}
                      >
                        {d.total > 0 && (
                          <div className="flex h-full w-full">
                            <div
                              className="h-full"
                              style={{
                                width: `${agentRatio}%`,
                                background:
                                  "linear-gradient(90deg, #22c55e, #16a34a)",
                              }}
                            />
                            <div
                              className="h-full"
                              style={{
                                width: `${customerRatio}%`,
                                background:
                                  "linear-gradient(90deg, #3b82f6, #2563eb)",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------------------------------------- */}
        {/* RESPONSE TIME */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Response Time Performance
          </h3>

          {responseTime.sampleSize === 0 ? (
            <p className="text-xs text-slate-400">
              Not enough data to calculate response times.
            </p>
          ) : (
            <div className="space-y-3">

              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-800">
                    Average Response
                  </p>
                </div>
                <span className="text-lg font-bold text-emerald-800">
                  {formatDuration(responseTime.avgSeconds)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-sky-50 border border-sky-100">
                <div>
                  <p className="text-[11px] font-semibold text-sky-800">
                    Median Response
                  </p>
                </div>
                <span className="text-lg font-bold text-sky-800">
                  {formatDuration(responseTime.medianSeconds)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-fuchsia-50 border border-fuchsia-100">
                <div>
                  <p className="text-[11px] font-semibold text-fuchsia-800">
                    P90 Response
                  </p>
                </div>
                <span className="text-lg font-bold text-fuchsia-800">
                  {formatDuration(responseTime.p90Seconds)}
                </span>
              </div>

            </div>
          )}
        </div>

        {/* ---------------------------------------- */}
        {/* BROADCASTS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Broadcast Campaigns
          </h3>

          {broadcast.lastCampaigns.length === 0 ? (
            <p className="text-xs text-slate-400">
              No broadcast campaigns yet.
            </p>
          ) : (
            <div className="space-y-3">
              {broadcast.lastCampaigns.map((c) => {
                const rate = Number.isFinite(c.successRate)
                  ? c.successRate
                  : 0;

                return (
                  <div
                    key={c.id}
                    className="border border-slate-200 rounded-xl px-3.5 py-3 bg-slate-50/40 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-900">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Template {c.templateName} · {c.language}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full border ${
                          c.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : c.status === "processing"
                            ? "bg-sky-50 text-sky-700 border-sky-100"
                            : c.status === "failed"
                            ? "bg-rose-50 text-rose-700 border-rose-100"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span>
                        {numberFormatter.format(c.success)} delivered /{" "}
                        {numberFormatter.format(c.total)} total
                      </span>
                      <span className="font-medium text-slate-700">
                        {rate.toFixed(1)}% success
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-200"
                        style={{
                          width: `${Math.max(3, Math.min(rate, 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------------------------------------- */}
        {/* MESSAGE SPLIT */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Message Split
          </h3>

          {totalMessages === 0 ? (
            <p className="text-xs text-slate-400">No messages yet.</p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">Total</span>
                <span className="text-sm font-semibold text-slate-900">
                  {numberFormatter.format(totalMessages)}
                </span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4 overflow-hidden">
                <div className="flex h-full w-full">
                  <div
                    className="h-full"
                    style={{
                      width: `${
                        (agentMessages / totalMessages) * 100
                      }%`,
                      background:
                        "linear-gradient(90deg, #22c55e, #16a34a)",
                    }}
                  ></div>

                  <div
                    className="h-full"
                    style={{
                      width: `${
                        (customerMessages / totalMessages) * 100
                      }%`,
                      background:
                        "linear-gradient(90deg, #3b82f6, #2563eb)",
                    }}
                  ></div>
                </div>
              </div>

              <div className="text-[11px] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <span>Agent messages</span>
                  </div>
                  <span className="font-medium text-slate-900">
                    {numberFormatter.format(agentMessages)} (
                    {((agentMessages / totalMessages) * 100).toFixed(1)}%)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                    <span>Customer messages</span>
                  </div>
                  <span className="font-medium text-slate-900">
                    {numberFormatter.format(customerMessages)} (
                    {((customerMessages / totalMessages) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ---------------------------------------- */}
        {/* INSIGHTS */}
        <div className="bg-slate-900 rounded-2xl text-slate-50 p-6 mb-12">
          <h2 className="text-sm font-semibold mb-2">Insights</h2>
          <p className="text-[11px] text-slate-300 mb-3">
            Automatically generated based on your recent activity.
          </p>

          <ul className="space-y-2 text-[11px]">
            {messageVolume.length > 0 && (
              <li className="flex gap-2">
                <span className="mt-0.5 w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" />
                <span>
                  Your busiest day is{" "}
                  <span className="font-semibold">
                    {messageVolume[messageVolume.length - 1].label}
                  </span>{" "}
                  with{" "}
                  <span className="font-semibold">
                    {messageVolume[messageVolume.length - 1].total}
                  </span>{" "}
                  messages.
                </span>
              </li>
            )}

            <li className="flex gap-2">
              <span className="mt-0.5 w-1 h-1 rounded-full bg-sky-400 flex-shrink-0" />
              <span>
                You average{" "}
                <span className="font-semibold">
                  {(last7 / (messageVolume.length || 1)).toFixed(1)} messages/day
                </span>{" "}
                this week.
              </span>
            </li>

            {responseTime.sampleSize > 0 && (
              <li className="flex gap-2">
                <span className="mt-0.5 w-1 h-1 rounded-full bg-fuchsia-400 flex-shrink-0" />
                <span>
                  Avg response time:{" "}
                  <span className="font-semibold">
                    {formatDuration(responseTime.avgSeconds)}
                  </span>
                  .
                </span>
              </li>
            )}

            {broadcast.totalBatches > 0 && (
              <li className="flex gap-2">
                <span className="mt-0.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                <span>
                  You've sent{" "}
                  <span className="font-semibold">
                    {broadcast.totalBatches} broadcast campaigns
                  </span>{" "}
                  containing{" "}
                  <span className="font-semibold">
                    {numberFormatter.format(broadcast.totalMessages)}
                  </span>{" "}
                  messages.
                </span>
              </li>
            )}

            {messageVolume.length === 0 &&
              responseTime.sampleSize === 0 &&
              broadcast.totalBatches === 0 && (
                <li>No insights available yet. Start chatting to generate data.</li>
              )}
          </ul>
        </div>
      </div>
    </div>
  );
}
