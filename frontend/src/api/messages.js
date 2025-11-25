import api from "./axios";

export const sendMessage = async (conversationId, text) => {
  const { data } = await api.post("/messages/sendText", { conversationId, text });
  return data;
};
