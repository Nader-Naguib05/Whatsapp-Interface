// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { login as loginApi, logout as logoutApi, getCurrentUser } from "../api/auth";
import api from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore token + fetch user
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      getCurrentUser().then((me) => {
        setUser(me);
        setReady(true);
      });
    } else {
      setReady(true);
    }
  }, []);

  // login handler
  const login = async (email, password) => {
    const data = await loginApi(email, password);
    setUser(data.user);
    return data;
  };

  // logout handler
  const logout = () => {
    logoutApi();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
