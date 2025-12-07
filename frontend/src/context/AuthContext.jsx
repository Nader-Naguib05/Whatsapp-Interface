// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { login as loginApi, logout as logoutApi, getCurrentUser } from "../api/auth";
import api from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore token from storage on first load
  useEffect(() => {
    const savedToken = localStorage.getItem("token");

    if (savedToken) {
      setToken(savedToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;

      getCurrentUser()
        .then((me) => {
          setUser(me);
          setReady(true);
        })
        .catch(() => {
          // token invalid → cleanup
          localStorage.removeItem("token");
          delete api.defaults.headers.common["Authorization"];
          setUser(null);
          setToken(null);
          setReady(true);
        });
    } else {
      setReady(true);
    }
  }, []);

  // LOGIN
  const login = async (email, password) => {
    const data = await loginApi(email, password);

    // Save token & user
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);

    // Inject into axios for all future requests
    api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;

    return data;
  };

  // LOGOUT
  const logout = () => {
    logoutApi();
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
