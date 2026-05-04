import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

const getUserFromResponse = (data) => data?.user || data?.data?.user || data?.data || data;
const getTokenFromResponse = (data) => data?.token || data?.data?.token;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("token")));

  useEffect(() => {
    let active = true;

    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        if (active) {
          setUser(getUserFromResponse(data));
        }
      } catch {
        localStorage.removeItem("token");
        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [token]);

  const login = async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    const nextToken = getTokenFromResponse(data);
    const nextUser = getUserFromResponse(data);

    if (!nextToken) {
      throw new Error("Login succeeded but no token was returned.");
    }

    localStorage.setItem("token", nextToken);
    setToken(nextToken);
    if (nextUser && nextUser.email) {
      setUser(nextUser);
    } else {
      const me = await api.get("/auth/me");
      setUser(getUserFromResponse(me.data));
    }
  };

  const signup = async (payload) => {
    const { data } = await api.post("/auth/signup", payload);
    const nextToken = getTokenFromResponse(data);

    if (nextToken) {
      localStorage.setItem("token", nextToken);
      setToken(nextToken);
      const nextUser = getUserFromResponse(data);
      setUser(nextUser?.email ? nextUser : null);
    }

    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token),
      isAdmin: user?.role === "admin",
      login,
      signup,
      logout,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
