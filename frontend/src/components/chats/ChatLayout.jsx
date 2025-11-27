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
    const msgMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const diffDays =
        (todayMidnight.getTime() - msgMidnight.getTime()) /
        (1000 * 60 * 60 * 24);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";

    return d.toLocaleDateString();
}

// small helper for stable message key
function getMessageKey(msg, idx) {
    return msg.clientId || msg.id || msg._id || msg.msgId || idx;
}

function MessageBubble({ msg, onRetryMessage }) {
    const senderType = msg.senderType || msg.sender || msg.role;
    const timestamp = msg.timestamp || msg.time || msg.createdAt;
    const mediaUrl = msg.mediaUrl;
    const mediaType = msg.mediaType || "";
    const fileName = msg.fileName || msg.filename || "Attachment";

    const isOutgoing =
        senderType === "agent" ||
        msg.from === "business" ||
        msg.fromMe === true;

    const text = msg.text ?? msg.body ?? "";
    const status = msg.status || "sent";

    const handleRetry = () => {
        if (status === "failed" && onRetryMessage) {
            onRetryMessage(msg);
        }
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
                        : "wa-message-bubble--incoming") +
                    (status === "sending" ? " wa-message-bubble--sending" : "")
                }
            >
                {/* ---------- MEDIA PREVIEW ---------- */}
                {mediaUrl && (
                    <div className="wa-message-media">

                        {/* IMAGE */}
                        {mediaType.startsWith("image/") && (
                            <img
                                src={mediaUrl}
                                alt="image"
                                className="wa-media-img"
                                draggable={false}
                            />
                        )}

                        {/* VIDEO */}
                        {mediaType.startsWith("video/") && (
                            <video
                                src={mediaUrl}
                                controls
                                className="wa-media-video"
                                draggable={false}
                            />
                        )}

                        {/* AUDIO */}
                        {mediaType.startsWith("audio/") && (
                            <audio
                                controls
                                src={mediaUrl}
                                className="wa-media-audio"
                            />
                        )}

                        {/* DOCUMENT / FILE */}
                        {!mediaType.startsWith("image/") &&
                            !mediaType.startsWith("video/") &&
                            !mediaType.startsWith("audio/") && (
                                <a
                                    href={mediaUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="wa-media-file"
                                >
                                    <FileText size={18} />
                                    <span>{fileName}</span>
                                </a>
                            )}
                    </div>
                )}

                {/* ---------- TEXT ---------- */}
                {text && <div className="wa-message-text">{text}</div>}

                {/* ---------- META (Time + Status) ---------- */}
                <div className="wa-message-meta">
                    <span className="wa-message-time">
                        {formatTime(timestamp)}
                    </span>

                    {isOutgoing && (
                        <span className="wa-message-status">
                            {status === "sending" && (
                                <span className="wa-sending-dot"></span>
                            )}
                            {status === "sent" && <Check size={14} />}
                            {status === "delivered" && <CheckCheck size={14} />}
                            {status === "read" && (
                                <CheckCheck
                                    size={14}
                                    className="wa-message-status--read"
                                />
                            )}
                            {status === "failed" && (
                                <button
                                    type="button"
                                    className="wa-message-failed-btn"
                                    onClick={handleRetry}
                                    title="Failed • Click to retry"
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

    // NEW OPTIONAL ENTERPRISE FEATURES (non-breaking)
    onSearchChange,
    searchPlaceholder = "Search conversations",
    isCustomerTyping = false,
    customerTypingText = "Customer is typing…",
    contactStatus, // "online" | "offline" | undefined
    onRetryMessage, // for failed messages
    onAddToContacts, // new: header 3-dots action
}) => {
    const listRef = useRef(null);
    const bottomRef = useRef(null);
    const messagesRef = useRef(null);

    const [localSearch, setLocalSearch] = useState("");
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

    // track last message to avoid breaking scroll when loading history
    const lastMessageKeyRef = useRef(null);
    const initialScrollDoneRef = useRef(false);

    // Smart auto-scroll:
    // - Scroll on first load
    // - Scroll when a NEW message arrives at the bottom
    useEffect(() => {
        if (!messages || messages.length === 0) return;

        const lastMsg = messages[messages.length - 1] || {};
        const lastKey = getMessageKey(lastMsg, messages.length - 1);

        const messagesContainer = messagesRef.current;

        // first load -> scroll
        if (!initialScrollDoneRef.current) {
            bottomRef.current?.scrollIntoView({
                behavior: "auto",
            });
            initialScrollDoneRef.current = true;
            lastMessageKeyRef.current = lastKey;
            return;
        }

        const prevLastKey = lastMessageKeyRef.current;

        // if last message changed, assume new message at bottom -> scroll
        if (lastKey && lastKey !== prevLastKey) {
            const nearBottom =
                messagesContainer &&
                messagesContainer.scrollHeight -
                    messagesContainer.scrollTop -
                    messagesContainer.clientHeight <
                    120;

            if (nearBottom || !prevLastKey) {
                bottomRef.current?.scrollIntoView({
                    behavior: "smooth",
                });
            }
            lastMessageKeyRef.current = lastKey;
        }
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

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setLocalSearch(value);
        if (onSearchChange) {
            onSearchChange(value);
        }
    };

    // group messages by day, memoized for performance
    const groupedByDay = useMemo(() => {
        const result = [];
        let currentDay = null;

        (messages || []).forEach((msg, idx) => {
            const timestamp = msg.timestamp || msg.time || msg.createdAt;
            const dayLabel = formatDayLabel(timestamp);

            const baseId = getMessageKey(msg, idx);

            if (dayLabel && dayLabel !== currentDay) {
                currentDay = dayLabel;
                result.push({
                    type: "day",
                    label: dayLabel,
                    id: `day-${dayLabel}-${baseId}`,
                });
            }

            result.push({
                type: "msg",
                data: { ...msg, timestamp },
                id: `msg-${baseId}`,
            });
        });

        return result;
    }, [messages]);

    const statusBadge =
        contactStatus === "online"
            ? "Online"
            : contactStatus === "offline"
            ? "Offline"
            : null;

    const handleHeaderMenuAddToContacts = () => {
        setIsHeaderMenuOpen(false);
        if (!onAddToContacts || !activeConversation) return;

        onAddToContacts({
            id: activeConversation._id || activeConversation.id,
            name:
                contactName ||
                activeConversation.name ||
                activeConversation.displayName ||
                activeConversation.phone,
            phone: contactPhone || activeConversation.phone,
        });
    };

    return (
        <div className="wa-shell">
            {/* LEFT */}
            <aside className="wa-sidebar">
                <div className="wa-sidebar-header">
                    <h1 className="wa-app-title">Inbox</h1>
                </div>

                <div className="wa-search-wrapper">
                    <Search className="wa-search-icon" size={16} />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        className="wa-search-input"
                        value={localSearch}
                        onChange={handleSearchChange}
                    />
                </div>

                <div className="wa-conversation-list" ref={listRef}>
                    {conversations.map((conv) => {
                        const convId = conv._id || conv.id;
                        const displayName =
                            conv.name ||
                            conv.displayName ||
                            conv.phone ||
                            "Unknown";
                        const lastMessagePreview = conv.lastMessage || "";
                        const lastMessageAt =
                            conv.lastMessageAt ||
                            conv.updatedAt ||
                            conv.createdAt;
                        const unread =
                            conv.unreadCount !== undefined
                                ? conv.unreadCount
                                : conv.unread || 0;
                        const presence =
                            conv.contactStatus === "online"
                                ? "• Online"
                                : conv.contactStatus === "offline"
                                ? "• Offline"
                                : "";

                        return (
                            <button
                                key={convId}
                                type="button"
                                className={
                                    "wa-conversation-item" +
                                    (String(convId) ===
                                    String(activeConversationId)
                                        ? " wa-conversation-item--active"
                                        : "")
                                }
                                onClick={() => onSelectConversation(convId)}
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
                                        <div className="wa-conversation-meta-right">
                                            {presence && (
                                                <span className="wa-presence-pill">
                                                    {presence}
                                                </span>
                                            )}
                                            {unread > 0 && (
                                                <span className="wa-unread-badge">
                                                    {unread > 99 ? "99+" : unread}
                                                </span>
                                            )}
                                        </div>
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
                                        {statusBadge && (
                                            <span className="wa-presence-badge">
                                                • {statusBadge}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="wa-chat-header-actions">
                                <button
                                    type="button"
                                    className="wa-icon-button"
                                    title="Call"
                                >
                                    <Phone size={18} />
                                </button>
                                <div className="wa-header-menu-wrapper">
                                    <button
                                        type="button"
                                        className="wa-icon-button"
                                        title="More"
                                        onClick={() =>
                                            setIsHeaderMenuOpen(
                                                (open) => !open
                                            )
                                        }
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                    {isHeaderMenuOpen && (
                                        <div className="wa-header-menu">
                                            <button
                                                type="button"
                                                className="wa-header-menu-item"
                                                onClick={
                                                    handleHeaderMenuAddToContacts
                                                }
                                            >
                                                Add to contacts
                                            </button>
                                        </div>
                                    )}
                                </div>
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

                            {groupedByDay.length === 0 && (
                                <div className="wa-empty-thread">
                                    <p>
                                        No messages yet. Start the conversation.
                                    </p>
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
                                    <span className="wa-typing-text">
                                        {customerTypingText}
                                    </span>
                                </div>
                            )}

                            <div ref={bottomRef} />
                        </div>

                        <footer className="wa-chat-composer">
                            <button
                                type="button"
                                className="wa-icon-button"
                                onClick={onAttachClick}
                                title="Attach file"
                            >
                                <Paperclip size={18} />
                            </button>

                            <button
                                type="button"
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
                                type="button"
                                className={
                                    "wa-send-button" +
                                    (composerValue && composerValue.trim()
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
                            Choose a customer from the left to start messaging.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default ChatLayout;
