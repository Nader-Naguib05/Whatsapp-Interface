import React, { useState } from "react";
import Button from "../ui/Button";
import Textarea from "../ui/Textarea";
import Input from "../ui/Input";
import { Radio, Paperclip, Send } from "lucide-react";
import { cn } from "../../utils/cn";

const BroadcastView = () => {
  const [segment, setSegment] = useState("all");
  const [template, setTemplate] = useState("");
  const [content, setContent] = useState("");
  const [attachMedia, setAttachMedia] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");

  const handleSend = () => {
    if (!content.trim()) return;
    console.log("Broadcast send:", { segment, template, content, attachMedia });
    setContent("");
    setTemplate("");
    setAttachMedia(false);
  };

  const handleSchedule = () => {
    if (!content.trim() || !scheduleTime) return;
    console.log("Broadcast schedule:", { segment, template, content, scheduleTime });
    setIsScheduling(false);
    setScheduleTime("");
  };

  return (
    <div className="p-6 bg-white h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Broadcast Messages</h2>

      <div className="max-w-3xl space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Radio className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">
                Send messages to multiple customers at once
              </h3>
              <p className="text-sm text-green-700">
                Each broadcast is sent individually — recipients won’t see each other.
              </p>
            </div>
          </div>
        </div>

        {/* Recipient Segment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Recipients
          </label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Contacts (1,234)</option>
            <option value="active">Active Customers (856)</option>
            <option value="leads">New Leads (234)</option>
            <option value="vip">VIP Customers (144)</option>
          </select>
        </div>

        {/* Template */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Template
          </label>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
          >
            <option value="">Select a template...</option>
            <option value="welcome">Welcome Message</option>
            <option value="order_confirmation">Order Confirmation</option>
            <option value="promotion">Promotion Announcement</option>
            <option value="custom">Custom Message</option>
          </select>
          <p className="text-xs text-gray-500">
            Templates must be pre-approved in your WhatsApp Business Account.
          </p>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Content
          </label>
          <Textarea
            rows={6}
            placeholder="Type your broadcast message here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>Max 1,024 characters</span>
            <span>{content.length} / 1024</span>
          </div>
        </div>

        {/* Media */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Attach Media (Optional)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={attachMedia}
                onChange={(e) => setAttachMedia(e.target.checked)}
              />
              Enable attachment
            </label>
          </div>

          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer",
              attachMedia ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-green-500"
            )}
          >
            <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              {attachMedia ? "Drop or select a file (not wired yet)" : "Enable attachments to upload media"}
            </p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 5MB</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <Button
            onClick={handleSend}
            disabled={!content.trim()}
            className="flex-1 bg-green-500 text-white hover:bg-green-600 justify-center py-3"
            icon={Send}
          >
            Send Broadcast
          </Button>

          <Button
            type="button"
            className="px-6 py-3 border border-gray-300 hover:bg-gray-50"
            onClick={() => setIsScheduling(true)}
          >
            Schedule
          </Button>
        </div>

        {isScheduling && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border rounded-lg p-3 bg-gray-50">
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <Button
              onClick={handleSchedule}
              disabled={!content.trim() || !scheduleTime}
              className="bg-green-500 text-white hover:bg-green-600 px-4 py-2"
            >
              Confirm Schedule
            </Button>

            <button
              className="text-sm text-gray-500 hover:text-gray-700"
              onClick={() => {
                setIsScheduling(false);
                setScheduleTime("");
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BroadcastView;
