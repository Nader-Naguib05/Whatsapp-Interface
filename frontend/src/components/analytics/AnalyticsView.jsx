// src/components/analytics/AnalyticsView.jsx
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

const SkeletonBar = () => (
  <div className="animate-pulse w-full h-2 rounded-full bg-gray-200" />
);

const LoadingState = () => (
  <div className="p-6 h-full flex items-center justify-center">
    <div className="flex flex-col items-center gap-3 text-gray-500">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm">Loading analytics…</p>
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="p-6 h-full flex items-center justify-center">
    <div className="max-w-md w-full text-center bg-red-50 border border-red-100 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-red-700 mb-2">
        Something went wrong
      </h3>
      <p className="text-xs text-red-600 mb-4">
        {message || "Failed to load analytics data."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  </div>
);

const EmptyState = () => (
  <div className="p-6 h-full flex items-center justify-center">
    <div className="max-w-md w-full text-center bg-white border border-dashed border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">
        No activity yet
      </h3>
      <p className="text-xs text-gray-500">
        Once you start chatting with customers and sending broadcasts,
        you&apos;ll see live analytics here.
      </p>
    </div>
  </div>
);

const AnalyticsView = () => {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${import.meta.env.VITE_API_URL}/analytics/dashboard`);
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();
      setPayload(data);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchAnalytics} />;

  if (
    !payload ||
    !payload.overview ||
    !payload.messages ||
    !Array.isArray(payload.overview.stats)
  ) {
    return <EmptyState />;
  }

  const { overview, messages, broadcast, responseTime } = payload;
  const stats = overview.stats || [];
  const messageVolume = messages.messageVolume || [];
  const maxVolume = messages.maxVolume || 0;
  const totalMessages = messages.totalMessages || 0;
  const agentMessages = messages.agentMessages || 0;
  const customerMessages = messages.customerMessages || 0;

  const totalBroadcastBatches = broadcast?.totalBatches || 0;
  const totalBroadcastMessages = broadcast?.totalMessages || 0;
  const lastCampaigns = broadcast?.lastCampaigns || [];

  const responseSample = responseTime?.sampleSize || 0;

  return (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Analytics &amp; Reports
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Conversation performance, broadcast impact, and response-time
            health in a single view.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
          {payload.meta?.generatedAt && (
            <span>
              Updated at{" "}
              {new Date(payload.meta.generatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Message volume + response times */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Message Volume */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">
              Message Volume (Last 7 Days)
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              Total: {numberFormatter.format(totalMessages)}
            </span>
          </div>

          {messageVolume.length === 0 ? (
            <p className="text-xs text-gray-400">
              No messages sent in the last 7 days.
            </p>
          ) : (
            <div className="space-y-3">
              {messageVolume.map((d) => {
                const percentage = maxVolume
                  ? Math.max(5, (d.total / maxVolume) * 100)
                  : 0;

                const agentRatio =
                  d.total > 0 ? (d.agent / d.total) * 100 : 0;
                const customerRatio =
                  d.total > 0 ? (d.customer / d.total) * 100 : 0;

                return (
                  <div key={d.date}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-600 font-medium">
                        {d.label}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {d.total}
                      </span>
                    </div>

                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      >
                        {/* layered bar: agent vs customer */}
                        {d.total > 0 && (
                          <div className="flex h-full w-full">
                            <div
                              className="h-full"
                              style={{
                                width: `${agentRatio}%`,
                                background:
                                  "rgba(34, 197, 94, 1)", // emerald-500
                              }}
                            />
                            <div
                              className="h-full"
                              style={{
                                width: `${customerRatio}%`,
                                background:
                                  "rgba(59, 130, 246, 1)", // blue-500
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

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-[11px] text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Agent messages</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Customer messages</span>
            </div>
          </div>
        </div>

        {/* Response Time Performance */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">
              Response Time Performance
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              Sample: {responseSample} reply pairs
            </span>
          </div>

          {responseSample === 0 ? (
            <p className="text-xs text-gray-400">
              Not enough recent message pairs to compute response times.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-gray-700">
                    Average Response
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Typical agent reply time
                  </span>
                </div>
                <span className="text-lg font-bold text-emerald-700">
                  {formatDuration(responseTime.avgSeconds)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-gray-700">
                    Median Response
                  </span>
                  <span className="text-[10px] text-gray-500">
                    50% of replies are faster than this
                  </span>
                </div>
                <span className="text-lg font-bold text-blue-700">
                  {formatDuration(responseTime.medianSeconds)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-gray-700">
                    P90 Response
                  </span>
                  <span className="text-[10px] text-gray-500">
                    90% of replies are under this
                  </span>
                </div>
                <span className="text-lg font-bold text-purple-700">
                  {formatDuration(responseTime.p90Seconds)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast performance + message split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Broadcast Campaigns */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-sm">
              Broadcast Campaigns
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <span className="px-2 py-0.5 rounded-full bg-gray-100">
                Batches: {totalBroadcastBatches}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100">
                Messages: {numberFormatter.format(totalBroadcastMessages)}
              </span>
            </div>
          </div>

          {lastCampaigns.length === 0 ? (
            <p className="text-xs text-gray-400">
              No broadcast campaigns have been sent yet.
            </p>
          ) : (
            <div className="space-y-3">
              {lastCampaigns.map((c) => {
                const rate = Number.isFinite(c.successRate)
                  ? c.successRate
                  : 0;

                return (
                  <div
                    key={c.id}
                    className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-900">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Template {c.templateName} · {c.language}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          c.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : c.status === "processing"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : c.status === "failed"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : "bg-gray-50 text-gray-600 border-gray-100"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                      <span>
                        {numberFormatter.format(c.success)} delivered /{" "}
                        {numberFormatter.format(c.total)} total
                      </span>
                      <span className="font-medium text-gray-700">
                        {rate.toFixed(1)}% success
                      </span>
                    </div>

                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 bg-emerald-500 rounded-full"
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

        {/* Message Split */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">
            Message Split
          </h3>

          {totalMessages === 0 ? (
            <p className="text-xs text-gray-400">
              No messages yet to analyse split.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Total</span>
                <span className="text-sm font-semibold text-gray-900">
                  {numberFormatter.format(totalMessages)}
                </span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden">
                {totalMessages > 0 && (
                  <div className="flex h-full w-full">
                    <div
                      className="h-full"
                      style={{
                        width: `${(agentMessages / totalMessages) * 100}%`,
                        background: "rgba(34, 197, 94, 1)", // agent
                      }}
                    />
                    <div
                      className="h-full"
                      style={{
                        width: `${
                          (customerMessages / totalMessages) * 100
                        }%`,
                        background: "rgba(59, 130, 246, 1)", // customer
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Agent messages</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {numberFormatter.format(agentMessages)} (
                    {((agentMessages / totalMessages) * 100).toFixed(1)}%)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Customer messages</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {numberFormatter.format(customerMessages)} (
                    {((customerMessages / totalMessages) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
