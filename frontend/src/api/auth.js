import api from "./axios";

// ------------------------
// LOGIN
// ------------------------
export const login = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });

  // store token
  localStorage.setItem("token", data.token);

  // attach to axios for future API calls
  api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;

  return data;
};

// ------------------------
// LOGOUT
// ------------------------
export const logout = () => {
  localStorage.removeItem("token");
  delete api.defaults.headers.common["Authorization"];
};

// ------------------------
// GET CURRENT USER
// /auth/me
// ------------------------
export const getCurrentUser = async () => {
  const token = localStorage.getItem("token");

  if (!token) return null;

  try {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    const { data } = await api.get("/auth/me");
    return data;
  } catch (err) {
    console.warn("Auth error:", err.response?.data || err.message);

    // token expired or invalid
    logout();
    return null;
  }
};
