// src/hooks/useAuth.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

type Role = "owner" | "tenant" | null;
type User = { id: string; email: string; role: Role; tenantId?: string } | null;
type AuthContextValue = {
  user: User;
  role: Role;
  loading: boolean;
  setTokenAndUser: (token: string, user?: User, refreshToken?: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<Role>(null);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem("token");
     if (!token) {
  setLoading(false);
  return;
}

try {
  const res = await api("/auth/me");
  if (!res.user) throw new Error("No user in response");

  setUser(res.user);
  setRole(res.user.role?.toLowerCase() === "owner" ? "owner" : "tenant");
} catch {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  setUser(null);
  setRole(null);
} finally {
  setLoading(false); // 👈 ensure this
}

    };
    verify();
  }, []);

  const setTokenAndUser = (token: string, maybeUser?: User, refreshToken?: string) => {
    localStorage.setItem("token", token);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
   if (maybeUser) {
  if (maybeUser.tenantId) {
    localStorage.setItem("tenantId", maybeUser.tenantId);
  } else {
    localStorage.removeItem("tenantId");
  }
  setUser(maybeUser);
  setRole(maybeUser.role);
}
  }

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("preAuthToken");
    setUser(null);
    setRole(null);
    window.location.href = "/auth/login";
  };

  return (
    <AuthContext.Provider
      value={{ user, role, loading, setTokenAndUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
