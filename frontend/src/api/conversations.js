import api from "./axios";

// GET LIST OF CONVERSATIONS
// Supports: 
//   - Old mode: get all conversations
//   - New mode: get paginated conversations
export const getConversations = async (params = {}) => {
  const { data } = await api.get("/conversations", { params });
  return data;
};

// GET MESSAGES FOR ONE CONVERSATION
// Supports:
//   - Old mode: full messages array
//   - New mode: paginated messages (messages, nextCursor, hasMore)
export const getConversationMessages = async (conversationId, params = {}) => {
  const { data } = await api.get(`/conversations/${conversationId}`, { params });

  // If old backend returns { conversation, messages }
  if (Array.isArray(data)) return data;

  return data;
};
