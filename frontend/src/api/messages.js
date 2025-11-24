import api from "./axios";

export const sendMessage = async (conversationId, text) => {
  const { data } = await api.post("/messages/send", { conversationId, text });
  return data;
};
