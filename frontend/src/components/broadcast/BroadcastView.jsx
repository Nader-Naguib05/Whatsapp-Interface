import React, { useState, useEffect } from "react";
import axios from "axios";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea"; // kept if you want to extend later
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

const API_BASE = "/api/broadcast"; // change to "/broadcast" if you mounted routes without /api

function formatDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleString();
}

function formatShortDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleDateString(undefined, {
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

const BroadcastView = () => {
  // Composer state
  const [templateName, setTemplateName] = useState("");
  const [language, setLanguage] = useState("en_US");
  const [componentsRaw, setComponentsRaw] = useState(""); // JSON string (optional)
  const [batchName, setBatchName] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  // Batches state
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchesError, setBatchesError] = useState("");

  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loadingBatchDetails, setLoadingBatchDetails] = useState(false);
  const [batchDetailsError, setBatchDetailsError] = useState("");

  // --------------- DATA FETCHING ---------------

  const fetchBatches = async () => {
    try {
      setLoadingBatches(true);
      setBatchesError("");
      const res = await axios.get(`${API_BASE}/batches`);
      setBatches(res.data || []);
    } catch (err) {
      setBatchesError(
        err?.response?.data?.error || "Failed to load broadcast history"
      );
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchBatchDetails = async (id) => {
    if (!id) return;
    try:
      setLoadingBatchDetails(true);
      setBatchDetailsError("");
      const res = await axios.get(`${API_BASE}/batches/${id}`);
      setSelectedBatch(res.data || null);
    } catch (err) {
      setBatchDetailsError(
        err?.response?.data?.error || "Failed to load batch details"
      );
    } finally {
      setLoadingBatchDetails(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    const interval = setInterval(fetchBatches, 5000); // polling every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchDetails(selectedBatchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatchId]);

  // --------------- HANDLERS ---------------

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }

    if (!f.name.toLowerCase().endsWith(".csv")) {
      setFileError("File must be a CSV");
      setFile(null);
      return;
    }

    // 5MB max (you can tweak it)
    if (f.size > 5 * 1024 * 1024) {
      setFileError("Max file size is 5MB");
      setFile(null);
      return;
    }

    setFileError("");
    setFile(f);
  };

  const handleSendBroadcast = async () => {
    if (!templateName.trim()) {
      setSendError("Template name is required");
      return;
    }

    if (!file) {
      setSendError("Upload a CSV file with phone_number column");
      return;
    }

    let components = [];
    if (componentsRaw.trim()) {
      try {
        components = JSON.parse(componentsRaw.trim());
        if (!Array.isArray(components)) {
          throw new Error("Components JSON must be an array");
        }
      } catch (err) {
        setSendError(
          "Invalid components JSON. It must be a valid JSON array ([])."
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

      const res = await axios.post(`${API_BASE}/send`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { batchId } = res.data || {};
      setSendSuccess("Broadcast queued successfully.");
      setSelectedBatchId(batchId || null);
      setFile(null);
      setBatchName("");
      setTemplateName("");
      setComponentsRaw("");

      // refresh list
      fetchBatches();
    } catch (err) {
      setSendError(
        err?.response?.data?.error ||
          "Failed to start broadcast. Check template & CSV."
      );
    } finally {
      setIsSending(false);
    }
  };

  const activeBatches = batches.filter(
    (b) => b.status === "queued" || b.status === "processing"
  );
  const completedBatches = batches.filter(
    (b) => b.status === "completed" || b.status === "failed"
  );

  // --------------- UI ---------------

  return (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Broadcast Messages
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload a CSV of customers, select a WhatsApp template, and send
              thousands of messages safely with full tracking.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
            <Activity className="w-4 h-4" />
            <span>20 msg/s rate-limited engine · Crash-safe batches</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Composer */}
          <div className="lg:col-span-2 space-y-4">
            {/* Info banner */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
              <div className="mt-0.5">
                <Radio className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900">
                  Safe, individual broadcasts
                </h3>
                <p className="text-xs text-green-700 mt-1">
                  Each contact receives a separate message. Recipients never see
                  each other, and delivery is throttled to protect your
                  WhatsApp number.
                </p>
              </div>
            </div>

            {/* Campaign name */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
              <label className="block text-xs font-medium text-gray-700">
                Campaign name (internal)
              </label>
              <Input
                placeholder="Black Friday - VIP customers"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
              />
            </div>

            {/* Template */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    WhatsApp template name
                  </label>
                  <Input
                    placeholder="promo_offer_v1"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Must match an approved template in your WhatsApp Business
                    account.
                  </p>
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="en_US">English (US)</option>
                    <option value="en_GB">English (UK)</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Template components (optional JSON)
                </label>
                <Textarea
                  rows={3}
                  placeholder='Example: [{"type":"body","parameters":[{"type":"text","text":"Nader"}]}]'
                  value={componentsRaw}
                  onChange={(e) => setComponentsRaw(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Leave empty if your template has no variables. This should be
                  a valid JSON array.
                </p>
              </div>
            </div>

            {/* CSV Upload */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-700">
                  Recipients CSV
                </label>
                <span className="text-[11px] text-gray-500">
                  Must contain a <code>phone_number</code> column
                </span>
              </div>

              <label
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition",
                  file
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 hover:border-green-500 hover:bg-gray-50"
                )}
              >
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-700">
                  {file
                    ? file.name
                    : "Click to upload or drop your CSV file here"}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  CSV, max 5MB. Duplicates and invalid numbers are cleaned
                  automatically.
                </p>
              </label>

              {fileError && (
                <p className="text-[11px] text-red-600 mt-1">{fileError}</p>
              )}
            </div>

            {/* Actions + errors */}
            <div className="space-y-2">
              <Button
                onClick={handleSendBroadcast}
                disabled={isSending}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 py-3 rounded-xl font-semibold"
                icon={Send}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Queuing broadcast...
                  </>
                ) : (
                  "Start Broadcast"
                )}
              </Button>

              {sendError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {sendError}
                </div>
              )}
              {sendSuccess && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  {sendSuccess}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Batches & details */}
          <div className="lg:col-span-3 space-y-4">
            {/* Active batches */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-600" />
                  Live broadcasts
                </h3>
                {loadingBatches && (
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Updating...
                  </span>
                )}
              </div>

              {batchesError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                  {batchesError}
                </div>
              )}

              {activeBatches.length === 0 && (
                <p className="text-xs text-gray-500">
                  No active broadcasts. Start a new one from the left.
                </p>
              )}

              <div className="space-y-3">
                {activeBatches.map((batch) => {
                  const progress = calcProgress(batch);
                  const isSelected = selectedBatchId === batch._id;
                  return (
                    <button
                      key={batch._id}
                      onClick={() => setSelectedBatchId(batch._id)}
                      className={cn(
                        "w-full text-left border rounded-lg p-3 flex flex-col gap-2 hover:border-green-500 transition",
                        isSelected && "border-green-600 bg-green-50/40"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {batch.name || `Batch ${batch._id.slice(-6)}`}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            Template:{" "}
                            <span className="font-mono">
                              {batch.templateName}
                            </span>{" "}
                            · {formatShortDate(batch.createdAt)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-[11px] px-2 py-0.5 rounded-full border",
                            statusColor(batch.status)
                          )}
                        >
                          {batch.status}
                        </span>
                      </div>

                      <div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                          <span>
                            {progress}% ·{" "}
                            {(batch.successCount || 0) +
                              (batch.failedCount || 0)}{" "}
                            / {batch.totalNumbers} processed
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
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  Recent broadcasts
                </h3>
              </div>

              {completedBatches.length === 0 && (
                <p className="text-xs text-gray-500">
                  No completed broadcasts yet.
                </p>
              )}

              {completedBatches.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[11px] text-gray-500 border-b">
                        <th className="py-2 text-left font-medium">
                          Campaign
                        </th>
                        <th className="py-2 text-left font-medium">Template</th>
                        <th className="py-2 text-left font-medium">Sent</th>
                        <th className="py-2 text-left font-medium">Failed</th>
                        <th className="py-2 text-left font-medium">Total</th>
                        <th className="py-2 text-left font-medium">Status</th>
                        <th className="py-2 text-left font-medium">Finished</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedBatches.slice(0, 10).map((batch) => (
                        <tr
                          key={batch._id}
                          className={cn(
                            "border-b last:border-0 hover:bg-gray-50 cursor-pointer",
                            selectedBatchId === batch._id && "bg-green-50/40"
                          )}
                          onClick={() => setSelectedBatchId(batch._id)}
                        >
                          <td className="py-2 pr-2">
                            <div className="truncate max-w-[160px]">
                              {batch.name || `Batch ${batch._id.slice(-6)}`}
                            </div>
                          </td>
                          <td className="py-2 pr-2 font-mono text-[11px]">
                            {batch.templateName}
                          </td>
                          <td className="py-2 pr-2 text-emerald-700">
                            {batch.successCount || 0}
                          </td>
                          <td className="py-2 pr-2 text-red-600">
                            {batch.failedCount || 0}
                          </td>
                          <td className="py-2 pr-2">
                            {batch.totalNumbers || 0}
                          </td>
                          <td className="py-2 pr-2">
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
                          <td className="py-2 pr-2 text-gray-500">
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
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Batch details
                </h3>
                {loadingBatchDetails && selectedBatchId && (
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading...
                  </span>
                )}
              </div>

              {batchDetailsError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
                  {batchDetailsError}
                </div>
              )}

              {!selectedBatch && !selectedBatchId && (
                <p className="text-xs text-gray-500">
                  Select a broadcast from the list to inspect its stats.
                </p>
              )}

              {selectedBatch && (
                <div className="space-y-3 text-xs text-gray-800">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="text-[11px] text-gray-500">Campaign</p>
                      <p className="font-medium">
                        {selectedBatch.name ||
                          `Batch ${selectedBatch._id.slice(-6)}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Template</p>
                      <p className="font-mono text-[11px]">
                        {selectedBatch.templateName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Status</p>
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
                    <div>
                      <p className="text-[11px] text-gray-500">Total</p>
                      <p className="font-semibold">
                        {selectedBatch.totalNumbers || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Sent</p>
                      <p className="font-semibold text-emerald-700">
                        {selectedBatch.successCount || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Failed</p>
                      <p className="font-semibold text-red-600">
                        {selectedBatch.failedCount || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Queued</p>
                      <p className="font-semibold text-gray-700">
                        {selectedBatch.queuedCount || 0}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <p className="text-[11px] text-gray-500">Created at</p>
                      <p>{formatDate(selectedBatch.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">Finished at</p>
                      <p>
                        {selectedBatch.finishedAt
                          ? formatDate(selectedBatch.finishedAt)
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Placeholder for future logs / errors list */}
                  <div className="mt-2 text-[11px] text-gray-500">
                    Detailed per-recipient logs can be added here later (e.g.
                    export failed numbers, see error reasons).
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
