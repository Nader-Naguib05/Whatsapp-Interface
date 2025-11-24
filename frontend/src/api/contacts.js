import api from "./axios";

export const getContacts = async () => {
  const { data } = await api.get("/contacts");
  return data;
};

export const createContact = async (body) => {
  const { data } = await api.post("/contacts/create", body);
  return data;
};
