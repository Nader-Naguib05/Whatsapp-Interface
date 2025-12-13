import React, { useEffect, useState } from "react";
import StatCard from "../ui/StatCard";

// ---- Helpers ---------------------------------------------------------

const numberFormatter = new Intl.NumberFormat("ar-EG");

function formatDuration(seconds) {
    if (seconds == null || Number.isNaN(seconds)) return "—";

    if (seconds < 60) return `${Math.round(seconds)} ثانية`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes.toFixed(1)} دقيقة`;
    const hours = minutes / 60;
    return `${hours.toFixed(1)} ساعة`;
}

const LoadingState = () => (
    <div className="flex flex-col items-center gap-3 text-gray-500" dir="rtl">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">جارٍ تحميل التحليلات…</p>
    </div>
);

const ErrorState = ({ message, onRetry }) => (
    <div className="h-full flex items-center justify-center px-4" dir="rtl">
        <div className="max-w-md w-full text-center bg-red-50 border border-red-100 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-red-700 mb-2">
                تعذّر تحميل التحليلات
            </h3>
            <p className="text-xs text-red-600 mb-4">
                {message || "حدث خطأ أثناء جلب البيانات."}
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                    إعادة المحاولة
                </button>
            )}
        </div>
    </div>
);

const EmptyState = () => (
    <div className="h-full flex items-center justify-center px-4" dir="rtl">
        <div className="max-w-md w-full text-center bg-white border border-dashed border-gray-300 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
                لا يوجد نشاط بعد
            </h3>
            <p className="text-xs text-gray-500">
                عندما تبدأ الرسائل والحملات في الظهور، ستظهر هنا تحليلات الأداء.
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

    return (
        <div
            dir="rtl"
            className="h-full overflow-y-auto bg-slate-50 text-right"
        >
            <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 flex-row-reverse">
                    <div>
                        <h1 className="text-[22px] md:text-2xl font-semibold text-slate-900 tracking-tight">
                            التحليلات والتقارير
                        </h1>
                        <p className="mt-1 text-xs text-slate-500 max-w-xl">
                            راقب أداء المحادثات، نتائج الحملات، وزمن الاستجابة
                            في مساحة العمل.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] flex-row-reverse">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex-row-reverse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            مباشر
                        </span>

                        {meta?.generatedAt && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-500 flex-row-reverse">
                                آخر تحديث{" "}
                                {new Date(meta.generatedAt).toLocaleTimeString(
                                    "ar-EG",
                                    {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    }
                                )}
                            </span>
                        )}

                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-500 flex-row-reverse">
                            آخر {meta?.window?.volumeLastNDays ?? 7} أيام
                        </span>
                    </div>
                </div>

                {/* STAT CARDS */}
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

                {/* MESSAGE VOLUME */}
                <div
                    dir="rtl"
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 text-right"
                >
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm/50 shadow-slate-100 p-5">
                        <div className="flex items-center justify-between mb-4 flex-row-reverse">
                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-500">
                                الإجمالي:{" "}
                                {numberFormatter.format(totalMessages)}
                            </span>
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">
                                    حجم الرسائل (آخر{" "}
                                    {meta?.window?.volumeLastNDays ?? 7} أيام)
                                </h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    الرسائل الواردة والصادرة يوميًا عبر كل
                                    المحادثات.
                                </p>
                            </div>
                        </div>

                        {messageVolume.length === 0 ? (
                            <p className="text-xs text-slate-400">
                                لا توجد رسائل.
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
                                            <div className="flex justify-between text-[11px] mb-1 flex-row-reverse">
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
                                                        <div className="flex h-full w-full flex-row-reverse">
                                                            <div
                                                                className="h-full"
                                                                style={{
                                                                    width: `${customerRatio}%`,
                                                                    background:
                                                                        "linear-gradient(90deg, #3b82f6, #2563eb)",
                                                                }}
                                                            />
                                                            <div
                                                                className="h-full"
                                                                style={{
                                                                    width: `${agentRatio}%`,
                                                                    background:
                                                                        "linear-gradient(90deg, #22c55e, #16a34a)",
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

                        <div className="flex items-center gap-4 mt-4 text-[11px] text-slate-500 flex-row-reverse">
                            <div className="flex items-center gap-1.5 flex-row-reverse">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span>رسائل الموظفين</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-row-reverse">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <span>رسائل العملاء</span>
                            </div>
                        </div>
                    </div>
                    {/* RESPONSE TIME */}
                    <div
                        dir="rtl"
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm/50 shadow-slate-100 p-5 text-right"
                    >
                        <div className="flex items-center justify-between mb-4 flex-row-reverse">
                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-500">
                                عدد العينات: {responseSample}
                            </span>
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">
                                    أداء زمن الاستجابة
                                </h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    الوقت بين رسالة العميل والرد التالي من
                                    الموظف.
                                </p>
                            </div>
                        </div>

                        {responseSample === 0 ? (
                            <p className="text-xs text-slate-400">
                                لا توجد بيانات كافية لحساب زمن الاستجابة.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {/* Average */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/60 border border-emerald-100 flex-row-reverse">
                                    <div>
                                        <p className="text-[11px] font-semibold text-emerald-800">
                                            متوسط الاستجابة
                                        </p>
                                        <p className="text-[10px] text-emerald-700/80">
                                            الوقت النموذجي للرد
                                        </p>
                                    </div>
                                    <span className="text-lg font-bold text-emerald-800">
                                        {formatDuration(
                                            responseTime.avgSeconds
                                        )}
                                    </span>
                                </div>

                                {/* Median */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-sky-50 to-sky-100/60 border border-sky-100 flex-row-reverse">
                                    <div>
                                        <p className="text-[11px] font-semibold text-sky-800">
                                            الوسيط
                                        </p>
                                        <p className="text-[10px] text-sky-700/80">
                                            نصف الردود أسرع من هذا الوقت
                                        </p>
                                    </div>
                                    <span className="text-lg font-bold text-sky-800">
                                        {formatDuration(
                                            responseTime.medianSeconds
                                        )}
                                    </span>
                                </div>

                                {/* P90 */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-fuchsia-50 to-fuchsia-100/60 border border-fuchsia-100 flex-row-reverse">
                                    <div>
                                        <p className="text-[11px] font-semibold text-fuchsia-800">
                                            زمن الاستجابة P90
                                        </p>
                                        <p className="text-[10px] text-fuchsia-700/80">
                                            90٪ من الردود أسرع من هذا
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

                {/* BROADCAST CAMPAIGNS */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-row-reverse">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm/50 shadow-slate-100 p-5 xl:col-span-2">
                        <div className="flex items-center justify-between mb-4 flex-row-reverse">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">
                                    حملات البث
                                </h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    أداء آخر الحملات المُرسلة.
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-1 text-[11px] text-slate-500">
                                <span className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">
                                    الدُفعات: {totalBroadcastBatches}
                                </span>

                                <span className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">
                                    الرسائل:{" "}
                                    {numberFormatter.format(
                                        totalBroadcastMessages
                                    )}
                                </span>
                            </div>
                        </div>

                        {lastCampaigns.length === 0 ? (
                            <p className="text-xs text-slate-400">
                                لا توجد حملات بعد.
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
                                            dir="rtl"
                                        >
                                            {/* Top Row */}
                                            <div className="flex items-center justify-between mb-1.5 flex-row-reverse">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-semibold text-slate-900">
                                                        {c.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">
                                                        القالب {c.templateName}{" "}
                                                        · {c.language}
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
                                                    {c.status === "completed"
                                                        ? "اكتملت"
                                                        : c.status ===
                                                          "processing"
                                                        ? "جارٍ التنفيذ"
                                                        : c.status === "failed"
                                                        ? "فشلت"
                                                        : c.status}
                                                </span>
                                            </div>

                                            {/* Numbers Row */}
                                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 flex-row-reverse">
                                                <span>
                                                    {numberFormatter.format(
                                                        c.success
                                                    )}{" "}
                                                    تم تسليمها من أصل{" "}
                                                    {numberFormatter.format(
                                                        c.total
                                                    )}
                                                </span>

                                                <span className="font-medium text-slate-700">
                                                    {rate.toFixed(1)}٪ نجاح
                                                </span>
                                            </div>

                                            {/* Progress Bar */}
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

                    {/* SPLIT + INSIGHTS */}
                    <div className="space-y-4">
                        {/* MESSAGE SPLIT */}
                        <div
                            className="bg-white rounded-2xl border border-slate-200 shadow-sm/50 shadow-slate-100 p-5"
                            dir="rtl"
                        >
                            <h2 className="text-sm font-semibold text-slate-900 mb-3">
                                تقسيم الرسائل
                            </h2>

                            {totalMessages === 0 ? (
                                <p className="text-xs text-slate-400">
                                    لا توجد رسائل لتحليل التقسيم.
                                </p>
                            ) : (
                                <>
                                    {/* Total */}
                                    <div className="flex items-center justify-between mb-2 flex-row-reverse">
                                        <span className="text-xs text-slate-500">
                                            الإجمالي
                                        </span>
                                        <span className="text-sm font-semibold text-slate-900">
                                            {numberFormatter.format(
                                                totalMessages
                                            )}
                                        </span>
                                    </div>

                                    {/* Bar */}
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4 overflow-hidden">
                                        <div className="flex h-full w-full flex-row-reverse">
                                            <div
                                                className="h-full"
                                                style={{
                                                    width: `${customerShare}%`,
                                                    background:
                                                        "linear-gradient(90deg, #3b82f6, #2563eb)",
                                                }}
                                            />
                                            <div
                                                className="h-full"
                                                style={{
                                                    width: `${agentShare}%`,
                                                    background:
                                                        "linear-gradient(90deg, #22c55e, #16a34a)",
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Breakdown */}
                                    <div className="space-y-2 text-[11px]">
                                        <div className="flex items-center justify-between flex-row-reverse">
                                            <div className="flex items-center gap-1.5 flex-row-reverse">
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                                <span>رسائل الموظفين</span>
                                            </div>
                                            <span className="font-medium text-slate-900">
                                                {numberFormatter.format(
                                                    agentMessages
                                                )}{" "}
                                                ({agentShare.toFixed(1)}٪)
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between flex-row-reverse">
                                            <div className="flex items-center gap-1.5 flex-row-reverse">
                                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                                <span>رسائل العملاء</span>
                                            </div>
                                            <span className="font-medium text-slate-900">
                                                {numberFormatter.format(
                                                    customerMessages
                                                )}{" "}
                                                ({customerShare.toFixed(1)}٪)
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* INSIGHTS */}
                        <div
                            className="bg-slate-900 rounded-2xl text-slate-50 p-5"
                            dir="rtl"
                        >
                            <h2 className="text-sm font-semibold mb-2">
                                لمحات سريعة
                            </h2>
                            <p className="text-[11px] text-slate-300 mb-3">
                                استنتاجات سريعة من الفترة الحالية. هذه المعلومات
                                للاطلاع فقط.
                            </p>

                            <ul className="space-y-2 text-[11px]">
                                {busiestDay && (
                                    <li className="flex gap-2 flex-row-reverse">
                                        <span className="mt-0.5 w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" />
                                        <span>
                                            أكثر يوم نشاطًا هو{" "}
                                            <span className="font-semibold">
                                                {busiestDay.label}
                                            </span>{" "}
                                            بعدد{" "}
                                            <span className="font-semibold">
                                                {busiestDay.total}
                                            </span>{" "}
                                            رسالة.
                                        </span>
                                    </li>
                                )}

                                {avgDailyMessages > 0 && (
                                    <li className="flex gap-2 flex-row-reverse">
                                        <span className="mt-0.5 w-1 h-1 rounded-full bg-sky-400 flex-shrink-0" />
                                        <span>
                                            متوسط الرسائل اليومي:{" "}
                                            <span className="font-semibold">
                                                {avgDailyMessages.toFixed(1)}{" "}
                                                رسالة/يوم
                                            </span>
                                        </span>
                                    </li>
                                )}

                                {responseSample > 0 &&
                                    responseTime.avgSeconds != null && (
                                        <li className="flex gap-2 flex-row-reverse">
                                            <span className="mt-0.5 w-1 h-1 rounded-full bg-fuchsia-400 flex-shrink-0" />
                                            <span>
                                                متوسط زمن الاستجابة الحالي:{" "}
                                                <span className="font-semibold">
                                                    {formatDuration(
                                                        responseTime.avgSeconds
                                                    )}
                                                </span>
                                                . تحسينه يزيد من رضا العملاء.
                                            </span>
                                        </li>
                                    )}

                                {totalBroadcastBatches > 0 && (
                                    <li className="flex gap-2 flex-row-reverse">
                                        <span className="mt-0.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                                        <span>
                                            تم إرسال{" "}
                                            <span className="font-semibold">
                                                {totalBroadcastBatches} حملة بث
                                            </span>{" "}
                                            بإجمالي{" "}
                                            <span className="font-semibold">
                                                {numberFormatter.format(
                                                    totalBroadcastMessages
                                                )}
                                            </span>{" "}
                                            رسالة.
                                        </span>
                                    </li>
                                )}

                                {/* Empty Case */}
                                {!busiestDay &&
                                    avgDailyMessages === 0 &&
                                    responseSample === 0 &&
                                    totalBroadcastBatches === 0 && (
                                        <li className="text-[11px] text-slate-300">
                                            ابدأ المحادثة مع العملاء أو أرسل
                                            حملة، وستظهر التحليلات هنا.
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
