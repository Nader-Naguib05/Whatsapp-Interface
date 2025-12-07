import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import {
  Radio,
  Paperclip,
  Send,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "../../utils/cn";

const API_BASE = `${import.meta.env.VITE_API_URL}/broadcast`;

// -------------------- Helpers --------------------

function formatDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleString("ar-EG", {
    hour12: false,
  });
}

function formatShortDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleDateString("ar-EG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calcProgress(batch) {
  if (!batch || !batch.totalNumbers) return 0;
  const processed = (batch.successCount || 0) + (batch.failedCount || 0);
  return Math.min(100, Math.round((processed / batch.totalNumbers) * 100));
}

function statusColor(status) {
  switch (status) {
    case "queued":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "processing":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "failed":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

function getAuthConfig(extraHeaders = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
  return { headers };
}

// -------------------- Component --------------------

const BroadcastView = () => {
  // --------------- Composer state ---------------
  const [templateName, setTemplateName] = useState("");
  const [language, setLanguage] = useState("ar");
  const [componentsRaw, setComponentsRaw] = useState(""); // JSON string (optional)
  const [batchName, setBatchName] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const [csvHeaders, setCsvHeaders] = useState([]);
  const [numberColumn, setNumberColumn] = useState("phone_number");

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  // --------------- Batches state ---------------
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchesError, setBatchesError] = useState("");

  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loadingBatchDetails, setLoadingBatchDetails] = useState(false);
  const [batchDetailsError, setBatchDetailsError] = useState("");

  const fileInputRef = useRef(null);

  // --------------- Derived state ---------------

  const activeBatches = useMemo(
    () =>
      batches
        .filter((b) => b.status === "queued" || b.status === "processing")
        .slice(0, 20),
    [batches]
  );

  const completedBatches = useMemo(
    () =>
      batches
        .filter((b) => b.status === "completed" || b.status === "failed")
        .slice(0, 50),
    [batches]
  );

  // --------------- DATA FETCHING ---------------

  const fetchBatches = async () => {
    try {
      setLoadingBatches(true);
      setBatchesError("");
      const res = await axios.get(`${API_BASE}/batches`, getAuthConfig());
      setBatches(res.data || []);
    } catch (err) {
      setBatchesError(
        err?.response?.data?.error ||
          "فشل تحميل سجل البرودكاست. برجاء إعادة المحاولة."
      );
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchBatchDetails = async (id) => {
    if (!id) return;
    try {
      setLoadingBatchDetails(true);
      setBatchDetailsError("");
      const res = await axios.get(
        `${API_BASE}/batches/${id}`,
        getAuthConfig()
      );
      setSelectedBatch(res.data || null);
    } catch (err) {
      setBatchDetailsError(
        err?.response?.data?.error ||
          "فشل تحميل تفاصيل البرودكاست. برجاء إعادة المحاولة."
      );
    } finally {
      setLoadingBatchDetails(false);
    }
  };

  useEffect(() => {
    let intervalId;
    let isMounted = true;

    const load = async () => {
      if (!isMounted) return;
      await fetchBatches();
    };

    load();
    intervalId = setInterval(load, 5000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchDetails(selectedBatchId);
    } else {
      setSelectedBatch(null);
    }
  }, [selectedBatchId]);

  // --------------- HANDLERS ---------------

  const resetFileState = () => {
    setFile(null);
    setCsvHeaders([]);
    setNumberColumn("phone_number");
    setFileError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const detectDelimiter = (line) => {
    if (!line) return ",";
    const commaCount = (line.match(/,/g) || []).length;
    const semiCount = (line.match(/;/g) || []).length;
    return semiCount > commaCount ? ";" : ",";
  };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];

    if (!f) {
      resetFileState();
      return;
    }

    if (!f.name.toLowerCase().endsWith(".csv")) {
      setFileError("الملف يجب أن يكون بصيغة CSV.");
      resetFileState();
      return;
    }

    if (f.size > 5 * 1024 * 1024) {
      setFileError("الحد الأقصى لحجم الملف هو 5 ميجابايت.");
      resetFileState();
      return;
    }

    setFileError("");
    setFile(f);

    try {
      const text = await f.text();
      let firstLine = text.split(/\r?\n/)[0] || "";
      firstLine = firstLine.replace(/^\uFEFF/, ""); // إزالة BOM لو موجود

      const delimiter = detectDelimiter(firstLine);
      const headers = firstLine
        .split(delimiter)
        .map((h) => h.replace(/^"|"$/g, "").trim())
        .filter(Boolean);

      setCsvHeaders(headers);

      if (headers.includes("phone_number")) {
        setNumberColumn("phone_number");
      } else if (headers.length > 0) {
        setNumberColumn(headers[0]);
      } else {
        setNumberColumn("phone_number");
      }
    } catch {
      setCsvHeaders([]);
      setNumberColumn("phone_number");
    }
  };

  const handleSendBroadcast = async () => {
    setSendError("");
    setSendSuccess("");

    if (!templateName.trim()) {
      setSendError("اسم قالب الواتساب مطلوب.");
      return;
    }

    if (!file) {
      setSendError("برجاء رفع ملف CSV يحتوي على عمود phone_number.");
      return;
    }

    let components = [];
    if (componentsRaw.trim()) {
      try {
        components = JSON.parse(componentsRaw.trim());
        if (!Array.isArray(components)) {
          throw new Error("not array");
        }
      } catch {
        setSendError(
          "الـ JSON غير صالح. يجب أن يكون مصفوفة JSON صحيحة مثل []."
        );
        return;
      }
    }

    try {
      setIsSending(true);
      setSendError("");
      setSendSuccess("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("templateName", templateName.trim());
      formData.append("language", language);
      if (batchName.trim()) formData.append("batchName", batchName.trim());
      formData.append("components", JSON.stringify(components));
      if (numberColumn) {
        formData.append("numberColumn", numberColumn);
      }

      const res = await axios.post(
        `${API_BASE}/send`,
        formData,
        getAuthConfig({ "Content-Type": "multipart/form-data" })
      );

      const { batchId } = res.data || {};
      setSendSuccess("تم جدولة البرودكاست بنجاح.");
      setSelectedBatchId(batchId || null);

      resetFileState();
      setBatchName("");
      setTemplateName("");
      setComponentsRaw("");
    } catch (err) {
      setSendError(
        err?.response?.data?.error ||
          "فشل بدء البرودكاست. تأكد من القالب وملف الـ CSV."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange =
    (setter) =>
    (e) => {
      setter(e.target.value);
      if (sendError) setSendError("");
    };

  const handleCsvDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange({ target: { files: [droppedFile] } });
    }
  };

  // --------------- UI ---------------

  return (
    <div
      className="p-4 sm:p-6 h-full overflow-y-auto bg-gradient-to-b from-emerald-50 via-gray-50 to-white"
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <Send className="w-4 h-4 text-emerald-600" />
              </span>
              رسائل البرودكاست
            </h2>
            <p className="text-sm text-gray-600 max-w-xl text-right">
              ارفع ملف CSV لعملائك، اختر قالب واتساب معتمد، وابعث آلاف الرسائل
              بشكل آمن مع تتبع كامل وحماية من إيقاف الرقم.
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end text-xs text-gray-500">
            <div className="inline-flex items-center gap-2 bg-white/80 border border-emerald-100 rounded-full px-3 py-1 shadow-sm">
              <Activity className="w-3 h-3 text-emerald-600" />
              <span>محرك مُقيَّد السرعة · تقريبًا 20 رسالة/ثانية</span>
            </div>
            <span className="mt-1">
              النشطة:{" "}
              <span className="font-medium text-emerald-700">
                {activeBatches.length}
              </span>{" "}
              · الإجمالي:{" "}
              <span className="font-medium text-gray-800">
                {batches.length}
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Composer */}
          <div className="lg:col-span-2 space-y-4">
            {/* Info banner */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex gap-3 shadow-sm">
              <div className="mt-0.5">
                <Radio className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-emerald-900">
                  برودكاست آمن لكل عميل على حدة
                </h3>
                <p className="text-xs text-emerald-700 mt-1">
                  كل عميل يستلم رسالة منفصلة، ولا يرى بقية المستلمين. الإرسال
                  يتم بمعدّل محسوب لحماية رقم الواتساب من البلوك والـ rate
                  limits.
                </p>
              </div>
            </div>

            {/* Campaign name */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
              <label className="block text-xs font-medium text-gray-700 text-right">
                اسم الحملة (داخلي)
              </label>
              <Input
                placeholder="عرض الجمعة السوداء - عملاء VIP"
                value={batchName}
                onChange={handleInputChange(setBatchName)}
                className="text-right"
              />
              <p className="text-[11px] text-gray-500 text-right">
                هذا الاسم لا يظهر للعميل، فقط لمساعدتك في تمييز الحملة في سجل
                البرودكاست.
              </p>
            </div>

            {/* Template */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1 text-right">
                    اسم قالب الواتساب
                  </label>
                  <Input
                    placeholder="promo_offer_v1"
                    value={templateName}
                    onChange={handleInputChange(setTemplateName)}
                    className="text-right font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-1 text-right">
                    يجب أن يطابق اسم قالب معتمد في حساب واتساب بيزنس الخاص بك
                    (الاسم بالضبط).
                  </p>
                </div>
                <div className="w-full sm:w-40">
                  <label className="block text-xs font-medium text-gray-700 mb-1 text-right">
                    اللغة
                  </label>
                  <select
                    value={language}
                    onChange={handleInputChange(setLanguage)}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-right"
                  >
                    <option value="ar">العربية</option>
                    <option value="en_US">الإنجليزية (أمريكي)</option>
                    <option value="en_GB">الإنجليزية (بريطاني)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 text-right">
                  مكوّنات القالب (JSON اختياري)
                </label>
                <Textarea
                  rows={3}
                  placeholder='مثال: [{"type":"body","parameters":[{"type":"text","text":"نادر"}]}]'
                  value={componentsRaw}
                  onChange={handleInputChange(setComponentsRaw)}
                  className="text-xs text-right font-mono"
                />
                <p className="text-[11px] text-gray-500 mt-1 text-right">
                  اترك الحقل فارغًا إذا لم يكن في القالب متغيّرات. يجب أن يكون
                  JSON بصيغة مصفوفة صحيحة.
                </p>
              </div>
            </div>

            {/* CSV UPLOAD */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-700 text-right">
                  ملف العملاء (CSV)
                </label>
                <span className="text-[11px] text-gray-500 text-right">
                  يجب أن يحتوي على عمود <code>phone_number</code>
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                id="csvInput"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Drag & Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={handleCsvDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
                  "bg-white hover:bg-gray-50 hover:border-emerald-500",
                  "flex flex-col items-center justify-center space-y-1"
                )}
              >
                <div className="relative">
                  <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2 transition-all" />
                </div>

                <p className="text-sm text-gray-700 font-medium">
                  {file ? file.name : "اضغط هنا أو اسحب ملف CSV لإرفاقه"}
                </p>

                <p className="text-[11px] text-gray-500">
                  CSV، بحد أقصى 5 ميجابايت — الأرقام المكررة أو غير الصالحة يتم
                  تنظيفها تلقائيًا (حسب منطق السيرفر).
                </p>
              </div>

              {fileError && (
                <p className="text-[11px] text-red-600 mt-1 text-right">
                  {fileError}
                </p>
              )}

              {csvHeaders.length > 0 && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1 text-right">
                    اختر عمود رقم الهاتف
                  </label>
                  <select
                    value={numberColumn}
                    onChange={handleInputChange(setNumberColumn)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 bg-white text-right"
                  >
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1 text-right">
                    الباك إند ما زال يعتمد على{" "}
                    <code className="font-mono">phone_number</code> كقيمة
                    افتراضية ما لم يتم تحديثه.
                  </p>
                </div>
              )}
            </div>

            {/* Actions + errors */}
            <div className="space-y-2">
              <Button
                onClick={handleSendBroadcast}
                disabled={isSending}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold shadow-sm",
                  "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                )}
                icon={Send}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري جدولة البرودكاست...
                  </>
                ) : (
                  "بدء إرسال البرودكاست"
                )}
              </Button>

              {sendError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2 justify-end">
                  <span>{sendError}</span>
                  <XCircle className="w-3 h-3 mt-0.5" />
                </div>
              )}
              {sendSuccess && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-start gap-2 justify-end">
                  <span>{sendSuccess}</span>
                  <CheckCircle2 className="w-3 h-3 mt-0.5" />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Batches & details */}
          <div className="lg:col-span-3 space-y-4">
            {/* Active batches */}
            <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  البرودكاست النشطة
                </h3>
                {loadingBatches && (
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    تحديث...
                  </span>
                )}
              </div>

              {batchesError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-2 justify-end">
                  <span>{batchesError}</span>
                  <XCircle className="w-3 h-3 mt-0.5" />
                </div>
              )}

              {activeBatches.length === 0 && (
                <p className="text-xs text-gray-500 text-right">
                  لا توجد برودكاست نشطة حاليًا. ابدأ واحدة جديدة من اليمين.
                </p>
              )}

              <div className="space-y-3">
                {activeBatches.map((batch) => {
                  const progress = calcProgress(batch);
                  const isSelected = selectedBatchId === batch._id;
                  return (
                    <button
                      id={`batch-${batch._id}`}
                      key={batch._id}
                      onClick={() => setSelectedBatchId(batch._id)}
                      className={cn(
                        "w-full text-right border rounded-xl p-3 flex flex-col gap-2 transition",
                        "hover:border-emerald-500 hover:bg-emerald-50/40",
                        isSelected && "border-emerald-600 bg-emerald-50/70"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {batch.name ||
                              `حملة ${batch._id.slice(-6)}`}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">
                            القالب:{" "}
                            <span className="font-mono">
                              {batch.templateName}
                            </span>{" "}
                            · {formatShortDate(batch.createdAt)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap",
                            statusColor(batch.status)
                          )}
                        >
                          {batch.status}
                        </span>
                      </div>

                      <div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                          <span>
                            {progress}% ·{" "}
                            {(batch.successCount || 0) +
                              (batch.failedCount || 0)}{" "}
                            / {batch.totalNumbers} مُعالَجة
                          </span>
                          <span>
                            ✅ {batch.successCount || 0} · ❌{" "}
                            {batch.failedCount || 0}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* History */}
            <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  آخر البرودكاست
                </h3>
              </div>

              {completedBatches.length === 0 && (
                <p className="text-xs text-gray-500 text-right">
                  لا توجد برودكاست مكتملة بعد.
                </p>
              )}

              {completedBatches.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[11px] text-gray-500 border-b">
                        <th className="py-2 text-right font-medium">
                          الحملة
                        </th>
                        <th className="py-2 text-right font-medium">
                          القالب
                        </th>
                        <th className="py-2 text-right font-medium">
                          المرسلة
                        </th>
                        <th className="py-2 text-right font-medium">
                          الفاشلة
                        </th>
                        <th className="py-2 text-right font-medium">
                          الإجمالي
                        </th>
                        <th className="py-2 text-right font-medium">
                          الحالة
                        </th>
                        <th className="py-2 text-right font-medium">
                          تاريخ الانتهاء
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedBatches.map((batch) => (
                        <tr
                          key={batch._id}
                          className={cn(
                            "border-b last:border-0 hover:bg-gray-50 cursor-pointer",
                            selectedBatchId === batch._id &&
                              "bg-emerald-50/60"
                          )}
                          onClick={() => setSelectedBatchId(batch._id)}
                        >
                          <td className="py-2 pl-2">
                            <div className="truncate max-w-[180px] text-right">
                              {batch.name ||
                                `حملة ${batch._id.slice(-6)}`}
                            </div>
                          </td>
                          <td className="py-2 pl-2 font-mono text-[11px] truncate max-w-[140px] text-right">
                            {batch.templateName}
                          </td>
                          <td className="py-2 pl-2 text-emerald-700 text-right">
                            {batch.successCount || 0}
                          </td>
                          <td className="py-2 pl-2 text-red-600 text-right">
                            {batch.failedCount || 0}
                          </td>
                          <td className="py-2 pl-2 text-right">
                            {batch.totalNumbers || 0}
                          </td>
                          <td className="py-2 pl-2 text-right">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px]",
                                statusColor(batch.status)
                              )}
                            >
                              {batch.status === "completed" ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : batch.status === "failed" ? (
                                <XCircle className="w-3 h-3" />
                              ) : null}
                              {batch.status}
                            </span>
                          </td>
                          <td className="py-2 pl-2 text-gray-500 text-right">
                            {batch.finishedAt
                              ? formatShortDate(batch.finishedAt)
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Details panel */}
            <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  تفاصيل البرودكاست
                </h3>
                {loadingBatchDetails && selectedBatchId && (
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    جارِ التحميل...
                  </span>
                )}
              </div>

              {batchDetailsError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 flex items-start gap-2 justify-end">
                  <span>{batchDetailsError}</span>
                  <XCircle className="w-3 h-3 mt-0.5" />
                </div>
              )}

              {!selectedBatch && !selectedBatchId && (
                <p className="text-xs text-gray-500 text-right">
                  اختر برودكاست من القائمة لعرض تفاصيله وإحصاءاته.
                </p>
              )}

              {selectedBatch && (
                <div className="space-y-3 text-xs text-gray-800">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500">الحملة</p>
                      <p className="font-medium">
                        {selectedBatch.name ||
                          `حملة ${selectedBatch._id.slice(-6)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500">القالب</p>
                      <p className="font-mono text-[11px]">
                        {selectedBatch.templateName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500">الحالة</p>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px]",
                          statusColor(selectedBatch.status)
                        )}
                      >
                        {selectedBatch.status === "completed" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : selectedBatch.status === "failed" ? (
                          <XCircle className="w-3 h-3" />
                        ) : null}
                        {selectedBatch.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500">الإجمالي</p>
                      <p className="font-semibold">
                        {selectedBatch.totalNumbers || 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500">المرسلة</p>
                      <p className="font-semibold text-emerald-700">
                        {selectedBatch.successCount || 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500">الفاشلة</p>
                      <p className="font-semibold text-red-600">
                        {selectedBatch.failedCount || 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500">في الانتظار</p>
                      <p className="font-semibold text-gray-700">
                        {selectedBatch.queuedCount || 0}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500">تاريخ الإنشاء</p>
                      <p>{formatDate(selectedBatch.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500">
                        تاريخ الانتهاء
                      </p>
                      <p>
                        {selectedBatch.finishedAt
                          ? formatDate(selectedBatch.finishedAt)
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-gray-500 text-right">
                    لاحقًا يمكنك إضافة سجل على مستوى كل رقم (تصدير الأرقام
                    الفاشلة، أسباب الفشل، إلخ) بدون ما تغيّر هذا التصميم.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BroadcastView;
