import api from "./axios";

export const sendBroadcast = async (formData) => {
  const { data } = await api.post("/broadcast/send", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const scheduleBroadcast = async (payload) => {
  const { data } = await api.post("/broadcast/schedule", payload);
  return data;
};
