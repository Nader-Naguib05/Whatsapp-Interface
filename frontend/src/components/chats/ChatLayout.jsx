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
    ArrowLeft,
    AlertCircle,
    FileText,
} from "lucide-react";

import "../../styles/wa-chat.css";
import { useNavigate } from "react-router-dom";

/* ---------------------------------------------------
   UTILITIES
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
   MESSAGE BUBBLE — FINAL FULL VERSION
   Supports incoming + outgoing media correctly
--------------------------------------------------- */

function MessageBubble({ msg, onRetryMessage }) {
    const senderType = msg.senderType || msg.sender || msg.role;
    const timestamp = msg.timestamp || msg.time || msg.createdAt;

    const mediaType = msg.mediaType || "";
    const mediaUrl = msg.mediaUrl || null;

    const text = msg.text || msg.body || msg.caption || "";
    const status = msg.status || "sent";

    const isOutgoing =
        senderType === "agent" ||
        msg.from === "business" ||
        msg.fromMe === true;

    const isSending = status === "sending" || status?.startsWith("uploading-");
    const isFailed = status === "failed";

    /* ---------------------------------------------------
       FIXED MEDIA DETECTION (incoming + outgoing)
       incoming: "image" | "video" | "audio" | "document"
       outgoing: "image/jpeg" | "video/mp4" etc
    --------------------------------------------------- */
    const normalizedType = mediaType?.toLowerCase();

    const isImage =
        normalizedType === "image" || normalizedType?.startsWith("image/");
    const isVideo =
        normalizedType === "video" || normalizedType?.startsWith("video/");
    const isAudio =
        normalizedType === "audio" || normalizedType?.startsWith("audio/");
    const isDocument =
        mediaUrl &&
        (normalizedType === "document" || (!isImage && !isVideo && !isAudio));

    /* -------------------------------------------
       NEW: Display actual sender name
    ------------------------------------------- */
    const displayedName = isOutgoing
        ? msg.senderName || msg.agentName || "Agent"
        : msg.customerName || "Customer";

    /* -------------------------------------------
       EXTRACT DOCUMENT FILENAME
    ------------------------------------------- */
    const fileName =
        msg.fileName ||
        msg.filename ||
        (mediaUrl ? mediaUrl.split("/").pop() : "File");

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
                {/* Sender label */}
                <div
                    style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        marginBottom: "4px",
                        opacity: 0.85,
                        textAlign: isOutgoing ? "right" : "left",
                    }}
                >
                    {displayedName}
                </div>

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
                                loading="lazy"
                            />
                        )}

                        {isVideo && (
                            <video
                                src={mediaUrl}
                                controls
                                className="wa-media-video"
                                draggable={false}
                            />
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
                                <FileText size={20} />
                                <span
                                    style={{
                                        fontSize: 13,
                                        marginLeft: 8,
                                    }}
                                >
                                    {fileName}
                                </span>
                            </a>
                        )}
                    </div>
                )}

                {/* TEXT / CAPTION */}
                {text && <div className="wa-message-text">{text}</div>}

                {/* META */}
                <div className="wa-message-meta" title={timestamp}>
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
       MAIN CHAT LAYOUT
