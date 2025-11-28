import React, { useEffect, useState } from "react";
import StatCard from "../ui/StatCard";

// ---- helpers ---------------------------------------------------------

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


const ErrorState = ({ message, onRetry }) => (
    <div className="h-full flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-red-50 border border-red-100 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-red-700 mb-2">
                Couldn&apos;t load analytics
            </h3>
            <p className="text-xs text-red-600 mb-4">
                {message || "Something went wrong while fetching the data."}
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                    Try again
                </button>
            )}
        </div>
    </div>
);

const EmptyState = () => (
    <div className="h-full flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white border border-dashed border-gray-300 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
                No activity yet
            </h3>
            <p className="text-xs text-gray-500">
                As conversations and broadcasts start coming in, this page will
                show live performance analytics.
            </p>
        </div>
    </div>
);

// ---- main view -------------------------------------------------------

const AnalyticsView = () => {
    const [payload, setPayload] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError("");

            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/analytics/dashboard`
            );
            if (!res.ok)
                throw new Error(`Request failed with status ${res.status}`);

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

    if (loading) {
  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
        <LoadingState />
      </div>
    </div>
  );
}


    if (error) return <ErrorState message={error} onRetry={fetchAnalytics} />;

    if (
        !payload ||
        !payload.overview ||
        !payload.messages ||
        !Array.isArray(payload.overview.stats)
    ) {
        return <EmptyState />;
    }

    const { overview, messages, broadcast, responseTime, meta } = payload;
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

    // ---- lightweight "insights" (pure frontend, no backend changes) ----

    const busiestDay =
        messageVolume.length > 0
            ? messageVolume.reduce(
                  (best, d) => (d.total > (best?.total ?? -1) ? d : best),
                  null
              )
            : null;

    const avgDailyMessages =
        messageVolume.length > 0 ? totalMessages / messageVolume.length : 0;

    const agentShare =
        totalMessages > 0 ? (agentMessages / totalMessages) * 100 : 0;
    const customerShare =
        totalMessages > 0 ? (customerMessages / totalMessages) * 100 : 0;

    // --------------------------------------------------------------------

    return (
        <div className="h-full overflow-y-auto bg-slate-50">
            <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
                {/* Top header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-[22px] md:text-2xl font-semibold text-slate-900 tracking-tight">
                            Analytics &amp; Reports
                        </h1>
                        <p className="mt-1 text-xs text-slate-500 max-w-xl">
                            Monitor conversation performance, broadcast impact,
                            and response-time health for your WhatsApp
                            workspace.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                        </span>
                        {meta?.generatedAt && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-500">
                                Updated at{" "}
                                {new Date(meta.generatedAt).toLocaleTimeString(
                                    [],
                                    {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    }
                                )}
                            </span>
                        )}
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-500">
                            Last {meta?.window?.volumeLastNDays ?? 7} days of
                            activity
                        </span>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                    {stats.map((stat, idx) => (
                        <div
                            key={idx}
                            className="transform transition-transform duration-150 ease-out hover:-translate-y-0.5"
                        >
                            <StatCard {...stat} />
                        </div>
                    ))}
                </div>

                {/* Main grid: volume + response */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Message Volume */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm/50 shadow-slate-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Message Volume (Last{" "}
                                    {meta?.window?.volumeLastNDays ?? 7} Days)
                                </h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Daily inbound and outbound messages across
                                    all conversations.
                                </p>
                            </div>
                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-500">
                                Total: {numberFormatter.format(totalMessages)}
                            </span>
                        </div>

                        {messageVolume.length === 0 ? (
                            <p className="text-xs text-slate-400">
                                No messages were sent in the selected window.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {messageVolume.map((d) => {
                                    const percentage = maxVolume
                                        ? Math.max(
                                              5,
                                              (d.total / maxVolume) * 100
                                          )
                                        : 0;

                                    const agentRatio =
                                        d.total > 0
                                            ? (d.agent / d.total) * 100
                                            : 0;
                                    const customerRatio =
                                        d.total > 0
                                            ? (d.customer / d.total) * 100
                                            : 0;

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
                                                        background:
                                                            "transparent",
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

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-4 text-[11px] text-slate-500">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span>Agent messages</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <span>Customer messages</span>
                            </div>
                        </div>
                    </div>

                    {/* Response Time Performance */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm/50 shadow-slate-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Response Time Performance
                                </h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Time between a customer message and the next
                                    agent reply.
                                </p>
                            </div>
                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-500">
                                Sample: {responseSample} reply pairs
                            </span>
                        </div>

                        {responseSample === 0 ? (
                            <p className="text-xs text-slate-400">
                                Not enough recent data to calculate response
                                times.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/60 border border-emerald-100">
                                    <div>
                                        <p className="text-[11px] font-semibold text-emerald-800">
                                            Average Response
                                        </p>
                                        <p className="text-[10px] text-emerald-700/80">
                                            Typical agent reply time
                                        </p>
                                    </div>
                                    <span className="text-lg font-bold text-emerald-800">
                                        {formatDuration(
                                            responseTime.avgSeconds
                                        )}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-sky-50 to-sky-100/60 border border-sky-100">
                                    <div>
                                        <p className="text-[11px] font-semibold text-sky-800">
                                            Median Response
                                        </p>
                                        <p className="text-[10px] text-sky-700/80">
                                            Half of replies are faster than this
                                        </p>
                                    </div>
                                    <span className="text-lg font-bold text-sky-800">
                                        {formatDuration(
                                            responseTime.medianSeconds
                                        )}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-fuchsia-50 to-fuchsia-100/60 border border-fuchsia-100">
                                    <div>
                                        <p className="text-[11px] font-semibold text-fuchsia-800">
                                            P90 Response
                                        </p>
                                        <p className="text-[10px] text-fuchsia-700/80">
                                            90% of replies are under this
                                        </p>
                                    </div>
                                    <span className="text-lg font-bold text-fuchsia-800">
                                        {formatDuration(
                                            responseTime.p90Seconds
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom grid: broadcasts + split + insights */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Broadcast campaigns */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm/50 shadow-slate-100 p-5 xl:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Broadcast Campaigns
                                </h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Performance of the most recent campaigns.
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 text-[11px] text-slate-500">
                                <span className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">
                                    Batches: {totalBroadcastBatches}
                                </span>
                                <span className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">
                                    Messages:{" "}
                                    {numberFormatter.format(
                                        totalBroadcastMessages
                                    )}
                                </span>
                            </div>
                        </div>

                        {lastCampaigns.length === 0 ? (
                            <p className="text-xs text-slate-400">
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
                                            className="border border-slate-200 rounded-xl px-3.5 py-3 bg-slate-50/40 hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-slate-900">
                                                        {c.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">
                                                        Template{" "}
                                                        {c.templateName} ·{" "}
                                                        {c.language}
                                                    </span>
                                                </div>
                                                <span
                                                    className={`text-[10px] px-2.5 py-0.5 rounded-full border ${
                                                        c.status === "completed"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                            : c.status ===
                                                              "processing"
                                                            ? "bg-sky-50 text-sky-700 border-sky-100"
                                                            : c.status ===
                                                              "failed"
                                                            ? "bg-rose-50 text-rose-700 border-rose-100"
                                                            : "bg-slate-50 text-slate-600 border-slate-200"
                                                    }`}
                                                >
                                                    {c.status}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                                <span>
                                                    {numberFormatter.format(
                                                        c.success
                                                    )}{" "}
                                                    delivered /{" "}
                                                    {numberFormatter.format(
                                                        c.total
                                                    )}{" "}
                                                    total
                                                </span>
                                                <span className="font-medium text-slate-700">
                                                    {rate.toFixed(1)}% success
                                                </span>
                                            </div>

                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                <div
                                                    className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-200"
                                                    style={{
                                                        width: `${Math.max(
                                                            3,
                                                            Math.min(rate, 100)
                                                        )}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Message Split + Insights */}
                    <div className="space-y-4">
                        {/* Message split */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm/50 shadow-slate-100 p-5">
                            <h2 className="text-sm font-semibold text-slate-900 mb-3">
                                Message Split
                            </h2>

                            {totalMessages === 0 ? (
                                <p className="text-xs text-slate-400">
                                    No messages yet to analyse split.
                                </p>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-slate-500">
                                            Total
                                        </span>
                                        <span className="text-sm font-semibold text-slate-900">
                                            {numberFormatter.format(
                                                totalMessages
                                            )}
                                        </span>
                                    </div>

                                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4 overflow-hidden">
                                        <div className="flex h-full w-full">
                                            <div
                                                className="h-full"
                                                style={{
                                                    width: `${agentShare}%`,
                                                    background:
                                                        "linear-gradient(90deg, #22c55e, #16a34a)",
                                                }}
                                            />
                                            <div
                                                className="h-full"
                                                style={{
                                                    width: `${customerShare}%`,
                                                    background:
                                                        "linear-gradient(90deg, #3b82f6, #2563eb)",
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-[11px]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                                <span>Agent messages</span>
                                            </div>
                                            <span className="font-medium text-slate-900">
                                                {numberFormatter.format(
                                                    agentMessages
                                                )}{" "}
                                                ({agentShare.toFixed(1)}%)
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                                <span>Customer messages</span>
                                            </div>
                                            <span className="font-medium text-slate-900">
                                                {numberFormatter.format(
                                                    customerMessages
                                                )}{" "}
                                                ({customerShare.toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Insights */}
                        <div className="bg-slate-900 rounded-2xl text-slate-50 p-5">
                            <h2 className="text-sm font-semibold mb-2">
                                Insights
                            </h2>
                            <p className="text-[11px] text-slate-300 mb-3">
                                Quick takeaways generated from the current
                                window. These are purely informational and
                                don&apos;t affect any data.
                            </p>

                            <ul className="space-y-2 text-[11px]">
                                {busiestDay && (
                                    <li className="flex gap-2">
                                        <span className="mt-0.5 w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" />
                                        <span>
                                            Your busiest day is{" "}
                                            <span className="font-semibold">
                                                {busiestDay.label}
                                            </span>{" "}
                                            with{" "}
                                            <span className="font-semibold">
                                                {busiestDay.total} messages
                                            </span>
                                            .
                                        </span>
                                    </li>
                                )}

                                {avgDailyMessages > 0 && (
                                    <li className="flex gap-2">
                                        <span className="mt-0.5 w-1 h-1 rounded-full bg-sky-400 flex-shrink-0" />
                                        <span>
                                            You&apos;re averaging{" "}
                                            <span className="font-semibold">
                                                {avgDailyMessages.toFixed(1)}{" "}
                                                messages/day
                                            </span>{" "}
                                            in this period.
                                        </span>
                                    </li>
                                )}

                                {responseSample > 0 &&
                                    responseTime.avgSeconds != null && (
                                        <li className="flex gap-2">
                                            <span className="mt-0.5 w-1 h-1 rounded-full bg-fuchsia-400 flex-shrink-0" />
                                            <span>
                                                Current average response time is{" "}
                                                <span className="font-semibold">
                                                    {formatDuration(
                                                        responseTime.avgSeconds
                                                    )}
                                                </span>
                                                . Tightening this usually
                                                increases customer satisfaction.
                                            </span>
                                        </li>
                                    )}

                                {totalBroadcastBatches > 0 && (
                                    <li className="flex gap-2">
                                        <span className="mt-0.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                                        <span>
                                            You&apos;ve sent{" "}
                                            <span className="font-semibold">
                                                {totalBroadcastBatches}{" "}
                                                broadcast campaigns
                                            </span>{" "}
                                            with{" "}
                                            <span className="font-semibold">
                                                {numberFormatter.format(
                                                    totalBroadcastMessages
                                                )}{" "}
                                                messages
                                            </span>{" "}
                                            in total.
                                        </span>
                                    </li>
                                )}

                                {!busiestDay &&
                                    avgDailyMessages === 0 &&
                                    responseSample === 0 &&
                                    totalBroadcastBatches === 0 && (
                                        <li className="text-[11px] text-slate-300">
                                            Start talking to customers or send a
                                            first broadcast, and this area will
                                            highlight what&apos;s happening.
                                        </li>
                                    )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsView;
