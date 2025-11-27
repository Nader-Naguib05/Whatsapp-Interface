// src/components/chats/ChatLayout.jsx

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    Search,
    MoreVertical,
    Phone,
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
    const msgMidnight = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate()
    );

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
   MESSAGE BUBBLE — Now perfectly aligned with CSS
--------------------------------------------------- */
function MessageBubble({ msg, onRetryMessage }) {
    const senderType = msg.senderType || msg.sender || msg.role;
    const timestamp =
        msg.timestamp || msg.time || msg.createdAt || msg.sentAt;

    const mediaType = msg.mediaType || "";
    const mediaUrl = msg.mediaUrl || null;
    const fileName = msg.fileName || msg.filename || "Attachment";

    const text = msg.text || msg.body || "";
    const status = msg.status || "sent";

    const isOutgoing =
        senderType === "agent" ||
        msg.from === "business" ||
        msg.fromMe === true;

    const isSending =
        status === "sending" || status.startsWith("uploading-");
    const isFailed = status === "failed";

    const isImage = mediaType === "image" || mediaType.startsWith("image/");
    const isVideo = mediaType === "video" || mediaType.startsWith("video/");
    const isAudio = mediaType === "audio" || mediaType.startsWith("audio/");
    const isDocument = mediaUrl && !isImage && !isVideo && !isAudio;

    const handleRetry = () => {
        if (isFailed && onRetryMessage) onRetryMessage(msg);
    };

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
                                alt="image"
                                className="wa-media-img"
                                draggable={false}
                                loading="lazy"
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
                                <div className="wa-media-file-info">
                                    <span className="wa-media-file-name">
                                        {fileName}
                                    </span>
                                    <span className="wa-media-file-size">
                                        Tap to download
                                    </span>
                                </div>
                            </a>
                        )}
                    </div>
                )}

                {/* TEXT CONTENT */}
                {text && <div className="wa-message-text">{text}</div>}

                {/* META (Time + Status) */}
                <div className="wa-message-meta">
                    <span className="wa-message-time">
                        {formatTime(timestamp)}
                    </span>

                    {isOutgoing && (
                        <span className="wa-message-status">
                            {status.startsWith("uploading-") && (
                                <span className="wa-uploading-text">
                                    {status.replace("uploading-", "")}%
                                </span>
                            )}

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
                                    onClick={handleRetry}
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
    customerTypingText = "Typing...",

    contactName,
    contactPhone,
    contactStatus, // "online" | "offline"

    onAddToContacts,
}) => {
    const messagesRef = useRef(null);
    const bottomRef = useRef(null);
    const lastMessageKeyRef = useRef(null);
    const initialScrollDoneRef = useRef(false);

    const [localSearch, setLocalSearch] = useState("");
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

    /* ---------------------------------------------------
       SCROLL BEHAVIOR
    --------------------------------------------------- */
    useEffect(() => {
        if (!messages || messages.length === 0) return;

        const lastMsg = messages[messages.length - 1] || {};
        const lastKey = getMessageKey(lastMsg, messages.length - 1);
        const container = messagesRef.current;

        if (!initialScrollDoneRef.current) {
            bottomRef.current?.scrollIntoView({ behavior: "auto" });
            initialScrollDoneRef.current = true;
            lastMessageKeyRef.current = lastKey;
            return;
        }

        const prevKey = lastMessageKeyRef.current;
        if (lastKey && lastKey !== prevKey) {
            const nearBottom =
                container.scrollHeight -
                    container.scrollTop -
                    container.clientHeight <
                160;

            if (nearBottom) {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }
            lastMessageKeyRef.current = lastKey;
        }
    }, [messages]);

    /* ---------------------------------------------------
       GROUP BY DAY
    --------------------------------------------------- */
    const groupedByDay = useMemo(() => {
        const result = [];
        let currentDay = null;

        messages.forEach((msg, idx) => {
            const ts =
                msg.timestamp || msg.time || msg.createdAt;
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
       SEND MSG
    --------------------------------------------------- */
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

    /* ---------------------------------------------------
       LOAD PREVIOUS MESSAGES
    --------------------------------------------------- */
    const handleScroll = () => {
        const el = messagesRef.current;
        if (!el) return;

        if (el.scrollTop <= 40) {
            if (!isLoadingMore && hasMoreMessages) {
                onLoadOlderMessages?.();
            }
        }
    };

    /* ---------------------------------------------------
       CURRENT CONVERSATION
    --------------------------------------------------- */
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

                {/* SEARCH */}
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

                {/* CONVERSATIONS */}
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

                        const unread = conv.unreadCount || 0;

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
                                    {name[0]}
                                </div>

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
                                                {unread > 99
                                                    ? "99+"
                                                    : unread}
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
                                <button className="wa-icon-button">
                                    <Phone size={18} />
                                </button>

                                <div className="wa-header-menu-wrapper">
                                    <button
                                        type="button"
                                        className="wa-icon-button"
                                        onClick={() =>
                                            setIsHeaderMenuOpen(
                                                (o) => !o
                                            )
                                        }
                                    >
                                        <MoreVertical size={18} />
                                    </button>

                                    {isHeaderMenuOpen && (
                                        <div className="wa-header-menu">
                                            <button
                                                className="wa-header-menu-item"
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
                                type="button"
                                className="wa-icon-button"
                                onClick={onAttachClick}
                            >
                                <Paperclip size={18} />
                            </button>

                            <button
                                type="button"
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
