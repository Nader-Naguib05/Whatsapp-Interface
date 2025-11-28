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
const normalizePhone = (phone) =>
  (phone || "").toString().replace(/\D/g, "");

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
          String(c.id) === String(conversationId) ? { ...c, ...patch } : c
        ),
      };
    }

    // put conversation at top (for new messages or newly created)
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
    conversations.find(
      (c) => String(c.id) === String(activeConversationId || "")
    ) || null;

  const activePhone = activeConversation?.phone;
  const activePhoneKey = normalizePhone(activePhone);
  const activeContact =
    activePhoneKey && contactsMap[activePhoneKey]
      ? contactsMap[activePhoneKey]
      : null;

  const activeMessages = messagesByConv[activeConversationId] || [];
  const activePaging = messagePagingByConv[activeConversationId] || {
    cursor: null,
    hasMore: false,
    loading: false,
  };

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

  // --- notification sound setup (place file at /public/sounds/new-message.mp3) ---
  useEffect(() => {
    if (typeof Audio === "undefined") return;
    try {
      notificationAudioRef.current = new Audio("/sounds/new-message.mp3");
    } catch {
      notificationAudioRef.current = null;
    }
  }, []);

  const triggerNewMessageNotification = () => {
    const audio = notificationAudioRef.current;
    if (!audio) return;
    if (!hasWindowFocusRef.current) {
      audio
        .play()
        .catch(() => {
          // ignore autoplay errors
        });
    }
  };

  // --- global unread + dynamic document title ---
  useEffect(() => {
    const total =
      (conversations || []).reduce(
        (sum, c) => sum + (c.unreadCount || c.unread || 0),
        0
      ) || 0;
    setGlobalUnread(total);
  }, [conversations]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const baseTitle = "WhatsApp Inbox";
    if (globalUnread > 0) {
      document.title = `(${globalUnread}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [globalUnread]);

  // --- reusable load contacts (initial + after changes) ---
  const loadContacts = async () => {
    try {
      const res = await fetch(`${BACKEND}/contacts`);
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const data = await res.json();
      setContacts(data || []);
      const map = {};
      (data || []).forEach((c) => {
        if (c.phone) {
          const key = normalizePhone(c.phone);
          if (key) {
            map[key] = c;
          }
        }
      });
      setContactsMap(map);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
  };

  // load contacts once on mount
  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    if (prevChatRef.current && prevChatRef.current !== activeConversationId) {
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
  const loadMessagesPage = async (conversationId, cursor, replace = false) => {
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

  // socket events (messages, statuses, typing, presence)
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ conversation, message: raw }) => {
      if (!conversation || !raw) return;

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
        status: raw.status || (senderType === "agent" ? "sent" : "received"),
        msgId: raw.msgId,
      };

      dispatch({
        type: "UPSERT_MESSAGE",
        payload: { conversationId: convId, msg: uiMsg },
      });

      const isActive = String(activeConversationId) === convId;
      const computedUnread =
        conversation.unreadCount ?? conversation.unread ?? 1;

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
            unread: isActive ? 0 : computedUnread,
            unreadCount: isActive ? 0 : computedUnread,
          },
        },
      });

      const isCustomer =
        senderType !== "agent" && senderType !== "business" && !uiMsg.fromMe;

      if (isCustomer && (!isActive || !hasWindowFocusRef.current)) {
        triggerNewMessageNotification();
      }
    };

    const handleMessageAck = (serverMsg) => {
      const convId = String(serverMsg.conversationId || serverMsg.chatId);
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

    const handleMessageStatus = ({ conversationId, messageId, status }) => {
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

    const handleConversationCreated = (conversation) => {
      if (!conversation) return;
      const convId = String(conversation._id || conversation.id);
      if (!convId) return;

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
            lastMessage: conversation.lastMessage || "",
            lastMessageAt:
              conversation.lastMessageAt ||
              conversation.updatedAt ||
              conversation.createdAt ||
              new Date().toISOString(),
            unread: conversation.unreadCount || conversation.unread || 0,
            unreadCount: conversation.unreadCount || conversation.unread || 0,
          },
        },
      });
    };

    const handleCustomerTyping = ({ conversationId }) => {
      const convId = String(conversationId);
      if (!convId) return;

      setTypingConversationId(convId);

      if (String(activeConversationId) === convId) {
        setIsCustomerTyping(true);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsCustomerTyping(false);
        setTypingConversationId(null);
      }, 3000);
    };

    const handleContactStatus = ({ conversationId, status }) => {
      const convId = String(conversationId);
      if (!convId) return;

      dispatch({
        type: "UPDATE_CONVERSATION_META",
        payload: {
          conversationId: convId,
          patch: { contactStatus: status },
        },
      });

      if (String(activeConversationId) === convId) {
        setContactStatus(
          status === "online" || status === "offline" ? status : null
        );
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageAck", handleMessageAck);
    socket.on("messageStatus", handleMessageStatus);
    socket.on("conversation:new", handleConversationCreated);
    socket.on("conversationCreated", handleConversationCreated);
    socket.on("customerTyping", handleCustomerTyping);
    socket.on("contactStatus", handleContactStatus);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageAck", handleMessageAck);
      socket.off("messageStatus", handleMessageStatus);
      socket.off("conversation:new", handleConversationCreated);
      socket.off("conversationCreated", handleConversationCreated);
      socket.off("customerTyping", handleCustomerTyping);
      socket.off("contactStatus", handleContactStatus);
    };
  }, [socket, activeConversationId]);

  // --- keep header presence in sync when switching convs ---
  useEffect(() => {
    if (!activeConversationId) {
      setContactStatus(null);
      return;
    }
    const conv = conversations.find(
      (c) => String(c.id) === String(activeConversationId)
    );
    setContactStatus(conv?.contactStatus || null);
  }, [activeConversationId, conversations]);

  // --- sync typing indicator to current conversation ---
  useEffect(() => {
    if (
      typingConversationId &&
      String(typingConversationId) === String(activeConversationId)
    ) {
      setIsCustomerTyping(true);
    } else {
      setIsCustomerTyping(false);
    }
  }, [typingConversationId, activeConversationId]);

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
            name: c.name || c.displayName || c.phone || "Unknown",
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
      return (
        name.includes(q) ||
        phone.includes(q) ||
        last.includes(q)
      );
    });
  }, [conversations, contactsMap, conversationSearch]);

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
        initials: (c.name || c.phone || "?").slice(0, 2).toUpperCase(),
        contactStatus: c.contactStatus,
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
        timestamp: m.timestamp || m.time || m.createdAt,
        senderType: m.senderType || m.sender,
        fromMe: m.fromMe,
        from: m.from,
        status: m.status || "sent",
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType,
        msgId: m.msgId,
        fileName: m.fileName || m.filename,
      })),
    [activeMessages]
  );

  const handleSelectConversation = async (convId) => {
    const idStr = String(convId);

    dispatch({
      type: "SET_ACTIVE_CONVERSATION",
      payload: idStr,
    });

    dispatch({
      type: "UPDATE_CONVERSATION_META",
      payload: {
        conversationId: idStr,
        patch: { unread: 0, unreadCount: 0 },
      },
    });

    try {
      await fetch(`${BACKEND}/conversations/reset-unread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: idStr }),
      });
    } catch (e) {
      console.error("Failed to reset unread:", e);
    }
  };

  const handleSend = (textFromLayout) => {
    const content = (textFromLayout ?? composerValue).trim();
    if (!content || !activeConversationId) return;

    const convId = String(activeConversation?.id || activeConversationId);
    const time = new Date().toISOString();

    const clientId =
      "tmp-" + (crypto.randomUUID ? crypto.randomUUID() : Date.now());

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

    if (!activeConversation) {
      dispatch({
        type: "UPSERT_CONVERSATION_TOP",
        payload: {
          conversationId: convId,
          data: {
            id: convId,
            name: "New contact",
            phone: "",
            lastMessage: content,
            lastMessageAt: time,
            unread: 0,
            unreadCount: 0,
          },
        },
      });
    }

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

  const handleRetryMessage = (msg) => {
    if (!socket || !msg) return;

    const convId = String(msg.conversationId || activeConversationId);
    const content = (msg.text || msg.body || "").trim();
    if (!convId || !content) return;

    const messageId =
      msg.clientId || msg.id || msg._id || msg.msgId;

    dispatch({
      type: "UPDATE_MESSAGE_STATUS",
      payload: {
        conversationId: convId,
        messageId,
        status: "sending",
      },
    });

    socket.emit("message:send", {
      clientId: msg.clientId,
      conversationId: convId,
      text: content,
    });
  };

  const handleLoadOlderMessages = () => {
    const convId = String(activeConversationId);
    if (!convId) return;
    const meta = messagePagingByConv[convId] || {};
    if (meta.loading || meta.hasMore === false) return;

    loadMessagesPage(convId, meta.cursor, false);
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
        : file.name,
      body: isImage
        ? "[Image]"
        : isVideo
        ? "[Video]"
        : isAudio
        ? "[Audio]"
        : file.name,
      senderType: "agent",
      fromMe: true,
      from: "business",
      timestamp: time,
      status: "sending",
      mediaUrl: localUrl,
      mediaType: mime,
      fileName: file.name,
    };

    dispatch({
      type: "ADD_LOCAL_MESSAGE",
      payload: {
        conversationId: convId,
        message: optimistic,
      },
    });

    dispatch({
      type: "UPSERT_CONVERSATION_TOP",
      payload: {
        conversationId: convId,
        data: {
          lastMessage: optimistic.text,
          lastMessageAt: time,
          unread: 0,
          unreadCount: 0,
        },
      },
    });

    try {
      const formData = new FormData();
      formData.append("conversationId", convId);
      formData.append("file", file);
      formData.append("mime", mime);

      const res = await fetch(`${BACKEND}/messages/uploadMedia`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const server = json.message;

      const uiMsg = {
        ...optimistic,
        id: server._id,
        timestamp: server.createdAt,
        status: server.status,
        mediaUrl: server.mediaUrl,
        msgId: server.msgId,
      };

      dispatch({
        type: "SERVER_ACK_MESSAGE",
        payload: { conversationId: convId, clientId, serverMsg: uiMsg },
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
    } catch (err) {
      console.error("Error sending media:", err);

      dispatch({
        type: "UPDATE_MESSAGE_STATUS",
        payload: {
          conversationId: convId,
          messageId: clientId,
          status: "failed",
        },
      });
    }
  };

  const handleEmojiSelect = (emojiChar) => {
    dispatch({
      type: "SET_COMPOSER",
      payload: composerValue + emojiChar,
    });
    setShowEmojiPicker(false);
  };

  // Add to contacts directly from chat header menu
  const handleAddToContacts = async (payload) => {
    if (!payload && !activeConversation) return;

    const rawPhone = payload?.phone || activePhone;
    const rawName =
      payload?.name ||
      activeContact?.name ||
      activeConversation?.name ||
      rawPhone;

    const phone = (rawPhone || "").toString().trim();
    const name = (rawName || "").toString().trim();

    if (!phone) {
      console.warn("Cannot add to contacts – missing phone", payload);
      return;
    }

    try {
      await fetch(`${BACKEND}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name: name || phone,
          notes: "",
        }),
      });

      // Refresh contacts & mapping so header + list immediately show the saved name
      await loadContacts();
    } catch (err) {
      console.error("Failed to create contact from chat:", err);
      // Even if it fails, we stay in chat and don't break anything.
    }
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
              onEmojiClick={() => setShowEmojiPicker((v) => !v)}
              contactName={activeContact?.name || activeConversation?.name}
              contactPhone={activePhone}
              hasMoreMessages={activePaging.hasMore}
              isLoadingMore={activePaging.loading}
              onLoadOlderMessages={handleLoadOlderMessages}
              onSearchChange={setConversationSearch}
              isCustomerTyping={isCustomerTyping}
              customerTypingText="Customer is typing…"
              contactStatus={contactStatus}
              onRetryMessage={handleRetryMessage}
              onAddToContacts={handleAddToContacts}
              isInContacts={!!activeContact}
            />

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileSelected}
            />

            {showEmojiPicker && (
              <div className="absolute bottom-16 right-4 z-50">
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
            stats={ANALYTICS_STATS}
            messageVolume={MESSAGE_VOLUME}
            maxVolume={maxVolume}
          />
        )}

        {activeTab === "contacts" && (
          <ContactsView
            onSelectContact={(contact) => {
              if (!contact?.phone) {
                setActiveTab("chats");
                return;
              }

              const existing = conversations.find(
                (c) =>
                  normalizePhone(c.phone) ===
                  normalizePhone(contact.phone)
              );

              if (!existing) {
                // No existing conversation yet; just go back to chats.
                setActiveTab("chats");
                return;
              }

              const id = String(existing.id || existing._id);

              dispatch({
                type: "UPSERT_CONVERSATION_TOP",
                payload: {
                  conversationId: id,
                  data: {
                    id,
                    _id: existing._id,
                    name:
                      contact.name ||
                      existing.name ||
                      existing.displayName ||
                      contact.phone,
                    phone: contact.phone || existing.phone,
                    lastMessage: existing.lastMessage || "",
                    lastMessageAt:
                      existing.lastMessageAt ||
                      existing.updatedAt ||
                      existing.createdAt ||
                      new Date().toISOString(),
                    unread: 0,
                    unreadCount: 0,
                  },
                },
              });

              setActiveTab("chats");
              dispatch({
                type: "SET_ACTIVE_CONVERSATION",
                payload: id,
              });
            }}
            onContactsChange={(list) => {
              setContacts(list || []);
              const map = {};
              (list || []).forEach((c) => {
                if (c.phone) {
                  const key = normalizePhone(c.phone);
                  if (key) {
                    map[key] = c;
                  }
                }
              });
              setContactsMap(map);
            }}
          />
        )}

        {activeTab === "settings" && <SettingsView />}
      </div>
    </div>
  );
};

export default WhatsAppDashboard;
