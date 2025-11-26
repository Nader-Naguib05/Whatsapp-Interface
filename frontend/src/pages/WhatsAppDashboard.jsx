// src/pages/WhatsAppDashboard.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useReducer,
} from "react";
const BACKEND = import.meta.env.VITE_API_URL;

import Sidebar from "../components/layout/Sidebar";
import BroadcastView from "../components/broadcast/BroadcastView";
import AnalyticsView from "../components/analytics/AnalyticsView";
import ContactsPage from "./ContactsPage";
import SettingsView from "../components/settings/SettingsView";
import ChatLayout from "../components/chats/ChatLayout";

import {
  ANALYTICS_STATS,
  MESSAGE_VOLUME,
  maxVolume,
} from "../data/mockData";

import {
  getConversations,
  getConversationMessages,
} from "../api/conversations";

import { createSocket } from "../lib/socket";
// import EmojiPicker from "emoji-picker-react";

const PAGE_SIZE = 40;

const initialState = {
  conversations: [],
  messagesByConv: {}, // { [convId]: Message[] }
  activeConversationId: null,
  composerValue: "",
  messagePagingByConv: {}, // { [convId]: { cursor, hasMore, loading } }
};

function getMessageKey(m) {
  return m.msgId || m.id || m._id || m.clientId;
}

function prependMessages(existing, incoming) {
  if (!incoming || incoming.length === 0) return existing || [];
  const existingKeys = new Set(
    (existing || []).map((m) => getMessageKey(m)).filter(Boolean)
  );
  const result = [];
  for (const msg of incoming) {
    const key = getMessageKey(msg);
    if (key && existingKeys.has(key)) continue;
    result.push(msg);
  }
  return [...result, ...(existing || [])];
}

function upsertMessageInArray(arr, msg) {
  const idx = arr.findIndex((m) => {
    const mk = getMessageKey(m);
    const nk = getMessageKey(msg);
    return mk && nk && mk === nk;
  });
  if (idx === -1) return [...arr, msg];

  const copy = [...arr];
  copy[idx] = { ...copy[idx], ...msg };
  return copy;
}

