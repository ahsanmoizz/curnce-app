// src/pages/RegisterPage.tsx
import React, { useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../hooks/useAuth";
import { Link } from "react-router-dom";

export default function RegisterPage() {
  const { setTokenAndUser } = useAuth();
  const [form, setForm] = useState({
    tenantName: "",
    country: "",
    currency: "",
    name: "",
    email: "",
    password: "",
     profilePicture: "",
  });
  const [error, setError] = useState<string | null>(null);

  // preview/dataURI for tenant image
  const [preview, setPreview] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // file -> dataUrl
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    // limit size to ~1.5MB in base64
    if (file.size > 1_500_000) {
  setError("Image too large (max ~1.5MB). Please upload a smaller file.");
  e.target.value = ""; // clear invalid file
  return;
}
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.email)) {
    setError("Invalid email. Please re-enter a correct one.");
    return;
  }
    try {
      const payload = {
        tenantName: form.tenantName,
        country: form.country.toUpperCase(),
        currency: form.currency,
        name: form.name,
        email: form.email,
        password: form.password,
        // base64 data URL (or null)
        profilePicture: preview ?? null,
      };

      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (data.error) {
        throw new Error(data.error);
      }

      const accessToken = data.accessToken ?? data.token ?? "";
      const refreshToken = data.refreshToken ?? "";

      if (!accessToken) {
        throw new Error("Registration failed: no token returned");
      }

      localStorage.setItem("token", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

      // get /auth/me (server should return user)
      const me = await api("/auth/me");
      const user = me.user || { id: "me", email: form.email };
                   if (user.tenantId) {
  localStorage.setItem("tenantId", user.tenantId);
}
      setTokenAndUser(accessToken, user, refreshToken);

      window.location.href = "/tenant/dashboard";
   } catch (err: any) {
  console.error("Registration failed:", err);

  // If backend sent JSON error message
  if (err?.response?.data?.error) {
    setError(err.response.data.error);
  } else if (typeof err?.message === "string") {
    // Show clean message if short
    const msg = err.message.length > 80 ? "Something went wrong. Please try again." : err.message;
    setError(msg);
  } else {
    setError("Unexpected error occurred. Please try again.");
  }
}
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700">
        <h1 className="text-2xl font-bold text-center mb-6 text-white">Register</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="tenantName"
            placeholder="Company / Tenant Name"
            value={form.tenantName}
            onChange={handleChange}
            className="w-full border border-gray-600 bg-gray-900 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              name="country"
              placeholder="Country (e.g. IN)"
              value={form.country}
              onChange={handleChange}
              maxLength={2}
              className="w-full border border-gray-600 bg-gray-900 text-white px-4 py-3 rounded-lg uppercase focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <input
              type="text"
              name="currency"
              placeholder="Currency (e.g. INR)"
              value={form.currency}
              onChange={handleChange}
              className="w-full border border-gray-600 bg-gray-900 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            className="w-full border border-gray-600 bg-gray-900 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full border border-gray-600 bg-gray-900 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full border border-gray-600 bg-gray-900 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />

          {/* Image upload */}
          <div>
            <label className="text-sm text-gray-300">Tenant Logo / Picture</label>
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileChange}
              className="w-full mt-2 text-sm text-gray-200"
            />
            {preview && (
              <img
                src={preview}
                alt="preview"
                className="mt-2 w-24 h-24 object-cover rounded-md border border-gray-600"
              />
            )}
            <p className="text-xs text-gray-500 mt-1">
              Optional. Max ~1.5MB.
            </p>
          </div>

          {error && <p className="text-red-400 text-center">{error}</p>}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold shadow hover:opacity-90 transition"
          >
            Register
          </button>
          <p className="text-center text-sm mt-4 text-gray-400">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
