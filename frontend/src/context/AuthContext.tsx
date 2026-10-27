/**
 * frontend/src/context/AuthContext.tsx
 *
 * AuthContext providing user profile & active role.
 * Reads token and current user info from localStorage or mock/default for dev session.
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile, Role } from "../types";

interface AuthContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  token: null,
  setToken: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(
    localStorage.getItem("auth_token") || null
  );

  const [user, setUserState] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem("auth_user");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    // Default fallback user for active laboratory session
    return {
      id: "u-analyst-1",
      fullName: "Lab Analyst",
      role: "admin" as Role,
      active: true,
    };
  });

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem("auth_token", newToken);
    } else {
      localStorage.removeItem("auth_token");
    }
  };

  const setUser = (newUser: UserProfile | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem("auth_user", JSON.stringify(newUser));
    } else {
      localStorage.removeItem("auth_user");
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const storedToken = localStorage.getItem("auth_token");
      setTokenState(storedToken);
      const storedUser = localStorage.getItem("auth_user");
      if (storedUser) {
        try {
          setUserState(JSON.parse(storedUser));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, token, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