--------------------------------------------------- */
const ChatLayout = ({
    conversations = [],
    activeConversationId,

    onSelectConversation,
    onUpdateConversationField,
    messages = [],

    composerValue,
    setComposerValue,
    onSendMessage,

    onAttachClick,
    onFileSelected,
    fileInputRef,

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
    const [tagFilter, setTagFilter] = useState("الكل");

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    // MOBILE: controls whether we're on "Inbox" or "Chat"
    const [showChatOnMobile, setShowChatOnMobile] = useState(false);
    const navigate = useNavigate();

    /* ---------------------------------------------------
       SCROLL ENGINE
  --------------------------------------------------- */
    const initialScrollDoneRef = useRef(false);

    const scrollToBottom = useCallback((behavior = "auto") => {
        bottomRef.current?.scrollIntoView({
            behavior,
            block: "end",
        });
    }, []);

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

    useEffect(() => {
        if (!initialScrollDoneRef.current) return;

        const el = messagesRef.current;
        if (!el) return;

        const nearBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 150;

        if (nearBottom) {
            scrollToBottom("smooth");
        }
    }, [messages, scrollToBottom]);

    const handleScroll = () => {
        const el = messagesRef.current;
        if (!el) return;

        if (el.scrollTop <= 40) {
            if (!isLoadingMore && hasMoreMessages) {
                onLoadOlderMessages?.();
            }
        }
    };

    useEffect(() => {
        if (!messagesRef.current) return;

        const el = messagesRef.current;

        const ro = new ResizeObserver(() => {
            if (!initialScrollDoneRef.current) return;

            const nearBottom =
                el.scrollHeight - el.scrollTop - el.clientHeight < 150;

            if (nearBottom) {
                scrollToBottom("smooth");
            }
        });

        ro.observe(el);
        return () => ro.disconnect();
    }, [scrollToBottom]);

    /* ---------------------------------------------------
       GROUP MESSAGES BY DAY
  --------------------------------------------------- */
    const groupedByDay = useMemo(() => {
        const result = [];
        let currentDay = null;

        messages.forEach((msg, idx) => {
            const ts = msg.timestamp || msg.time || msg.createdAt;
            const day = formatDayLabel(ts);

            const baseId = getMessageKey(msg, idx);

            if (day !== currentDay) {
                currentDay = day;
                result.push({
                    type: "day",
                    id: `day-${day}-${baseId}`,
                    label: day,
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
    const [localSearch, setLocalSearch] = useState("");

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
            (c) => String(c._id || c.id) === String(activeConversationId)
        ) || null;

    const statusBadge =
        contactStatus === "online"
            ? "Online"
            : contactStatus === "offline"
            ? "Offline"
            : null;

    /* ---------------------------------------------------
       DROPDOWN
  --------------------------------------------------- */
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        function close(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsMenuOpen(false);
            }
        }
        if (isMenuOpen) {
            document.addEventListener("mousedown", close);
        }
        return () => document.removeEventListener("mousedown", close);
    }, [isMenuOpen]);

    async function updateConversationTag(tag) {
        try {
            const token = localStorage.getItem("token");

            await fetch(
                `${API_URL}/conversations/${activeConversationId}/tag`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ tag }),
                }
            );

            // instantly update frontend state
            onUpdateConversationField?.(activeConversationId, { tag });

            setIsMenuOpen(false);
        } catch (err) {
            console.error("Failed to update tag:", err);
        }
    }

    /* ---------------------------------------------------
       RENDER
  --------------------------------------------------- */
    return (
        <div className="wa-shell">
            {/* SIDEBAR (INBOX LIST) */}
            <aside
                className={
                    "wa-sidebar " +
                    (isMobile
                        ? showChatOnMobile
                            ? "wa-mobile-hidden"
                            : "wa-mobile-visible"
                        : "")
                }
            >
                <div className="wa-sidebar-header">
                    <h1 className="wa-app-title">Inbox</h1>
                </div>

                {/* TAG FILTER */}
                <div
                    className="wa-tag-filter"
                    style={{
                        display: "flex",
                        gap: "6px",
                        padding: "10px",
                    }}
                >
                    {["الكل", "بدون", "مشاكل", "زبائن", "كباتن"].map((tag) => (
                        <button
                            key={tag}
                            onClick={() => setTagFilter(tag)}
                            style={{
                                flex: 1,
                                padding: "6px",
                                fontSize: "12px",
                                borderRadius: "6px",
                                border: "1px solid #ddd",
                                background:
                                    tagFilter === tag ? "#dbeafe" : "white",
                            }}
                        >
                            {tag}
                        </button>
                    ))}
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
                    {conversations
                        .filter((conv) => {
                            if (tagFilter === "الكل") return true;
                            return conv.tag === tagFilter;
                        })
                        .map((conv) => {
                            const id = conv._id || conv.id;
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
                                    key={id}
                                    onClick={() => {
                                        onSelectConversation(id);
                                        if (isMobile) setShowChatOnMobile(true);
                                    }}
                                    className={
                                        "wa-conversation-item" +
                                        (String(id) ===
                                        String(activeConversationId)
                                            ? " wa-conversation-item--active"
                                            : "")
                                    }
                                >
                                    <div className="wa-avatar">{name[0]}</div>
                                    {conv.tag && conv.tag !== "بدون" && (
                                        <span
                                            style={{
                                                fontSize: "10px",
                                                padding: "2px 6px",
                                                marginBottom: "4px",
                                                borderRadius: "6px",
                                                background: "#eee",
                                                alignSelf: "flex-start",
                                            }}
                                        >
                                            {conv.tag}
                                        </span>
                                    )}

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
            <section
                className={
                    "wa-chat-area " +
                    (isMobile
                        ? showChatOnMobile
                            ? "wa-mobile-visible"
                            : "wa-mobile-hidden"
                        : "")
                }
            >
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
                                        {contactName || activeConversation.name}
                                    </div>

                                    {!isMobile && (
                                        <div className="wa-chat-subtitle">
                                            {contactPhone}
                                            {statusBadge && (
                                                <span className="wa-presence-badge">
                                                    • {statusBadge}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {isMobile && statusBadge && (
                                        <div className="wa-chat-subtitle">
                                            {statusBadge}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div
                                className="wa-chat-header-actions"
                                ref={menuRef}
                            >
                                <button
                                    className="wa-icon-button"
                                    onClick={() => setIsMenuOpen((o) => !o)}
                                >
                                    <MoreVertical size={18} />
                                </button>

                                {isMenuOpen && (
                                    <div className="wa-header-menu">
                                        <div
                                            style={{
                                                padding: "6px 10px",
                                                fontSize: "12px",
                                                opacity: 0.7,
                                            }}
                                        >
                                            تغيـير الوسم
                                        </div>

                                        {[
                                            "بدون",
                                            "مشاكل",
                                            "زبائن",
                                            "كباتن",
                                        ].map((tag) => (
                                            <button
                                                key={tag}
                                                className="wa-header-menu-item"
                                                onClick={() =>
                                                    updateConversationTag(tag)
                                                }
                                            >
                                                {tag}
                                            </button>
                                        ))}

                                        <hr style={{ margin: "6px 0" }} />

                                        {!isInContacts ? (
                                            <button
                                                className="wa-header-menu-item"
                                                onClick={() => {
                                                    setIsMenuOpen(false);

                                                    navigate(
                                                        "/modules/contacts",
                                                        {
                                                            state: {
                                                                prefill: {
                                                                    id: activeConversationId,
                                                                    name:
                                                                        contactName ||
                                                                        activeConversation.name,
                                                                    phone:
                                                                        contactPhone ||
                                                                        activeConversation.phone,
                                                                },
                                                            },
                                                        }
                                                    );
                                                }}
                                            >
                                                Add to contacts
                                            </button>
                                        ) : (
                                            <button
                                                className="wa-header-menu-item"
                                                onClick={() => {
                                                    setIsMenuOpen(false);
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
                        </header>

                        {/* MESSAGES */}
                        <div
                            className="wa-chat-messages"
                            ref={messagesRef}
                            onScroll={handleScroll}
                        >
                            {isLoadingMore && hasMoreMessages && (
                                <div className="wa-loading-more">Loading…</div>
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

                        <footer className="wa-chat-composer">
                            <button
                                className="wa-icon-button"
                                onClick={onAttachClick}
                            >
                                <Paperclip size={18} />
                            </button>

                            {/* HIDDEN FILE INPUT */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={onFileSelected}
                                className="hidden"
                            />

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