function reducer(state, action) {
  switch (action.type) {
    case "SET_CONVERSATIONS":
      return {
        ...state,
        conversations: action.payload || [],
      };

    case "SET_ACTIVE_CONVERSATION":
      return {
        ...state,
        activeConversationId: action.payload,
      };

    case "SET_COMPOSER":
      return {
        ...state,
        composerValue: action.payload,
      };

    case "SET_MESSAGES_FOR_CONV": {
      const { conversationId, messages } = action.payload;
      return {
        ...state,
        messagesByConv: {
          ...state.messagesByConv,
          [conversationId]: messages || [],
        },
      };
    }

    case "PREPEND_MESSAGES_FOR_CONV": {
      const { conversationId, messages } = action.payload;
      const prev = state.messagesByConv[conversationId] || [];
      const merged = prependMessages(prev, messages);
      return {
        ...state,
        messagesByConv: {
          ...state.messagesByConv,
          [conversationId]: merged,
        },
      };
    }

    case "ADD_LOCAL_MESSAGE": {
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

    case "UPDATE_MESSAGE_STATUS": {
      const { conversationId, messageId, status } = action.payload;
      const prev = state.messagesByConv[conversationId] || [];
      const updated = prev.map((m) => {
        const same =
          m.msgId === messageId ||
          m.clientId === messageId ||
          m.id === messageId ||
          m._id === messageId;
        if (!same) return m;
        return { ...m, status };
      });
      return {
        ...state,
        messagesByConv: {
          ...state.messagesByConv,
          [conversationId]: updated,
        },
      };
    }

    case "UPDATE_CONVERSATION_META": {
      const { conversationId, patch } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          String(c.id) === String(conversationId)
            ? { ...c, ...patch }
            : c
        ),
      };
    }

    // put conversation at top (for new messages)
    case "UPSERT_CONVERSATION_TOP": {
      const { conversationId, data } = action.payload;
      const idStr = String(conversationId);
      const existing = state.conversations.find(
        (c) => String(c.id) === idStr
      );
      const base = existing || { id: idStr, ...data };
      const merged = { ...base, ...data };

      const others = state.conversations.filter(
        (c) => String(c.id) !== idStr
      );

      return {
        ...state,
        conversations: [merged, ...others],
      };
    }

    case "SET_MESSAGE_PAGING": {
      const { conversationId, meta } = action.payload;
      return {
        ...state,
        messagePagingByConv: {
          ...state.messagePagingByConv,
          [conversationId]: {
            ...(state.messagePagingByConv[conversationId] || {}),
            ...meta,
          },
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
  const [searchQuery, setSearchQuery] = useState("");

  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    conversations,
    messagesByConv,
    activeConversationId,
    composerValue,
    messagePagingByConv,
  } = state;

  const activeConversation =
    conversations.find(
      (c) => String(c.id) === String(activeConversationId || "")
    ) || null;

  const activeMessages = messagesByConv[activeConversationId] || [];
  const activePaging =
    messagePagingByConv[activeConversationId] || {
      cursor: null,
      hasMore: false,
      loading: false,
    };

  // --- socket setup ---
  useEffect(() => {
    const s = createSocket();
    setSocket(s);

    s.on("connect", () => console.log("Socket connected:", s.id));
    s.on("disconnect", () => console.log("Socket disconnected"));

    return () => {
      s.disconnect();
    };
  }, []);

  // join / leave active conversation room
  useEffect(() => {
    if (!socket || !activeConversationId) return;

    if (
      prevChatRef.current &&
      prevChatRef.current !== activeConversationId
    ) {
      socket.emit("leaveConversation", prevChatRef.current);
    }

    socket.emit("joinConversation", activeConversationId);
    prevChatRef.current = activeConversationId;
  }, [socket, activeConversationId]);

  // ALSO join all known conversations so sidebar gets updates
  useEffect(() => {
    if (!socket) return;
    conversations.forEach((c) => {
      const id = String(c.id);
      socket.emit("joinConversation", id);
    });
  }, [socket, conversations]);

  // helper to load a page of messages
  const loadMessagesPage = async (
    conversationId,
    cursor,
    replace = false
  ) => {
    if (!conversationId) return;

    dispatch({
      type: "SET_MESSAGE_PAGING",
      payload: {
        conversationId,
        meta: { loading: true },
      },
    });

    try {
      const res = await getConversationMessages(conversationId, {
        cursor,
        limit: PAGE_SIZE,
      });

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
        type: "SET_MESSAGE_PAGING",
        payload: {
          conversationId,
          meta: {
            loading: false,
            cursor: nextCursor,
            hasMore,
          },
        },
      });
    } catch (err) {
      console.error("loadMessagesPage failed:", err);
      dispatch({
        type: "SET_MESSAGE_PAGING",
        payload: {
          conversationId,
          meta: { loading: false },
        },
      });
    }
  };

  // socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ conversation, message: raw }) => {
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
        timestamp: raw.createdAt,
        status:
          raw.status ||
          (senderType === "agent" ? "sent" : "received"),
        msgId: raw.msgId,
      };

      // keep messages in sync for the active chat
      dispatch({
        type: "UPSERT_MESSAGE",
        payload: { conversationId: convId, msg: uiMsg },
      });

      const isActive =
        String(activeConversationId) === convId;

      // bump conversation to top + update meta
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
            lastMessage: uiMsg.text,
            lastMessageAt: uiMsg.timestamp,
            unread: isActive
              ? 0
              : (conversation.unread ||
                  conversation.unreadCount ||
                  0) + 1,
            unreadCount: isActive
              ? 0
              : (conversation.unreadCount ||
                  conversation.unread ||
                  0) + 1,
          },
        },
      });
    };

    const handleMessageAck = (serverMsg) => {
      const convId = String(
        serverMsg.conversationId || serverMsg.chatId
      );
      const clientId = serverMsg.clientId;
      if (!convId || !clientId) return;

      const uiMsg = {
        id: serverMsg._id,
        clientId,
        conversationId: convId,
        text: serverMsg.body,
        body: serverMsg.body,
        mediaUrl: serverMsg.mediaUrl,
        senderType: serverMsg.senderType || "agent",
        fromMe: true,
        from: "business",
        timestamp: serverMsg.createdAt,
        status: serverMsg.status || "sent",
        msgId: serverMsg.msgId,
      };

      dispatch({
        type: "SERVER_ACK_MESSAGE",
        payload: {
          conversationId: convId,
          clientId,
          serverMsg: uiMsg,
        },
      });

      dispatch({
        type: "UPSERT_CONVERSATION_TOP",
        payload: {
          conversationId: convId,
          data: {
            lastMessage: uiMsg.text,
            lastMessageAt: uiMsg.timestamp,
          },
        },
      });
    };

    const handleMessageStatus = ({
      conversationId,
      messageId,
      status,
    }) => {
      const convId = String(conversationId);
      if (!convId || !messageId || !status) return;

      dispatch({
        type: "UPDATE_MESSAGE_STATUS",
        payload: {
          conversationId: convId,
          messageId,
          status,
        },
      });
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageAck", handleMessageAck);
    socket.on("messageStatus", handleMessageStatus);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageAck", handleMessageAck);
      socket.off("messageStatus", handleMessageStatus);
    };
  }, [socket, activeConversationId]);

  // --- fetch conversations on mount ---
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getConversations();

        const normalized = (data || []).map((c) => {
          const id = String(c._id || c.id);
          return {
            ...c,
            id,
            name:
              c.name || c.displayName || c.phone || "Unknown",
            phone: c.phone,
            lastMessage: c.lastMessage || "",
            lastMessageAt: c.lastMessageAt || c.updatedAt || c.createdAt,
            unread: c.unreadCount || c.unread || 0,
            unreadCount: c.unreadCount || c.unread || 0,
          };
        });

        dispatch({
          type: "SET_CONVERSATIONS",
          payload: normalized,
        });

        if (normalized.length > 0) {
          const firstId = normalized[0].id;
          dispatch({
            type: "SET_ACTIVE_CONVERSATION",
            payload: firstId,
          });

          // initial page of messages for first convo
          loadMessagesPage(firstId, null, true);
        }
      } catch (err) {
        console.error("getConversations failed:", err);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetch messages when active chat changes
  useEffect(() => {
    if (!activeConversationId) return;
    loadMessagesPage(String(activeConversationId), null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  const filteredConversations = useMemo(() => {
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

  const layoutConversations = useMemo(
    () =>
      filteredConversations.map((c) => ({
        id: String(c.id),
        _id: c._id,
        name: c.name,
        phone: c.phone,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        unread: c.unreadCount || c.unread || 0,
        initials: (c.name || c.phone || "?")
          .slice(0, 2)
          .toUpperCase(),
      })),
    [filteredConversations]
  );

  const layoutMessages = useMemo(
    () =>
      activeMessages.map((m) => ({
        id: m.id || m._id,
        clientId: m.clientId,
        text: m.text || m.body,
        body: m.text || m.body,
        timestamp:
          m.timestamp || m.time || m.createdAt,
        senderType: m.senderType || m.sender,
        fromMe: m.fromMe,
        from: m.from,
        status: m.status || "sent",
        mediaUrl: m.mediaUrl,
        msgId: m.msgId,
      })),
    [activeMessages]
  );

  const handleSelectConversation = async (convId) => {
    dispatch({
      type: "SET_ACTIVE_CONVERSATION",
      payload: convId,
    });

    // Reset locally
    dispatch({
      type: "UPDATE_CONVERSATION_META",
      payload: {
        conversationId: convId,
        patch: { unread: 0, unreadCount: 0 },
      },
    });

    // Reset in database
    try {
      await fetch(`${BACKEND}/conversations/reset-unread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId }),
      });
    } catch (e) {
      console.error("Failed to reset unread:", e);
    }
  };

  const handleSend = (textFromLayout) => {
    const content = (textFromLayout ?? composerValue).trim();
    if (!content || !activeConversation) return;

    const convId = String(activeConversation.id);
    const time = new Date().toISOString();

    const clientId =
      "tmp-" +
      (crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now());

    const optimisticMessage = {
      clientId,
      conversationId: convId,
      text: content,
      body: content,
      senderType: "agent",
      fromMe: true,
      from: "business",
      timestamp: time,
      status: "sending",
    };

    dispatch({
      type: "ADD_LOCAL_MESSAGE",
      payload: {
        conversationId: convId,
        message: optimisticMessage,
      },
    });

    dispatch({
      type: "UPSERT_CONVERSATION_TOP",
      payload: {
        conversationId: convId,
        data: {
          lastMessage: content,
          lastMessageAt: time,
          unread: 0,
          unreadCount: 0,
        },
      },
    });

    if (socket) {
      socket.emit("message:send", {
        clientId,
        conversationId: convId,
        text: content,
      });
    }
  };

  const handleLoadOlderMessages = () => {
    const convId = String(activeConversationId);
    if (!convId) return;
    const meta =
      messagePagingByConv[convId] || {};
    if (meta.loading || meta.hasMore === false) return;

    loadMessagesPage(convId, meta.cursor, false);
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeConversationId) return;
    // TODO: integrate sendImage / sendDocument via REST
  };

  const handleEmojiSelect = (emoji) => {
    dispatch({
      type: "SET_COMPOSER",
      payload: composerValue + emoji,
    });
    setShowEmojiPicker(false);
  };

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
          <div className="flex-1 min-w-0 relative">
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
              onEmojiClick={() =>
                setShowEmojiPicker((v) => !v)
              }
              contactName={activeConversation?.name}
              contactPhone={activeConversation?.phone}
              hasMoreMessages={activePaging.hasMore}
              isLoadingMore={activePaging.loading}
              onLoadOlderMessages={
                handleLoadOlderMessages
              }
            />

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileSelected}
            />

            {showEmojiPicker && (
              <div className="absolute bottom-16 right-4 z-50">
                {/* <EmojiPicker
                  onEmojiClick={(e) =>
                    handleEmojiSelect(e.emoji)
                  }
                /> */}
              </div>
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
              dispatch({
                type: "SET_ACTIVE_CONVERSATION",
                payload: id,
              });
            }}
          />
        )}

        {activeTab === "settings" && <SettingsView />}
      </div>
    </div>
  );
};

export default WhatsAppDashboard;
