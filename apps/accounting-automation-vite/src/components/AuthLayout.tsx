"use client";
import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-900 to-black">
      <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-lg shadow-2xl border border-white/20 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">FinEdge</h1>
          <p className="text-sm text-gray-300">Secure Finance Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
