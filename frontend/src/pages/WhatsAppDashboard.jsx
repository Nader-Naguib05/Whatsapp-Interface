import React, { useState, useEffect, useMemo, useRef } from "react";

// Layout
import Sidebar from "../components/layout/Sidebar";

// Chats
import ChatList from "../components/chats/ChatList";
import ChatWindow from "../components/chats/ChatWindow";

// Broadcast
import BroadcastView from "../components/broadcast/BroadcastView";

// Analytics
import AnalyticsView from "../components/analytics/AnalyticsView";

import ContactsPage from "./ContactsPage";

// Settings
import SettingsView from "../components/settings/SettingsView";

// Data
import {
    INITIAL_CONVERSATIONS,
    ANALYTICS_STATS,
    MESSAGE_VOLUME,
    maxVolume,
} from "../data/mockData";

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

    const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
    const [selectedChatId, setSelectedChatId] = useState(
        INITIAL_CONVERSATIONS[0]?.id ?? null
    );

    const [message, setMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

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

        return () => s.disconnect();
    }, []);

    // Join/leave conversation rooms
    useEffect(() => {
        if (!socket || !selectedChatId) return;

        if (prevChatRef.current && prevChatRef.current !== selectedChatId) {
            socket.emit("leaveConversation", prevChatRef.current);
        }

        socket.emit("joinConversation", selectedChatId);
        prevChatRef.current = selectedChatId;
    }, [socket, selectedChatId]);

    // Handle incoming messages (real-time)
    useEffect(() => {
        if (!socket) return;

        const handler = (msg) => {
            setConversations((prev) =>
                prev.map((c) =>
                    c.id === msg.conversationId
                        ? {
                              ...c,
                              lastMessage: msg.text,
                              messages: [...c.messages, msg],
                          }
                        : c
                )
            );
        };

        socket.on("message:new", handler);
        return () => socket.off("message:new", handler);
    }, [socket]);

    // --------------------------------------
    // BACKEND SYNC (FETCH DATA)
    // --------------------------------------

    // Fetch conversations on mount
    useEffect(() => {
        const load = async () => {
            try {
                const data = await getConversations();
                setConversations(data);
            } catch (err) {
                console.log("Using mock conversations due to API error");
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

                setConversations((prev) =>
                    prev.map((c) =>
                        c.id === selectedChatId ? { ...c, messages: msgs } : c
                    )
                );
            } catch (err) {
                console.log("Using mock messages due to API error");
            }
        };

        loadMessages();
    }, [selectedChatId]);

    // --------------------------------------
    // FILTER, SELECTED CHAT
    // --------------------------------------

    const selectedChat = useMemo(
        () => conversations.find((c) => c.id === selectedChatId) || null,
        [conversations, selectedChatId]
    );

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return conversations;

        const q = searchQuery.toLowerCase();

        return conversations.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.lastMessage?.toLowerCase().includes(q) ||
                c.phone?.toLowerCase().includes(q)
        );
    }, [conversations, searchQuery]);

    // --------------------------------------
    // SEND MESSAGE
    // --------------------------------------

    const handleSend = async () => {
        if (!message.trim() || !selectedChat) return;

        const time = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        const optimisticMessage = {
            id: Date.now(),
            conversationId: selectedChat.id,
            text: message,
            sender: "agent",
            time,
            status: "sending",
        };

        // Optimistic UI
        setConversations((prev) =>
            prev.map((c) =>
                c.id === selectedChat.id
                    ? { ...c, messages: [...c.messages, optimisticMessage] }
                    : c
            )
        );

        const currentChatId = selectedChat.id;

        setMessage("");

        try {
            const saved = await sendMessage(currentChatId, message);

            // Replace optimistic message
            setConversations((prev) =>
                prev.map((c) =>
                    c.id === currentChatId
                        ? {
                              ...c,
                              messages: c.messages.map((m) =>
                                  m.id === optimisticMessage.id
                                      ? {
                                            id: saved._id,
                                            conversationId:
                                                saved.conversationId,
                                            text: saved.text,
                                            sender: saved.sender,
                                            time: saved.createdAt,
                                            status: saved.status,
                                        }
                                      : m
                              ),
                          }
                        : c
                )
            );
        } catch (err) {
            console.error("Failed to send message:", err);
        }
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
                    <>
                        {/* Chat List (left side) */}
                        <div className="w-96 border-r hidden md:block">
                            <ChatList
                                conversations={conversations}
                                filtered={filtered}
                                searchQuery={searchQuery}
                                setSearch={setSearchQuery}
                                selectedChatId={selectedChatId}
                                onSelect={setSelectedChatId}
                            />
                        </div>

                        {/* Chat Window */}
                        <div className="flex-1">
                            {/* Mobile Chat List */}
                            <div className="md:hidden border-b bg-white">
                                <ChatList
                                    conversations={conversations}
                                    filtered={filtered}
                                    searchQuery={searchQuery}
                                    setSearch={setSearchQuery}
                                    selectedChatId={selectedChatId}
                                    onSelect={setSelectedChatId}
                                />
                            </div>

                            <ChatWindow
                                chat={selectedChat}
                                message={message}
                                setMessage={setMessage}
                                onSend={handleSend}
                            />
                        </div>
                    </>
                )}

                {activeTab === "broadcast" && <BroadcastView />}

                {activeTab === "analytics" && (
                    <AnalyticsView
                        stats={ANALYTICS_STATS}
                        messageVolume={MESSAGE_VOLUME}
                        maxVolume={maxVolume}
                    />
                )}

                {activeTab === 'contacts' && <ContactsPage />}


                {activeTab === "settings" && <SettingsView />}
            </div>
        </div>
    );
};

export default WhatsAppDashboard;
