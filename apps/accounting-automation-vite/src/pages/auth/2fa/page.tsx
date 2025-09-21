"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function TwoFactorSetupPage() {
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const preAuth = localStorage.getItem("preAuthToken");
    if (!preAuth) {
      setError("Missing pre-auth token");
      return;
    }

   api("/auth/2fa/setup", {
  method: "POST",
  headers: { Authorization: `Bearer ${preAuth}` },
})
  .then((data) => {
    if (data.qr) setQr(data.qr);
    else setError("Failed to load 2FA setup");
  })
  .catch(() => setError("Failed to fetch 2FA setup"));

  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const preAuth = localStorage.getItem("preAuthToken");
      if (!preAuth) throw new Error("Missing pre-auth token");

     const res = await api("/auth/2fa/verify", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${preAuth}`,
  },
   body: JSON.stringify({ code }),
});


      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "2FA verification failed");
      }

      const data = await res.json();
      localStorage.setItem("token", data.accessToken);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.removeItem("preAuthToken");

      setSuccess(true);
      window.location.href = "/tenant/dashboard";
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // 🌌 Auth Components styled like Folks Finance
// TailwindCSS styling

// 🔐 2FA Setup
return (
  <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
    <div className="bg-gray-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-center text-white"> Setup Two-Factor Authentication</h2>

      {error && <p className="text-red-400 mb-3 text-center">{error}</p>}
      {success && <p className="text-green-400 mb-3 text-center"> 2FA setup complete!</p>}

      {qr ? (
        <div className="flex flex-col items-center mb-6">
          <p className="mb-2 text-gray-300">Scan this QR code in Google Authenticator:</p>
          <img src={qr} alt="2FA QR Code" className="w-40 h-40 rounded-lg shadow-md border border-gray-600" />
        </div>
      ) : (
        <p className="text-gray-400">Loading QR code...</p>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <input
          type="text"
          placeholder="Enter 6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full border border-gray-600 bg-gray-900 text-white px-4 py-3 rounded-lg text-center text-xl tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
          maxLength={6}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold shadow hover:opacity-90 disabled:opacity-50 transition"
        >
          {loading ? "Verifying..." : "Verify & Enable 2FA"}
        </button>
      </form>
    </div>
  </div>
);

}
