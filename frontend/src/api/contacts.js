import api from "./axios";

export async function getContacts(query = "") {
  const params = {};
  if (query && query.trim()) params.q = query.trim();

  const res = await api.get("/contacts", { params });
  return res.data;
}

export async function createContact(payload) {
  const res = await api.post("/contacts", payload);
  return res.data;
}

export async function updateContact(id, payload) {
  const res = await api.put(`/contacts/${id}`, payload);
  return res.data;
}

export async function deleteContact(id) {
  const res = await api.delete(`/contacts/${id}`);
  return res.data;
}