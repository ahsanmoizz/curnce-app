"use client";

import React, { useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
export default function LoginPage() {
  const { setTokenAndUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
 const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // ✅ 2FA flows
     if (data.require2FASetup) {
  localStorage.setItem("preAuthToken", data.tempToken);
  navigate("/auth/2fa"); // 👈 instead of window.location.href
  return;
}

if (data.require2FAVerify) {
  console.log("➡️ 2FA required, redirecting to verify page");
  localStorage.setItem("preAuthToken", data.tempToken);
  navigate("/auth/verify");
  return;
}

      // ✅ If full tokens returned -> normal login flow
      // ✅ If full tokens returned -> normal login flow
const accessToken = data.accessToken ?? data.token ?? "";
const refreshToken = data.refreshToken ?? "";

if (!accessToken) {
  throw new Error("No token returned");
}

localStorage.setItem("token", accessToken);
if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

// ✅ NEW: save tenantId from login response
if (data.tenantId) {
  localStorage.setItem("tenantId", data.tenantId);
}

// get logged in user
const me = await api("/auth/me");
const user = me.user || { id: "me", email };

if (user.tenantId) {
  localStorage.setItem("tenantId", user.tenantId); // 👈 fallback if not set earlier
}

setTokenAndUser(accessToken, user, refreshToken);
navigate("/tenant/dashboard"); 

   } catch (err: any) {
  console.error("Login failed:", err);

  if (err?.response?.data?.error) {
    setError(err.response.data.error); // backend error message
  } else if (typeof err?.message === "string") {
    const msg =
      err.message.length > 80
        ? "Something went wrong. Please try again."
        : err.message;
    setError(msg);
  } else {
    setError("Unexpected error occurred. Please try again.");
  }
}
  };

  // 🔑 Login
return (
  <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
    <div className="w-full max-w-md p-8 bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700">
      <h1 className="text-2xl font-bold text-center mb-6 text-white"> Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-600 bg-gray-900 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-600 bg-gray-900 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
        {error && <p className="text-red-400 text-center">{error}</p>}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold shadow hover:opacity-90 transition"
        >
          Login
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-400">
        Don’t have an account?{" "}
        <a href="/auth/register" className="text-blue-400 hover:underline">
          Register
        </a>
      </p>
    </div>
  </div>
);

}
