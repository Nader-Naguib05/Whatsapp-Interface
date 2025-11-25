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

// Contacts
import ContactsPage from "./ContactsPage";

// Settings
import SettingsView from "../components/settings/SettingsView";

// Data (only analytics/mock stats)
import {
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

  const [conversations, setConversations] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);

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

    return () => {
      s.disconnect();
    };
  }, []);

  // Join/leave conversation rooms when selected chat changes
  useEffect(() => {
    if (!socket || !selectedChatId) return;

    // leave previous
    if (prevChatRef.current && prevChatRef.current !== selectedChatId) {
      socket.emit("leaveConversation", prevChatRef.current);
    }

    // join new
    socket.emit("joinConversation", selectedChatId);
    prevChatRef.current = selectedChatId;
  }, [socket, selectedChatId]);

  // Handle incoming messages (real-time from backend via socket)
  useEffect(() => {
    if (!socket) return;

    const handler = ({ conversation, message: rawMessage }) => {
      console.log("SOCKET newMessage:", { conversation, rawMessage });

      // Map backend messageDoc -> UI message shape
      const uiMessage = {
        id: rawMessage._id,
        conversationId: rawMessage.conversationId,
        text: rawMessage.body,
        sender: rawMessage.senderType, // "customer" | "agent"
        time: rawMessage.createdAt,
        status: rawMessage.status,
      };

      setConversations((prev) => {
        let exists = false;

        const updated = prev.map((c) => {
          if (String(c._id) === String(conversation._id)) {
            exists = true;
            return {
              ...c,
              lastMessage: uiMessage.text || c.lastMessage,
              updatedAt: uiMessage.time || c.updatedAt,
              messages: [...(c.messages || []), uiMessage],
              // simple unread increment if not currently selected
              unreadCount:
                String(c._id) === String(selectedChatId)
                  ? c.unreadCount || 0
                  : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        });

        // If conversation was not already in list, add it
        if (!exists) {
          const normalizedConv = {
            ...conversation,
            name: conversation.name || conversation.phone || "Unknown",
            messages: [uiMessage],
            unreadCount: 1,
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

        // Normalize conversation objects for UI
        const normalized = (data || []).map((c) => ({
          ...c,
          name: c.name || c.displayName || c.phone || "Unknown",
          messages: c.messages || [], // ensure messages exists
        }));

        setConversations(normalized);
        if (normalized.length > 0) {
          setSelectedChatId(normalized[0]._id);
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

        // Map backend messages -> UI message shape
        const uiMessages = (msgs || []).map((m) => ({
          id: m._id,
          conversationId: m.conversationId,
          text: m.body,
          sender: m.senderType,
          time: m.createdAt,
          status: m.status,
        }));

        setConversations((prev) =>
          prev.map((c) =>
            String(c._id) === String(selectedChatId)
              ? { ...c, messages: uiMessages }
              : c
          )
        );
      } catch (err) {
        console.log("getConversationMessages failed, keeping existing messages");
      }
    };

    loadMessages();
  }, [selectedChatId]);

  // --------------------------------------
  // FILTER, SELECTED CHAT
  // --------------------------------------

  const selectedChat = useMemo(
    () =>
      conversations.find((c) => String(c._id) === String(selectedChatId)) ||
      null,
    [conversations, selectedChatId]
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const q = searchQuery.toLowerCase();

    return conversations.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const last = (c.lastMessage || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      return (
        name.includes(q) ||
        last.includes(q) ||
        phone.includes(q)
      );
    });
  }, [conversations, searchQuery]);

  // --------------------------------------
  // SEND MESSAGE
  // --------------------------------------

  const handleSend = async () => {
    if (!message.trim() || !selectedChat) return;

    const currentChatId = selectedChat._id;
    const time = new Date().toISOString();

    const optimisticMessage = {
      id: Date.now(),
      conversationId: currentChatId,
      text: message,
      sender: "agent",
      time,
      status: "sending",
    };

    // Optimistic UI
    setConversations((prev) =>
      prev.map((c) =>
        String(c._id) === String(currentChatId)
          ? { ...c, messages: [...(c.messages || []), optimisticMessage] }
          : c
      )
    );

    const toSend = message;
    setMessage("");

    try {
      const saved = await sendMessage(currentChatId, toSend);

      const uiSaved = {
        id: saved._id,
        conversationId: saved.conversationId,
        text: saved.body,
        sender: saved.senderType,
        time: saved.createdAt,
        status: saved.status,
      };

      // Replace optimistic message with saved one
      setConversations((prev) =>
        prev.map((c) =>
          String(c._id) === String(currentChatId)
            ? {
                ...c,
                lastMessage: uiSaved.text,
                messages: (c.messages || []).map((m) =>
                  m.id === optimisticMessage.id ? uiSaved : m
                ),
              }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to send message:", err);

      // Mark optimistic message as failed
      setConversations((prev) =>
        prev.map((c) =>
          String(c._id) === String(currentChatId)
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

        {activeTab === "contacts" && (
          <ContactsPage
            onOpenConversation={(conv) => {
              if (!conv?._id) return;
              setActiveTab("chats");
              setSelectedChatId(conv._id);
            }}
          />
        )}

        {activeTab === "settings" && <SettingsView />}
      </div>
    </div>
  );
};

export default WhatsAppDashboard;
