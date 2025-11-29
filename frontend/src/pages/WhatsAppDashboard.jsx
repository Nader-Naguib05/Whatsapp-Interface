// src/pages/WhatsAppDashboard.jsx
import React, { useState, useEffect, useMemo, useRef, useReducer } from "react";
const BACKEND = import.meta.env.VITE_API_URL;

import Sidebar from "../components/layout/Sidebar";
import BroadcastView from "../components/broadcast/BroadcastView";
import AnalyticsView from "../components/analytics/AnalyticsView";
import ContactsView from "../components/contacts/ContactsView";
import SettingsView from "../components/settings/SettingsView";
import ChatLayout from "../components/chats/ChatLayout";

import { ANALYTICS_STATS, MESSAGE_VOLUME, maxVolume } from "../data/mockData";

import {
    getConversations,
    getConversationMessages,
} from "../api/conversations";

import { createSocket } from "../lib/socket";
import EmojiPicker from "emoji-picker-react";

const PAGE_SIZE = 40;

// Normalize phone so +2010..., 010..., spaces, etc. all resolve to same key
const normalizePhone = (phone) => (phone || "").toString().replace(/\D/g, "");

const initialState = {
    conversations: [],
    messagesByConv: {}, // { [convId]: Message[] }
    activeConversationId: null,
    composerValue: "",
    messagePagingByConv: {},
};

// Given a conversationId -> array of messages, insert/merge a new message
function upsertMessageInArray(prevArray, newMsg) {
    let existsIndex = -1;

    if (newMsg.clientId) {
        existsIndex = prevArray.findIndex(
            (m) => m.clientId && m.clientId === newMsg.clientId
        );
    }

    if (existsIndex === -1 && newMsg.id) {
        existsIndex = prevArray.findIndex((m) => m.id === newMsg.id);
    }

    if (existsIndex === -1) {
        return [...prevArray, newMsg];
    } else {
        const updated = [...prevArray];
        updated[existsIndex] = { ...updated[existsIndex], ...newMsg };
        return updated;
    }
}

function reducer(state, action) {
    switch (action.type) {
        case "SET_CONVERSATIONS":
            return {
                ...state,
                conversations: action.payload,
            };

        case "UPSERT_CONVERSATION_TOP": {
            const { conversationId, data } = action.payload;
            const convIdStr = String(conversationId);

            const filtered = state.conversations.filter(
                (c) => String(c.id) !== convIdStr
            );

            return {
                ...state,
                conversations: [
                    {
                        ...data,
                        id: convIdStr,
                    },
                    ...filtered,
                ],
            };
        }

        case "UPDATE_CONVERSATION_UNREAD": {
            const { conversationId, unreadCount } = action.payload;
            return {
                ...state,
                conversations: state.conversations.map((c) =>
                    String(c.id) === String(conversationId)
                        ? {
                              ...c,
                              unread: unreadCount,
                              unreadCount,
                          }
                        : c
                ),
            };
        }

        case "SET_ACTIVE_CONVERSATION":
            return {
                ...state,
                activeConversationId: action.payload,
            };

        case "SET_MESSAGES_FOR_CONV": {
            const { conversationId, messages } = action.payload;
            return {
                ...state,
                messagesByConv: {
                    ...state.messagesByConv,
                    [conversationId]: messages,
                },
            };
        }

        case "PREPEND_MESSAGES_FOR_CONV": {
            const { conversationId, messages } = action.payload;
            const prev = state.messagesByConv[conversationId] || [];
            return {
                ...state,
                messagesByConv: {
                    ...state.messagesByConv,
                    [conversationId]: [...messages, ...prev],
                },
            };
        }

        case "SET_PAGING_FOR_CONV": {
            const { conversationId, paging } = action.payload;
            return {
                ...state,
                messagePagingByConv: {
                    ...state.messagePagingByConv,
                    [conversationId]: paging,
                },
            };
        }

        case "SET_COMPOSER":
            return {
                ...state,
                composerValue: action.payload,
            };

        case "OPTIMISTIC_APPEND_MESSAGE": {
            const { conversationId, message } = action.payload;
            const prev = state.messagesByConv[conversationId] || [];
            return {
                ...state,
                messagesByConv: {
                    ...state.messagesByConv,
                    [conversationId]: [...prev, message],
                },
                composerValue: "",
            };
        }

        case "SERVER_ACK_MESSAGE": {
            const { conversationId, clientId, serverMsg } = action.payload;
            const prev = state.messagesByConv[conversationId] || [];
            const updated = prev.map((m) =>
                m.clientId === clientId ? { ...m, ...serverMsg, clientId } : m
            );
            return {
                ...state,
                messagesByConv: {
                    ...state.messagesByConv,
                    [conversationId]: updated,
                },
            };
        }

        case "UPSERT_MESSAGE": {
            const { conversationId, msg } = action.payload;
            const prev = state.messagesByConv[conversationId] || [];
            const updated = upsertMessageInArray(prev, msg);
            return {
                ...state,
                messagesByConv: {
                    ...state.messagesByConv,
                    [conversationId]: updated,
                },
            };
        }

        case "BULK_MARK_MESSAGES_READ": {
            const { conversationId } = action.payload;
            const prev = state.messagesByConv[conversationId] || [];
            const updated = prev.map((m) =>
                m.fromMe ? m : { ...m, status: "read" }
            );
            return {
                ...state,
                messagesByConv: {
                    ...state.messagesByConv,
                    [conversationId]: updated,
                },
            };
        }

        default:
            return state;
    }
}

