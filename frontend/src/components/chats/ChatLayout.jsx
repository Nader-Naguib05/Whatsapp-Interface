// src/components/chats/ChatLayout.jsx
import React, { useEffect, useRef } from "react";
import {
  Search,
  MoreVertical,
  Phone,
  Paperclip,
  Smile,
  Send,
  Check,
  CheckCheck,
} from "lucide-react";

import "../../styles/wa-chat.css";

function formatTime(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";

  const today = new Date();

  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const msgMidnight = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  );

  const diffDays =
    (todayMidnight.getTime() -
      msgMidnight.getTime()) /
    (1000 * 60 * 60 * 24);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return d.toLocaleDateString();
}

function MessageBubble({ msg }) {
  const senderType =
    msg.senderType || msg.sender || msg.role;
  const timestamp =
    msg.timestamp || msg.time || msg.createdAt;

  const isOutgoing =
    senderType === "agent" ||
    senderType === "business" ||
    msg.from === "business" ||
    msg.fromMe === true;

  const status = msg.status;
  const text = msg.text ?? msg.body ?? "";

  if (!text) return null;

  return (
    <div
      className={
        "wa-message-row " +
        (isOutgoing
          ? "wa-message-row--outgoing"
          : "wa-message-row--incoming")
      }
    >
      <div
        className={
          "wa-message-bubble " +
          (isOutgoing
            ? "wa-message-bubble--outgoing"
            : "wa-message-bubble--incoming") +
          (status === "sending"
            ? " wa-message-bubble--sending"
            : "")
        }
      >
        <div className="wa-message-text">
          {text}
        </div>
        <div className="wa-message-meta">
          <span className="wa-message-time">
            {formatTime(timestamp)}
          </span>
          {isOutgoing && (
            <span className="wa-message-status">
              {status === "sending" && (
                <span className="wa-sending-dot" />
              )}
              {status === "sent" && (
                <Check size={14} />
              )}
              {status === "delivered" && (
                <CheckCheck size={14} />
              )}
              {status === "read" && (
                <CheckCheck
                  size={14}
                  className="wa-message-status--read"
                />
              )}
              {status === "failed" && (
                <span className="wa-message-failed">
                  !
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const ChatLayout = ({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  messages = [],
  onSendMessage,
  composerValue,
  setComposerValue,
  onAttachClick,
  contactName,
  contactPhone,
  onEmojiClick,
  hasMoreMessages = false,
  isLoadingMore = false,
  onLoadOlderMessages,
}) => {
  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const messagesRef = useRef(null);

  // auto-scroll to bottom when messages change (only for new ones)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const activeConversation =
    conversations.find(
      (c) =>
        String(c._id || c.id) ===
        (activeConversationId != null
          ? String(activeConversationId)
          : activeConversationId)
    ) || null;

  const handleSend = () => {
    const trimmed = (composerValue || "").trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleScroll = () => {
    const el = messagesRef.current;
    if (!el || !onLoadOlderMessages) return;

    // near the top
    if (el.scrollTop <= 40) {
      if (!isLoadingMore && hasMoreMessages) {
        onLoadOlderMessages();
      }
    }
  };

  // group messages by day
  const groupedByDay = [];
  let currentDay = null;

  (messages || []).forEach((msg, idx) => {
    const timestamp =
      msg.timestamp || msg.time || msg.createdAt;
    const dayLabel = formatDayLabel(timestamp);

    const baseId =
      msg.clientId ||
      msg.id ||
      msg._id ||
      msg.msgId ||
      idx;

    if (dayLabel && dayLabel !== currentDay) {
      currentDay = dayLabel;
      groupedByDay.push({
        type: "day",
        label: dayLabel,
        id: `day-${dayLabel}-${baseId}`,
      });
    }

    groupedByDay.push({
      type: "msg",
      data: { ...msg, timestamp },
      id: `msg-${baseId}`,
    });
  });

  return (
    <div className="wa-shell">
      {/* LEFT */}
      <aside className="wa-sidebar">
        <div className="wa-sidebar-header">
          <h1 className="wa-app-title">Inbox</h1>
        </div>

        <div className="wa-search-wrapper">
          <Search
            className="wa-search-icon"
            size={16}
          />
          <input
            type="text"
            placeholder="Search conversations"
            className="wa-search-input"
            onChange={() => {}}
          />
        </div>

        <div
          className="wa-conversation-list"
          ref={listRef}
        >
          {conversations.map((conv) => {
            const convId = conv._id || conv.id;
            const displayName =
              conv.name ||
              conv.displayName ||
              conv.phone ||
              "Unknown";
            const lastMessagePreview =
              conv.lastMessage || "";
            const lastMessageAt =
              conv.lastMessageAt ||
              conv.updatedAt ||
              conv.createdAt;
            const unread =
              conv.unreadCount !== undefined
                ? conv.unreadCount
                : conv.unread || 0;

            return (
              <button
                key={convId}
                className={
                  "wa-conversation-item" +
                  (String(convId) ===
                  String(activeConversationId)
                    ? " wa-conversation-item--active"
                    : "")
                }
                onClick={() =>
                  onSelectConversation(convId)
                }
              >
                <div className="wa-avatar">
                  {conv.initials ||
                    displayName?.[0] ||
                    conv.phone?.[0] ||
                    "?"}
                </div>
                <div className="wa-conversation-main">
                  <div className="wa-conversation-top-row">
                    <span className="wa-conversation-name">
                      {displayName}
                    </span>
                    <span className="wa-conversation-time">
                      {formatTime(lastMessageAt)}
                    </span>
                  </div>
                  <div className="wa-conversation-bottom-row">
                    <span className="wa-conversation-preview">
                      {lastMessagePreview ||
                        "No messages yet"}
                    </span>
                    {unread > 0 && (
                      <span className="wa-unread-badge">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* RIGHT */}
      <section className="wa-chat-area">
        {activeConversation ? (
          <>
            <header className="wa-chat-header">
              <div className="wa-chat-header-left">
                <div className="wa-avatar wa-avatar--lg">
                  {contactName?.[0] ||
                    activeConversation.name?.[0] ||
                    activeConversation.displayName?.[0] ||
                    activeConversation.phone?.[0] ||
                    "?"}
                </div>
                <div>
                  <div className="wa-chat-title">
                    {contactName ||
                      activeConversation.name ||
                      activeConversation.displayName ||
                      activeConversation.phone}
                  </div>
                  <div className="wa-chat-subtitle">
                    {contactPhone ||
                      activeConversation.phone}
                  </div>
                </div>
              </div>
              <div className="wa-chat-header-actions">
                <button
                  className="wa-icon-button"
                  title="Call"
                >
                  <Phone size={18} />
                </button>
                <button
                  className="wa-icon-button"
                  title="More"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </header>

            <div
              className="wa-chat-messages"
              ref={messagesRef}
              onScroll={handleScroll}
            >
              {isLoadingMore && hasMoreMessages && (
                <div className="wa-loading-more">
                  Loading older messages...
                </div>
              )}

              {groupedByDay.map((item) =>
                item.type === "day" ? (
                  <div
                    key={item.id}
                    className="wa-day-separator"
                  >
                    <span>{item.label}</span>
                  </div>
                ) : (
                  <MessageBubble
                    key={item.id}
                    msg={item.data}
                  />
                )
              )}
              <div ref={bottomRef} />
            </div>

            <footer className="wa-chat-composer">
              <button
                className="wa-icon-button"
                onClick={onAttachClick}
                title="Attach file"
              >
                <Paperclip size={18} />
              </button>

              <button
                className="wa-icon-button"
                onClick={onEmojiClick}
                title="Emoji"
              >
                <Smile size={18} />
              </button>

              <textarea
                className="wa-composer-input"
                placeholder="Type a message"
                value={composerValue}
                onChange={(e) =>
                  setComposerValue(e.target.value)
                }
                onKeyDown={handleKeyDown}
                rows={1}
              />

              <button
                className={
                  "wa-send-button" +
                  (composerValue &&
                  composerValue.trim()
                    ? " wa-send-button--active"
                    : "")
                }
                onClick={handleSend}
                disabled={
                  !composerValue || !composerValue.trim()
                }
                title="Send"
              >
                <Send size={18} />
              </button>
            </footer>
          </>
        ) : (
          <div className="wa-empty-state">
            <h2>Select a conversation</h2>
            <p>
              Choose a customer from the left to start
              messaging.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ChatLayout;
