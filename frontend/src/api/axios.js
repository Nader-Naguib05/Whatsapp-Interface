import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, 
});

// Inject token into every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Global error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.warn("Unauthorized → redirect to login");
      // logout logic goes here if needed
    }

    return Promise.reject(error);
  }
);

export default api;