const WhatsAppDashboard = () => {
    const [activeTab, setActiveTab] = useState("chats");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [socket, setSocket] = useState(null);
    const prevChatRef = useRef(null);
    const fileInputRef = useRef(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const emojiPickerRef = useRef(null);

    // contacts state + map
    const [contacts, setContacts] = useState([]);
    const [contactsMap, setContactsMap] = useState({});

    // conversation search, typing, presence, global unread, notifications
    const [conversationSearch, setConversationSearch] = useState("");
    const [isCustomerTyping, setIsCustomerTyping] = useState(false);
    const [typingConversationId, setTypingConversationId] = useState(null);
    const [contactStatus, setContactStatus] = useState(null);
    const [globalUnread, setGlobalUnread] = useState(0);

    const notificationAudioRef = useRef(null);
    const hasWindowFocusRef = useRef(true);
    const typingTimeoutRef = useRef(null);

    const [state, dispatch] = useReducer(reducer, initialState);
    const {
        conversations,
        messagesByConv,
        activeConversationId,
        composerValue,
        messagePagingByConv,
    } = state;

    const activeConversation =
        conversations.find((c) => String(c.id) === String(activeConversationId)) ||
        null;

    const activeMessages = activeConversationId
        ? messagesByConv[String(activeConversationId)] || []
        : [];

    const activePaging = activeConversationId
        ? messagePagingByConv[String(activeConversationId)] || {
              hasMore: false,
              loading: false,
              cursor: null,
          }
        : {
              hasMore: false,
              loading: false,
              cursor: null,
          };

    const [contactDetailsToShow, setContactDetailsToShow] = useState(null);

    const handleOpenContactDetails = () => {
        if (!activeContact) return;
        setContactDetailsToShow(activeContact);
    };

    // --- emoji picker outside click close ---
    useEffect(() => {
        if (!showEmojiPicker) return;
        const handleEmojiOutside = (e) => {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(e.target)
            ) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handleEmojiOutside);
        return () => {
            document.removeEventListener("mousedown", handleEmojiOutside);
        };
    }, [showEmojiPicker]);

    // --- auto close emoji picker on tab / conversation change ---
    useEffect(() => {
        setShowEmojiPicker(false);
    }, [activeTab, activeConversationId]);

    // --- window focus tracking for smarter notifications ---
    useEffect(() => {
        if (typeof window === "undefined") return;
        const handleFocus = () => {
            hasWindowFocusRef.current = true;
        };
        const handleBlur = () => {
            hasWindowFocusRef.current = false;
        };
        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);
        return () => {
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
        };
    }, []);

    // If window is not focused, we can bump unread or update tab title, etc.
    useEffect(() => {
        if (!document) return;
        if (!globalUnread) {
            document.title = "WhatsApp Interface";
        } else {
            document.title = `(${globalUnread}) WhatsApp Interface`;
        }
    }, [globalUnread]);

    // local pointer to current backend
    const backendUrl = BACKEND || "http://localhost:5000";

    // load contacts
    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const res = await fetch(`${backendUrl}/contacts`);
                if (!res.ok) throw new Error("Failed to load contacts");
                const data = await res.json();
                setContacts(data || []);

                const map = {};
                (data || []).forEach((c) => {
                    const key = normalizePhone(c.phone);
                    if (key) map[key] = c;
                });
                setContactsMap(map);
            } catch (err) {
                console.error("Error fetching contacts:", err);
            }
        };
        fetchContacts();
    }, [backendUrl]);

    // figure out active contact
    const activePhone = activeConversation?.phone || "";
    const normalizedActivePhone = normalizePhone(activePhone);
    const activeContact =
        normalizedActivePhone && contactsMap[normalizedActivePhone]
            ? contactsMap[normalizedActivePhone]
            : null;

    // load initial conversations
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const convs = await getConversations(backendUrl);
                if (cancelled) return;

                const normalized = convs.map((c) => {
                    const key = normalizePhone(c.phone);
                    const contact = key && contactsMap[key] ? contactsMap[key] : null;
                    const name =
                        (contact && contact.name) ||
                        c.name ||
                        c.displayName ||
                        c.phone ||
                        "Unknown";

                    return {
                        id: String(c._id || c.id),
                        _id: c._id,
                        name,
                        displayName: c.displayName || c.name || name,
                        phone: c.phone,
                        lastMessage: c.lastMessage || "",
                        lastMessageAt:
                            c.lastMessageAt ||
                            c.updatedAt ||
                            c.createdAt ||
                            new Date().toISOString(),
                        unread: c.unreadCount || c.unread || 0,
                        unreadCount: c.unreadCount || c.unread || 0,
                    };
                });

                normalized.sort(
                    (a, b) =>
                        new Date(b.lastMessageAt).getTime() -
                        new Date(a.lastMessageAt).getTime()
                );

                dispatch({ type: "SET_CONVERSATIONS", payload: normalized });

                const totalUnread = normalized.reduce(
                    (sum, c) => sum + (c.unreadCount || 0),
                    0
                );
                setGlobalUnread(totalUnread);
            } catch (err) {
                console.error("Failed to load conversations:", err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [backendUrl, contactsMap]);

    // load messages for active conversation
    const loadMessagesPage = async (conversationId, cursor = null, replace = false) => {
        if (!conversationId) return;
        try {
            dispatch({
                type: "SET_PAGING_FOR_CONV",
                payload: {
                    conversationId,
                    paging: {
                        ...(messagePagingByConv[conversationId] || {}),
                        loading: true,
                    },
                },
            });

            const res = await getConversationMessages(
                backendUrl,
                conversationId,
                PAGE_SIZE,
                cursor
            );

            let msgs = [];
            let nextCursor = null;
            let hasMore = false;

            if (Array.isArray(res)) {
                // backward compatible: old API returns plain array
                msgs = res;
                nextCursor = null;
                hasMore = false;
            } else {
                msgs = res.messages || [];
                nextCursor = res.nextCursor || null;
                hasMore = !!res.hasMore;
            }

            if (replace) {
                dispatch({
                    type: "SET_MESSAGES_FOR_CONV",
                    payload: {
                        conversationId,
                        messages: msgs,
                    },
                });
            } else {
                dispatch({
                    type: "PREPEND_MESSAGES_FOR_CONV",
                    payload: {
                        conversationId,
                        messages: msgs,
                    },
                });
            }

            dispatch({
                type: "SET_PAGING_FOR_CONV",
                payload: {
                    conversationId,
                    paging: {
                        hasMore,
                        cursor: nextCursor,
                        loading: false,
                    },
                },
            });
        } catch (err) {
            console.error("Failed to load messages:", err);
            dispatch({
                type: "SET_PAGING_FOR_CONV",
                payload: {
                    conversationId,
                    paging: {
                        ...(messagePagingByConv[conversationId] || {}),
                        loading: false,
                    },
                },
            });
        }
    };

    useEffect(() => {
        if (!activeConversationId) return;
        loadMessagesPage(String(activeConversationId), null, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeConversationId]);

    const filteredConversations = useMemo(() => {
        const withContactNames = (conversations || []).map((c) => {
            const key = normalizePhone(c.phone);
            const contact = key && contactsMap[key] ? contactsMap[key] : null;
            if (!contact) return c;
            return { ...c, name: contact.name };
        });

        if (!conversationSearch.trim()) return withContactNames;

        const q = conversationSearch.toLowerCase();

        return withContactNames.filter((c) => {
            const name = (c.name || c.displayName || "").toLowerCase();
            const phone = (c.phone || "").toLowerCase();
            const last = (c.lastMessage || "").toLowerCase();
            return name.includes(q) || phone.includes(q) || last.includes(q);
        });
    }, [conversations, contactsMap, conversationSearch]);

    const layoutConversations = useMemo(
        () =>
            filteredConversations.map((c) => ({
                id: String(c.id),
                name: c.name || c.displayName || c.phone || "Unknown",
                phone: c.phone,
                lastMessage: c.lastMessage || "",
                lastMessageAt: c.lastMessageAt,
                unread: c.unreadCount || c.unread || 0,
            })),
        [filteredConversations]
    );

    const layoutMessages = useMemo(() => {
        return (activeMessages || []).map((raw) => {
            if (raw.uiNormalized) return raw;

            const conversation =
                conversations.find(
                    (c) =>
                        String(c.id) ===
                        String(raw.conversationId || raw.conversation || activeConversationId)
                ) || activeConversation;

            const convId = String(conversation._id || conversation.id);
            const senderType = raw.senderType || raw.sender || "customer";

            const uiMsg = {
                id: raw._id,
                clientId: raw.clientId || undefined,
                conversationId: convId,
                text: raw.body,
                body: raw.body,
                mediaUrl: raw.mediaUrl,
                senderType,
                fromMe: senderType === "agent",
                from: senderType === "agent" ? "business" : "customer",
                status: raw.status || "sent",
                timestamp: raw.timestamp || raw.createdAt || raw.updatedAt,
                uiNormalized: true,
            };
            return uiMsg;
        });
    }, [
        activeMessages,
        conversations,
        activeConversation,
        activeConversationId,
    ]);

    // socket connection
    useEffect(() => {
        const s = createSocket(backendUrl);

        s.on("connect", () => {
            console.log("Socket connected");
        });

        s.on("disconnect", () => {
            console.log("Socket disconnected");
        });

        s.on("message:new", (payload) => {
            if (!payload) return;
            const { conversation, message } = payload;

            const convId = String(conversation._id || conversation.id);
            const senderType = message.senderType || message.sender || "customer";

            // 1) upsert conversation at top
            dispatch({
                type: "UPSERT_CONVERSATION_TOP",
                payload: {
                    conversationId: convId,
                    data: {
                        id: convId,
                        _id: conversation._id,
                        name:
                            conversation.name ||
                            conversation.displayName ||
                            conversation.phone ||
                            "Unknown",
                        phone: conversation.phone,
                        lastMessage: message.body || "",
                        lastMessageAt:
                            message.timestamp ||
                            message.createdAt ||
                            new Date().toISOString(),
                        unread:
                            convId === String(activeConversationId)
                                ? 0
                                : (conversation.unreadCount || 0) + 1,
                        unreadCount:
                            convId === String(activeConversationId)
                                ? 0
                                : (conversation.unreadCount || 0) + 1,
                    },
                },
            });

            // 2) upsert message in that conversation's array
            const uiMsg = {
                id: message._id,
                clientId: message.clientId || undefined,
                conversationId: convId,
                text: message.body,
                body: message.body,
                mediaUrl: message.mediaUrl,
                senderType,
                fromMe: senderType === "agent",
                from: senderType === "agent" ? "business" : "customer",
                status: message.status || "sent",
                timestamp:
                    message.timestamp || message.createdAt || new Date().toISOString(),
                uiNormalized: true,
            };

            dispatch({
                type: "UPSERT_MESSAGE",
                payload: {
                    conversationId: convId,
                    msg: uiMsg,
                },
            });

            // 3) handle unread + notifications
            setGlobalUnread((prev) => {
                const conv = state.conversations.find(
                    (c) => String(c.id) === convId
                );
                const convUnread =
                    conv && conv.id === activeConversationId
                        ? 0
                        : (conv?.unreadCount || 0) + 1;
                const newTotal = prev + 1;
                return newTotal;
            });

            if (
                !hasWindowFocusRef.current &&
                senderType === "customer" &&
                convId !== String(activeConversationId)
            ) {
                if (notificationAudioRef.current) {
                    notificationAudioRef.current.currentTime = 0;
                    notificationAudioRef.current.play().catch(() => {});
                }
            }
        });

        s.on("message:status-update", (payload) => {
            if (!payload) return;
            const { conversationId, messageId, status } = payload;
            if (!conversationId || !messageId || !status) return;

            const prev = state.messagesByConv[conversationId] || [];
            const updated = prev.map((m) =>
                String(m.id) === String(messageId) ? { ...m, status } : m
            );

            dispatch({
                type: "SET_MESSAGES_FOR_CONV",
                payload: {
                    conversationId,
                    messages: updated,
                },
            });
        });

        s.on("conversation:typing", (payload) => {
            if (!payload) return;
            const { conversationId } = payload;
            if (!conversationId) return;

            setTypingConversationId(String(conversationId));
            setIsCustomerTyping(true);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
                setIsCustomerTyping(false);
                setTypingConversationId(null);
            }, 2500);
        });

        s.on("conversation:presence", (payload) => {
            if (!payload) return;
            const { conversationId, status } = payload;
            if (!conversationId) return;

            if (String(conversationId) === String(activeConversationId)) {
                setContactStatus(status);
            }
        });

        setSocket(s);

        return () => {
            s.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backendUrl]);

    // if active conversation changes, clear unread for that conv
    useEffect(() => {
        if (!activeConversationId) return;

        dispatch({
            type: "UPDATE_CONVERSATION_UNREAD",
            payload: {
                conversationId: activeConversationId,
                unreadCount: 0,
            },
        });

        dispatch({
            type: "BULK_MARK_MESSAGES_READ",
            payload: {
                conversationId: String(activeConversationId),
            },
        });

        setGlobalUnread((prev) => {
            const conv = state.conversations.find(
                (c) => String(c.id) === String(activeConversationId)
            );
            const diff = conv?.unreadCount || 0;
            return Math.max(0, prev - diff);
        });
    }, [activeConversationId, state.conversations]);

    const activeConversationMessages = messagesByConv[String(activeConversationId)] || [];

    const handleSelectConversation = (id) => {
        if (!id) return;
        dispatch({ type: "SET_ACTIVE_CONVERSATION", payload: id });
        setActiveTab("chats");
        setContactDetailsToShow(null);
    };

    const handleSend = async (text) => {
        if (!text.trim() || !activeConversationId) return;

        const conversationId = String(activeConversationId);
        const time = new Date().toISOString();

        const clientId = "msg-" + (crypto.randomUUID?.() || Date.now());

        const optimisticMsg = {
            clientId,
            conversationId,
            text,
            body: text,
            senderType: "agent",
            fromMe: true,
            from: "business",
            status: "sending",
            timestamp: time,
            uiNormalized: true,
        };

        dispatch({
            type: "OPTIMISTIC_APPEND_MESSAGE",
            payload: {
                conversationId,
                message: optimisticMsg,
            },
        });

        dispatch({
            type: "UPSERT_CONVERSATION_TOP",
            payload: {
                conversationId,
                data: {
                    ...activeConversation,
                    id: conversationId,
                    lastMessage: text,
                    lastMessageAt: time,
                    unread: 0,
                    unreadCount: 0,
                },
            },
        });

        try {
            const res = await fetch(
                `${backendUrl}/messages/send-text?conversationId=${conversationId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ text, clientId }),
                }
            );

            if (!res.ok) {
                throw new Error("Failed to send message");
            }
            const data = await res.json();

            const serverMsg = {
                id: data._id,
                status: data.status || "sent",
                timestamp: data.timestamp || data.createdAt || time,
            };

            dispatch({
                type: "SERVER_ACK_MESSAGE",
                payload: {
                    conversationId,
                    clientId,
                    serverMsg,
                },
            });
        } catch (err) {
            console.error("Send message failed:", err);
            dispatch({
                type: "UPSERT_MESSAGE",
                payload: {
                    conversationId,
                    msg: {
                        ...optimisticMsg,
                        status: "failed",
                    },
                },
            });
        }
    };

    const handleRetryMessage = async (msg) => {
        if (!msg || !msg.conversationId || !msg.clientId) return;
        await handleSend(msg.text || msg.body || "");
    };

    const handleLoadOlderMessages = () => {
        if (!activeConversationId) return;
        const conversationId = String(activeConversationId);
        const paging = messagePagingByConv[conversationId];
        if (paging && paging.hasMore && !paging.loading) {
            loadMessagesPage(conversationId, paging.cursor, false);
        }
    };

    const handleToggleSidebar = () => {
        setSidebarOpen((prev) => !prev);
    };

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e) => {
        const file = e.target.files[0];
        e.target.value = "";

        if (!file || !activeConversationId) return;

        const convId = String(activeConversation?.id || activeConversationId);
        const time = new Date().toISOString();
        const mime = file.type;

        const isImage = mime.startsWith("image/");
        const isVideo = mime.startsWith("video/");
        const isAudio = mime.startsWith("audio/");
        const isDocument = !isImage && !isVideo && !isAudio;

        const localUrl = URL.createObjectURL(file);

        const clientId = "file-" + (crypto.randomUUID?.() || Date.now());

        const optimistic = {
            clientId,
            conversationId: convId,
            text: isImage
                ? "[Image]"
                : isVideo
                ? "[Video]"
                : isAudio
                ? "[Audio]"
                : "[File]",
            body: isImage
                ? "[Image]"
                : isVideo
                ? "[Video]"
                : isAudio
                ? "[Audio]"
                : "[File]",
            mediaUrl: localUrl,
            senderType: "agent",
            fromMe: true,
            from: "business",
            status: "uploading-0",
            timestamp: time,
            uiNormalized: true,
        };

        dispatch({
            type: "OPTIMISTIC_APPEND_MESSAGE",
            payload: {
                conversationId: convId,
                message: optimistic,
            },
        });

        const uploadForm = new FormData();
        uploadForm.append("file", file);
        uploadForm.append("conversationId", convId);
        uploadForm.append("mime", mime);

        try {
            const res = await fetch(`${backendUrl}/messages/upload-media`, {
                method: "POST",
                body: uploadForm,
            });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();

            const serverMsg = {
                id: data._id || undefined,
                mediaUrl: data.mediaUrl || data.url || localUrl,
                status: data.status || "sent",
                timestamp: data.timestamp || data.createdAt || time,
            };

            dispatch({
                type: "SERVER_ACK_MESSAGE",
                payload: {
                    conversationId: convId,
                    clientId,
                    serverMsg,
                },
            });
        } catch (err) {
            console.error("Upload media failed:", err);
            dispatch({
                type: "UPSERT_MESSAGE",
                payload: {
                    conversationId: convId,
                    msg: {
                        ...optimistic,
                        status: "failed",
                    },
                },
            });
        }
    };

    const handleEmojiSelect = (emoji) => {
        dispatch({
            type: "SET_COMPOSER",
            payload: (composerValue || "") + emoji,
        });
        setShowEmojiPicker(false);
    };

    const handleAddToContacts = async ({ id, name, phone }) => {
        try {
            const payload = {
                name: name || "Unknown",
                phone,
                tags: [],
                notes: "",
            };

            const res = await fetch(`${backendUrl}/contacts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error("Failed to add contact");
            }

            const newContact = await res.json();

            setContacts((prev) => [...prev, newContact]);

            const key = normalizePhone(newContact.phone);
            setContactsMap((prevMap) => ({
                ...prevMap,
                [key]: newContact,
            }));
        } catch (err) {
            console.error("Error adding to contacts:", err);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab !== "chats") {
            dispatch({
                type: "SET_ACTIVE_CONVERSATION",
                payload: null,
            });
        }
    };

    const isCustomerTypingForActive =
        isCustomerTyping &&
        typingConversationId &&
        String(typingConversationId) === String(activeConversationId);

    const stats = ANALYTICS_STATS;
    const messageVolume = MESSAGE_VOLUME;

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100">
            <Sidebar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={handleToggleSidebar}
                globalUnread={globalUnread}
            />

            <div className="flex-1 flex flex-col relative">
                <audio
                    ref={notificationAudioRef}
                    src="/sounds/incoming-message.mp3"
                    preload="auto"
                />

                {activeTab === "chats" && (
                    <div className="relative h-full">
                        <ChatLayout
                            conversations={layoutConversations}
                            activeConversationId={activeConversationId}
                            onSelectConversation={handleSelectConversation}
                            messages={layoutMessages}
                            onSendMessage={handleSend}
                            composerValue={composerValue}
                            setComposerValue={(v) =>
                                dispatch({
                                    type: "SET_COMPOSER",
                                    payload: v,
                                })
                            }
                            onAttachClick={handleAttachClick}
                            onEmojiClick={() => setShowEmojiPicker((v) => !v)}
                            contactName={
                                activeContact?.name || activeConversation?.name
                            }
                            contactPhone={activePhone}
                            hasMoreMessages={activePaging.hasMore}
                            isLoadingMore={activePaging.loading}
                            onLoadOlderMessages={handleLoadOlderMessages}
                            onSearchChange={setConversationSearch}
                            isCustomerTyping={isCustomerTypingForActive}
                            customerTypingText="Customer is typing…"
                            contactStatus={contactStatus}
                            onRetryMessage={handleRetryMessage}
                            onAddToContacts={handleAddToContacts}
                            isInContacts={!!activeContact}
                            onOpenContactDetails={handleOpenContactDetails}
                        />

                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={handleFileSelected}
                        />

                        {showEmojiPicker && (
                            <div
                                ref={emojiPickerRef}
                                className="absolute bottom-16 right-4 z-50"
                            >
                                <EmojiPicker
                                    onEmojiClick={(emojiData) =>
                                        handleEmojiSelect(emojiData.emoji)
                                    }
                                />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "broadcast" && <BroadcastView />}

                {activeTab === "analytics" && (
                    <AnalyticsView
                        stats={stats}
                        messageVolume={messageVolume}
                        maxVolume={maxVolume}
                    />
                )}

                {activeTab === "contacts" && (
                    <ContactsView
                        conversations={layoutConversations}
                        onOpenContactDetails={handleOpenContactDetails}
                    />
                )}

                {contactDetailsToShow && (
                    <ContactsView
                        initialDetails={contactDetailsToShow}
                        onClose={() => setContactDetailsToShow(null)}
                    />
                )}

                {activeTab === "settings" && <SettingsView />}
            </div>
        </div>
    );
};

export default WhatsAppDashboard;
