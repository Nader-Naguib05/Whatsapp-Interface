import api from "./axios";

export const sendMessage = async (conversationId, to, body) => {
  const { data } = await api.post("/messages/sendText", { conversationId, to, body });
  return data;
};
