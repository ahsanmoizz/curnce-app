"use client";

import { useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function TwoFactorVerifyPage() {
  const { setTokenAndUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate(); // ✅ hook sahi jagah pe

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const code = formData.get("code");

    try {
      const preAuth = localStorage.getItem("preAuthToken");
      if (!preAuth) throw new Error("Missing pre-auth token");

     const data = await api("/auth/2fa/verify", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${preAuth}`,
  },
  body: JSON.stringify({ code }),
});

      const accessToken = data.accessToken ?? data.token ?? "";
      const refreshToken = data.refreshToken ?? "";

      if (!accessToken) throw new Error("No token returned");

      localStorage.setItem("token", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      if (data.tenantId) localStorage.setItem("tenantId", data.tenantId);

      // ✅ Always ensure user is set
      const user = data.user ?? (await api("/auth/me")).user;
      setTokenAndUser(accessToken, user, refreshToken);

      // ✅ Remove preAuthToken
      localStorage.removeItem("preAuthToken");

      // ✅ Navigate without reload
      navigate("/tenant/dashboard");
    } catch (err: any) {
      setError(err?.message || "Invalid 2FA code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Verify 2FA
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <form
        onSubmit={handleVerify}
        className="w-full max-w-md rounded-2xl bg-gray-800/80 backdrop-blur-xl p-8 shadow-2xl border border-gray-700"
      >
        <h2 className="mb-6 text-center text-2xl font-bold text-white">
          Two-Factor Authentication
        </h2>
        {error && <p className="mb-4 text-center text-sm text-red-400">{error}</p>}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-300">Enter Code</label>
          <input
            type="text"
            name="code"
            required
            maxLength={6}
            className="w-full rounded-lg border border-gray-600 bg-gray-900 text-white px-4 py-3 text-center text-xl tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-semibold text-white shadow hover:opacity-90 disabled:opacity-50 transition"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>
    </div>
  );
}
