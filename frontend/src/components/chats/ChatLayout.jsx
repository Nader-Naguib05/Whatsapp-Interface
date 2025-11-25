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
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

function MessageBubble({ msg }) {
    const isOutgoing = msg.direction === "outgoing" || msg.fromMe;
    const status = msg.status; // "sending" | "sent" | "delivered" | "read" | "failed"

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
                <div className="wa-message-text">{msg.text || msg.body}</div>
                <div className="wa-message-meta">
                    <span className="wa-message-time">
                        {formatTime(msg.timestamp)}
                    </span>
                    {isOutgoing && (
                        <span className="wa-message-status">
                            {status === "sending" && (
                                <span className="wa-sending-dot" />
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
                                <span className="wa-message-failed">!</span>
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

const ChatLayout = ({
    conversations,
    activeConversationId,
    onSelectConversation,
    messages,
    onSendMessage,
    composerValue,
    setComposerValue,
    onAttachClick,
    contactName,
    contactPhone,
    onEmojiClick,
}) => {
    const listRef = useRef(null);
    const bottomRef = useRef(null);

    // auto-scroll when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const activeConversation = conversations.find(
        (c) => c.id === activeConversationId
    );

    const handleSend = () => {
        const trimmed = composerValue.trim();
        if (!trimmed) return;
        onSendMessage(trimmed);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // group messages by day
    const groupedByDay = [];
    let currentDay = null;

    (messages || []).forEach((msg) => {
        const dayLabel = formatDayLabel(msg.timestamp);
        if (dayLabel && dayLabel !== currentDay) {
            currentDay = dayLabel;
            groupedByDay.push({
                type: "day",
                label: dayLabel,
                id: `day-${msg.id}`,
            });
        }
        groupedByDay.push({ type: "msg", data: msg, id: msg.id });
    });

    return (
        <div className="wa-shell">
            {/* LEFT: conversations */}
            <aside className="wa-sidebar">
                <div className="wa-sidebar-header">
                    <h1 className="wa-app-title">Inbox</h1>
                </div>

                <div className="wa-search-wrapper">
                    <Search className="wa-search-icon" size={16} />
                    <input
                        type="text"
                        placeholder="Search conversations"
                        className="wa-search-input"
                        // you can wire real search later
                        onChange={() => {}}
                    />
                </div>

                <div className="wa-conversation-list" ref={listRef}>
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            className={
                                "wa-conversation-item" +
                                (conv.id === activeConversationId
                                    ? " wa-conversation-item--active"
                                    : "")
                            }
                            onClick={() => onSelectConversation(conv.id)}
                        >
                            <div className="wa-avatar">
                                {conv.initials ||
                                    conv.name?.[0] ||
                                    conv.phone?.[0] ||
                                    "?"}
                            </div>
                            <div className="wa-conversation-main">
                                <div className="wa-conversation-top-row">
                                    <span className="wa-conversation-name">
                                        {conv.name || conv.phone}
                                    </span>
                                    <span className="wa-conversation-time">
                                        {conv.lastMessageAt
                                            ? formatTime(conv.lastMessageAt)
                                            : ""}
                                    </span>
                                </div>
                                <div className="wa-conversation-bottom-row">
                                    <span className="wa-conversation-preview">
                                        {conv.lastMessage || "No messages yet"}
                                    </span>
                                    {conv.unread > 0 && (
                                        <span className="wa-unread-badge">
                                            {conv.unread > 99
                                                ? "99+"
                                                : conv.unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </aside>

            {/* RIGHT: active chat */}
            <section className="wa-chat-area">
                {activeConversation ? (
                    <>
                        {/* Chat header */}
                        <header className="wa-chat-header">
                            <div className="wa-chat-header-left">
                                <div className="wa-avatar wa-avatar--lg">
                                    {contactName?.[0] ||
                                        activeConversation.name?.[0] ||
                                        activeConversation.phone?.[0] ||
                                        "?"}
                                </div>
                                <div>
                                    <div className="wa-chat-title">
                                        {contactName ||
                                            activeConversation.name ||
                                            activeConversation.phone}
                                    </div>
                                    <div className="wa-chat-subtitle">
                                        {contactPhone ||
                                            activeConversation.phone}
                                    </div>
                                </div>
                            </div>
                            <div className="wa-chat-header-actions">
                                <button className="wa-icon-button" title="Call">
                                    <Phone size={18} />
                                </button>
                                <button className="wa-icon-button" title="More">
                                    <MoreVertical size={18} />
                                </button>
                            </div>
                        </header>

                        {/* Messages */}
                        <div className="wa-chat-messages">
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

                        {/* Composer */}
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
                                    (composerValue.trim()
                                        ? " wa-send-button--active"
                                        : "")
                                }
                                onClick={handleSend}
                                disabled={!composerValue.trim()}
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
