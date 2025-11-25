// src/pages/WhatsAppDashboard.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";

// Layout
import Sidebar from "../components/layout/Sidebar";

// Broadcast
import BroadcastView from "../components/broadcast/BroadcastView";

// Analytics
import AnalyticsView from "../components/analytics/AnalyticsView";

// Contacts
import ContactsPage from "./ContactsPage";

// Settings
import SettingsView from "../components/settings/SettingsView";

// Chat layout (new)
import ChatLayout from "../components/chats/ChatLayout";

// Data (only analytics/mock stats)
import { ANALYTICS_STATS, MESSAGE_VOLUME, maxVolume } from "../data/mockData";

// API
import {
    getConversations,
    getConversationMessages,
} from "../api/conversations";
import { sendMessage } from "../api/messages";

// Socket
import { createSocket } from "../lib/socket";

const WhatsAppDashboard = () => {
    const [activeTab, setActiveTab] = useState("chats");
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const [conversations, setConversations] = useState([]);
    const [selectedChatId, setSelectedChatId] = useState(null);

    const [message, setMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    const fileInputRef = useRef(null);

    const [socket, setSocket] = useState(null);
    const prevChatRef = useRef(null);

    // --------------------------------------
    // SOCKET SETUP
    // --------------------------------------
    useEffect(() => {
        const s = createSocket();
        setSocket(s);

        s.on("connect", () => console.log("Socket connected:", s.id));
        s.on("disconnect", () => console.log("Socket disconnected"));

        return () => {
            s.disconnect();
        };
    }, []);

    // Join/leave conversation rooms when selected chat changes
    useEffect(() => {
        if (!socket || !selectedChatId) return;

        if (prevChatRef.current && prevChatRef.current !== selectedChatId) {
            socket.emit("leaveConversation", prevChatRef.current);
        }

        socket.emit("joinConversation", selectedChatId);
        prevChatRef.current = selectedChatId;
    }, [socket, selectedChatId]);

    // Handle incoming messages (real-time from backend via socket)
    useEffect(() => {
        if (!socket) return;

        const handler = ({ conversation, message: rawMessage }) => {
            // extra safety in case backend still emits agent messages
            if (rawMessage.senderType === "agent") return;

            const uiMessage = {
                id: rawMessage._id,
                conversationId: String(
                    rawMessage.conversationId || conversation._id
                ),
                text: rawMessage.body,
                sender: rawMessage.senderType, // "customer" | "agent"
                time: rawMessage.createdAt,
                status: rawMessage.status || "received",
            };

            const convId = String(conversation._id);

            setConversations((prev) => {
                let exists = false;

                const updated = prev.map((c) => {
                    if (String(c.id) === convId) {
                        exists = true;
                        return {
                            ...c,
                            lastMessage: uiMessage.text || c.lastMessage,
                            lastMessageAt: uiMessage.time || c.lastMessageAt,
                            messages: [...(c.messages || []), uiMessage],
                            unread:
                                convId === String(selectedChatId)
                                    ? c.unread || 0
                                    : (c.unread || 0) + 1,
                        };
                    }
                    return c;
                });

                if (!exists) {
                    const normalizedConv = {
                        id: convId,
                        _id: conversation._id,
                        name:
                            conversation.name ||
                            conversation.phone ||
                            "Unknown",
                        phone: conversation.phone,
                        lastMessage: uiMessage.text,
                        lastMessageAt: uiMessage.time,
                        unread: 1,
                        messages: [uiMessage],
                    };
                    return [normalizedConv, ...updated];
                }

                return updated;
            });
        };

        socket.on("newMessage", handler);
        return () => socket.off("newMessage", handler);
    }, [socket, selectedChatId]);

    // --------------------------------------
    // BACKEND SYNC (FETCH DATA)
    // --------------------------------------

    // Fetch conversations on mount
    useEffect(() => {
        const load = async () => {
            try {
                const data = await getConversations();

                const normalized = (data || []).map((c) => {
                    const id = String(c._id || c.id);
                    return {
                        ...c,
                        id,
                        name: c.name || c.displayName || c.phone || "Unknown",
                        phone: c.phone,
                        lastMessage: c.lastMessage || "",
                        lastMessageAt: c.updatedAt || c.createdAt,
                        unread: c.unreadCount || 0,
                        messages: c.messages || [],
                    };
                });

                setConversations(normalized);
                if (normalized.length > 0) {
                    setSelectedChatId(normalized[0].id);
                }
            } catch (err) {
                console.error("getConversations failed:", err);
            }
        };

        load();
    }, []);

    // Fetch messages when selecting chat
    useEffect(() => {
        if (!selectedChatId) return;

        const loadMessages = async () => {
            try {
                const msgs = await getConversationMessages(selectedChatId);

                const uiMessages = (msgs || []).map((m) => ({
                    id: m._id,
                    conversationId: String(m.conversationId),
                    text: m.body,
                    sender: m.senderType, // "agent" | "customer"
                    time: m.createdAt,
                    status: m.status || "sent",
                }));

                setConversations((prev) =>
                    prev.map((c) =>
                        String(c.id) === String(selectedChatId)
                            ? { ...c, messages: uiMessages }
                            : c
                    )
                );
            } catch (err) {
                console.log(
                    "getConversationMessages failed, keeping existing messages"
                );
            }
        };

        loadMessages();
    }, [selectedChatId]);

    // --------------------------------------
    // FILTER, SELECTED CHAT
    // --------------------------------------

    const selectedChat = useMemo(
        () =>
            conversations.find(
                (c) => String(c.id) === String(selectedChatId)
            ) || null,
        [conversations, selectedChatId]
    );

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return conversations;

        const q = searchQuery.toLowerCase();

        return conversations.filter((c) => {
            const name = (c.name || "").toLowerCase();
            const last = (c.lastMessage || "").toLowerCase();
            const phone = (c.phone || "").toLowerCase();
            return name.includes(q) || last.includes(q) || phone.includes(q);
        });
    }, [conversations, searchQuery]);

    // conversations mapped for ChatLayout
    const layoutConversations = useMemo(
        () =>
            filtered.map((c) => ({
                id: String(c.id),
                name: c.name,
                phone: c.phone,
                lastMessage: c.lastMessage,
                lastMessageAt: c.lastMessageAt,
                unread: c.unread || 0,
                initials: (c.name || c.phone || "?").slice(0, 2).toUpperCase(),
            })),
        [filtered]
    );

    // messages mapped for ChatLayout
    const layoutMessages = useMemo(() => {
        if (!selectedChat) return [];
        return (selectedChat.messages || []).map((m) => ({
            id: m.id || m._id,
            text: m.text || m.body,
            body: m.text || m.body,
            timestamp: m.time || m.createdAt,
            direction:
                m.sender === "agent" || m.senderType === "agent"
                    ? "outgoing"
                    : "incoming",
            fromMe: m.sender === "agent" || m.senderType === "agent",
            status: m.status || "sent",
        }));
    }, [selectedChat]);

    // --------------------------------------
    // SEND MESSAGE
    // --------------------------------------

    const handleSend = async (textFromLayout) => {
        const content = (textFromLayout ?? message).trim();
        if (!content || !selectedChat) return;

        const currentChatId = selectedChat.id;
        const time = new Date().toISOString();

        const optimisticMessage = {
            id: Date.now(),
            conversationId: currentChatId,
            text: content,
            sender: "agent",
            time,
            status: "sending",
        };

        setConversations((prev) =>
            prev.map((c) =>
                String(c.id) === String(currentChatId)
                    ? {
                          ...c,
                          messages: [...(c.messages || []), optimisticMessage],
                          lastMessage: content,
                          lastMessageAt: time,
                      }
                    : c
            )
        );

        setMessage("");

        try {
            const saved = await sendMessage(
                currentChatId,
                selectedChat.phone,
                content
            );

            const uiSaved = {
                id: saved._id,
                conversationId: String(saved.conversationId),
                text: saved.body,
                sender: saved.senderType,
                time: saved.createdAt,
                status: saved.status || "sent",
            };

            setConversations((prev) =>
                prev.map((c) =>
                    String(c.id) === String(currentChatId)
                        ? {
                              ...c,
                              lastMessage: uiSaved.text,
                              lastMessageAt: uiSaved.time,
                              messages: (c.messages || []).map((m) =>
                                  m.id === optimisticMessage.id ? uiSaved : m
                              ),
                          }
                        : c
                )
            );
        } catch (err) {
            console.error("Failed to send message:", err);

            setConversations((prev) =>
                prev.map((c) =>
                    String(c.id) === String(currentChatId)
                        ? {
                              ...c,
                              messages: (c.messages || []).map((m) =>
                                  m.id === optimisticMessage.id
                                      ? { ...m, status: "failed" }
                                      : m
                              ),
                          }
                        : c
                )
            );
        }
    };

    //---------------------------------------
    // Handle buttons
    //---------------------------------------

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setPendingFile(file);

        // TODO: call backend sendImage/sendDocument depending on file type
        // Example:
        // await sendImage(selectedChatId, selectedChat.phone, file);
    };

    const handleEmojiSelect = (emoji) => {
        setMessage((prev) => prev + emoji);
        setShowEmojiPicker(false);
    };

    // --------------------------------------
    // RENDER
    // --------------------------------------

    return (
        <div className="h-screen flex bg-gray-100">
            <Sidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            <div className="flex-1 flex min-w-0">
                {activeTab === "chats" && (
                    <div className="flex-1 min-w-0">
                        <ChatLayout
                            conversations={conversations}
                            activeConversationId={selectedChatId}
                            onSelectConversation={setSelectedChatId}
                            messages={selectedChat?.messages || []}
                            onSendMessage={handleSend}
                            composerValue={message}
                            setComposerValue={setMessage}
                            onAttachClick={handleAttachClick}
                            onEmojiClick={() => setShowEmojiPicker((v) => !v)}
                            contactName={selectedChat?.name}
                            contactPhone={selectedChat?.phone}
                        />

                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={handleFileSelected}
                        />

                        {showEmojiPicker && (
                            <EmojiPicker
                                onEmojiClick={(e) => handleEmojiSelect(e.emoji)}
                            />
                        )}
                    </div>
                )}

                {activeTab === "broadcast" && <BroadcastView />}

                {activeTab === "analytics" && (
                    <AnalyticsView
                        stats={ANALYTICS_STATS}
                        messageVolume={MESSAGE_VOLUME}
                        maxVolume={maxVolume}
                    />
                )}

                {activeTab === "contacts" && (
                    <ContactsPage
                        onOpenConversation={(conv) => {
                            if (!conv?._id && !conv?.id) return;
                            const id = String(conv._id || conv.id);
                            setActiveTab("chats");
                            setSelectedChatId(id);
                        }}
                    />
                )}

                {activeTab === "settings" && <SettingsView />}
            </div>
        </div>
    );
};

export default WhatsAppDashboard;
