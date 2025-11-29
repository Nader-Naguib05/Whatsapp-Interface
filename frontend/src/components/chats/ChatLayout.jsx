import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  Check,
  CheckCheck,
  AlertCircle,
  FileText,
} from "lucide-react";

import "../../styles/wa-chat.css";

/* ---------------------------------------------------
   UTILS
--------------------------------------------------- */
function formatTime(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();

  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const msgMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays =
    (todayMidnight.getTime() - msgMidnight.getTime()) /
    (1000 * 60 * 60 * 24);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return d.toLocaleDateString();
}

function getMessageKey(msg, idx) {
  return msg.clientId || msg._id || msg.id || idx;
}

/* ---------------------------------------------------
   MESSAGE BUBBLE
--------------------------------------------------- */
function MessageBubble({ msg, onRetryMessage }) {
  const senderType = msg.senderType || msg.sender || msg.role;
  const timestamp = msg.timestamp || msg.time || msg.createdAt;

  const mediaType = msg.mediaType || "";
  const mediaUrl = msg.mediaUrl || null;
  const text = msg.text || msg.body || "";
  const status = msg.status || "sent";

  const isOutgoing =
    senderType === "agent" ||
    msg.from === "business" ||
    msg.fromMe === true;

  const isSending = status === "sending" || status.startsWith("uploading-");
  const isFailed = status === "failed";

  const isImage = mediaType.startsWith("image/");
  const isVideo = mediaType.startsWith("video/");
  const isAudio = mediaType.startsWith("audio/");
  const isDocument =
    mediaUrl && !isImage && !isVideo && !isAudio;

  const fullTimestampTitle = timestamp
    ? new Date(timestamp).toLocaleString()
    : "";

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
            : "wa-message-bubble--incoming")
        }
      >
        {/* MEDIA */}
        {mediaUrl && (
          <div className="wa-message-media">
            {isSending && (
              <div className="wa-media-loading-overlay">
                <div className="wa-loader"></div>
              </div>
            )}

            {isImage && (
              <img
                src={mediaUrl}
                className="wa-media-img"
                draggable={false}
              />
            )}

            {isVideo && (
              <video
                src={mediaUrl}
                controls
                className="wa-media-video"
                draggable={false}
              ></video>
            )}

            {isAudio && (
              <audio
                controls
                src={mediaUrl}
                className="wa-media-audio"
              />
            )}

            {isDocument && (
              <a
                href={mediaUrl}
                target="_blank"
                rel="noreferrer"
                className="wa-media-file-card"
              >
                <FileText size={22} />
                <span
                  style={{
                    fontSize: 13,
                    marginLeft: 8,
                  }}
                >
                  File
                </span>
              </a>
            )}
          </div>
        )}

        {/* TEXT */}
        {text && <div className="wa-message-text">{text}</div>}

        {/* META */}
        <div
          className="wa-message-meta"
          title={fullTimestampTitle}
        >
          <span className="wa-message-time">
            {formatTime(timestamp)}
          </span>

          {isOutgoing && (
            <span className="wa-message-status">
              {status === "sending" && (
                <span className="wa-sending-dot"></span>
              )}
              {status === "sent" && <Check size={14} />}
              {status === "delivered" && (
                <CheckCheck size={14} />
              )}
              {status === "read" && (
                <CheckCheck
                  size={14}
                  className="wa-message-status--read"
                />
              )}
              {isFailed && (
                <button
                  className="wa-message-failed-btn"
                  onClick={() => onRetryMessage?.(msg)}
                >
                  <AlertCircle size={14} />
                </button>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   MAIN LAYOUT
--------------------------------------------------- */
const ChatLayout = ({
  conversations = [],
  activeConversationId,

  onSelectConversation,
  messages = [],

  composerValue,
  setComposerValue,
  onSendMessage,

  onAttachClick,
  onEmojiClick,

  onRetryMessage,

  hasMoreMessages = false,
  isLoadingMore = false,
  onLoadOlderMessages,

  onSearchChange,

  isCustomerTyping = false,
  customerTypingText = "Typing…",

  contactName,
  contactPhone,
  contactStatus,
  isInContacts = false,

  onAddToContacts,
}) => {
  const messagesRef = useRef(null);
  const bottomRef = useRef(null);

  const initialScrollDoneRef = useRef(false);
  const [localSearch, setLocalSearch] = useState("");

  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const menuRef = useRef(null);

  /* ---------------------------------------------------
     CLOSE MENU WHEN CLICKING OUTSIDE
  --------------------------------------------------- */
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsHeaderMenuOpen(false);
      }
    }

    if (isHeaderMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, [isHeaderMenuOpen]);

  /* ---------------------------------------------------
     SCROLL ENGINE — WhatsApp-grade
  --------------------------------------------------- */

  const scrollToBottom = useCallback((behavior = "auto") => {
    bottomRef.current?.scrollIntoView({
      behavior,
      block: "end",
    });
  }, []);

  /* -------- Initial scroll when switching conversations -------- */
  useEffect(() => {
    if (!messages.length) return;

    initialScrollDoneRef.current = false;

    const forceScroll = () => {
      scrollToBottom("auto");
      initialScrollDoneRef.current = true;
    };

    requestAnimationFrame(forceScroll);
    setTimeout(forceScroll, 40);
    setTimeout(forceScroll, 120);
  }, [activeConversationId, messages.length, scrollToBottom]);

  /* -------- Auto-scroll on new messages -------- */
  useEffect(() => {
    if (!initialScrollDoneRef.current) return;

    const el = messagesRef.current;
    if (!el) return;

    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <
      150;

    if (nearBottom) {
      scrollToBottom("smooth");
    }
  }, [messages, scrollToBottom]);

  /* -------- Load older messages when scrolling up -------- */
  const handleScroll = () => {
    const el = messagesRef.current;
    if (!el) return;

    if (el.scrollTop <= 40) {
      if (!isLoadingMore && hasMoreMessages) {
        onLoadOlderMessages?.();
      }
    }
  };

  /* -------- Fix layout shifts (images, separators) -------- */
  useEffect(() => {
    if (!messagesRef.current) return;

    const el = messagesRef.current;

    const ro = new ResizeObserver(() => {
      if (!initialScrollDoneRef.current) return;

      const nearBottom =
        el.scrollHeight -
          el.scrollTop -
          el.clientHeight <
        150;

      if (nearBottom) {
        scrollToBottom("smooth");
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  /* ---------------------------------------------------
     GROUP BY DAY
  --------------------------------------------------- */
  const groupedByDay = useMemo(() => {
    const result = [];
    let currentDay = null;

    messages.forEach((msg, idx) => {
      const ts = msg.timestamp || msg.time || msg.createdAt;
      const dayLabel = formatDayLabel(ts);

      const baseId = getMessageKey(msg, idx);

      if (dayLabel !== currentDay) {
        currentDay = dayLabel;
        result.push({
          type: "day",
          id: `day-${dayLabel}-${baseId}`,
          label: dayLabel,
        });
      }

      result.push({
        type: "msg",
        id: `msg-${baseId}`,
        data: { ...msg, timestamp: ts },
      });
    });

    return result;
  }, [messages]);

  /* ---------------------------------------------------
     SEARCH
  --------------------------------------------------- */
  const handleSearchChange = (e) => {
    const v = e.target.value;
    setLocalSearch(v);
    onSearchChange?.(v);
  };

  /* ---------------------------------------------------
     SEND MESSAGE
  --------------------------------------------------- */
  const handleSend = () => {
    const trimmed = composerValue?.trim();
    if (!trimmed) return;

    onSendMessage(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeConversation =
    conversations.find(
      (c) =>
        String(c._id || c.id) ===
        String(activeConversationId)
    ) || null;

  const statusBadge =
    contactStatus === "online"
      ? "Online"
      : contactStatus === "offline"
      ? "Offline"
      : null;

  return (
    <div className="wa-shell">
      {/* SIDEBAR */}
      <aside className="wa-sidebar">
        <div className="wa-sidebar-header">
          <h1 className="wa-app-title">Inbox</h1>
        </div>

        <div className="wa-search-wrapper">
          <Search className="wa-search-icon" size={16} />
          <input
            type="text"
            className="wa-search-input"
            placeholder="Search"
            value={localSearch}
            onChange={handleSearchChange}
          />
        </div>

        <div className="wa-conversation-list">
          {conversations.map((conv) => {
            const convId = conv._id || conv.id;
            const name =
              conv.name ||
              conv.displayName ||
              conv.phone ||
              "Unknown";
            const lastMsg = conv.lastMessage || "";
            const lastAt =
              conv.lastMessageAt ||
              conv.updatedAt ||
              conv.createdAt;

            const unread = conv.unread || conv.unreadCount || 0;

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
                onClick={() => onSelectConversation(convId)}
              >
                <div className="wa-avatar">{name[0]}</div>

                <div className="wa-conversation-main">
                  <div className="wa-conversation-top-row">
                    <span className="wa-conversation-name">
                      {name}
                    </span>
                    <span className="wa-conversation-time">
                      {formatTime(lastAt)}
                    </span>
                  </div>

                  <div className="wa-conversation-bottom-row">
                    <span className="wa-conversation-preview">
                      {lastMsg}
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

      {/* CHAT AREA */}
      <section className="wa-chat-area">
        {activeConversation ? (
          <>
            {/* HEADER */}
            <header className="wa-chat-header">
              <div className="wa-chat-header-left">
                <div className="wa-avatar wa-avatar--lg">
                  {contactName?.[0] ||
                    activeConversation.name?.[0]}
                </div>
                <div>
                  <div className="wa-chat-title">
                    {contactName ||
                      activeConversation.name}
                  </div>
                  <div className="wa-chat-subtitle">
                    {contactPhone}
                    {statusBadge && (
                      <span className="wa-presence-badge">
                        • {statusBadge}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="wa-chat-header-actions">
                <div
                  className="wa-header-menu-wrapper"
                  style={{ position: "relative" }}
                  ref={menuRef}
                >
                  <button
                    className="wa-icon-button"
                    onClick={() =>
                      setIsHeaderMenuOpen((o) => !o)
                    }
                  >
                    <MoreVertical size={18} />
                  </button>

                  {isHeaderMenuOpen && (
                    <div
                      className="wa-header-menu"
                      style={{
                        position: "absolute",
                        top: "110%",
                        right: 0,
                        background: "white",
                        borderRadius: 8,
                        padding: "6px 0",
                        boxShadow:
                          "0 4px 10px rgba(0,0,0,0.15)",
                        zIndex: 50,
                        width: 160,
                        animation:
                          "fadeScaleIn 110ms ease-out",
                      }}
                    >
                      {!isInContacts ? (
                        <button
                          className="wa-header-menu-item"
                          style={{
                            textAlign: "left",
                            width: "100%",
                            padding: "8px 14px",
                            fontSize: 13,
                          }}
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            onAddToContacts?.({
                              id: activeConversationId,
                              name:
                                contactName ||
                                activeConversation.name,
                              phone:
                                contactPhone ||
                                activeConversation.phone,
                            });
                          }}
                        >
                          Add to contacts
                        </button>
                      ) : (
                        <button
                          className="wa-header-menu-item"
                          style={{
                            textAlign: "left",
                            width: "100%",
                            padding: "8px 14px",
                            fontSize: 13,
                          }}
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            navigator.clipboard.writeText(
                              contactPhone ||
                                activeConversation.phone
                            );
                          }}
                        >
                          Copy number
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* MESSAGES */}
            <div
              className="wa-chat-messages"
              ref={messagesRef}
              onScroll={handleScroll}
            >
              {isLoadingMore && hasMoreMessages && (
                <div className="wa-loading-more">
                  Loading...
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
                    onRetryMessage={onRetryMessage}
                  />
                )
              )}

              {isCustomerTyping && (
                <div className="wa-typing-indicator">
                  <div className="wa-typing-dots-slow">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span>{customerTypingText}</span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* COMPOSER */}
            <footer className="wa-chat-composer">
              <button
                className="wa-icon-button"
                onClick={onAttachClick}
              >
                <Paperclip size={18} />
              </button>

              <button
                className="wa-icon-button"
                onClick={onEmojiClick}
              >
                <Smile size={18} />
              </button>

              <textarea
                className="wa-composer-input"
                placeholder="Type a message"
                value={composerValue}
                rows={1}
                onChange={(e) =>
                  setComposerValue(e.target.value)
                }
                onKeyDown={handleKeyDown}
              />

              <button
                className={
                  "wa-send-button" +
                  (composerValue?.trim()
                    ? " wa-send-button--active"
                    : "")
                }
                onClick={handleSend}
                disabled={!composerValue?.trim()}
              >
                <Send size={18} />
              </button>
            </footer>
          </>
        ) : (
          <div className="wa-empty-state">
            <h2>Select a conversation</h2>
            <p>Choose a customer to begin.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ChatLayout;
