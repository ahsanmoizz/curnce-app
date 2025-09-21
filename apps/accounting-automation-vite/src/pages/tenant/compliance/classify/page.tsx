"use client";

import { useState } from "react";
import { api } from "../../../../lib/api";

export default function ComplianceClassifyPage() {
  const [result, setResult] = useState<any>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body: any = {};
    formData.forEach((v, k) => (body[k] = v));
    const res = await api("/compliance/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setResult(res);
  }
  return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-400 drop-shadow-lg">
      Inline Classify
    </h1>

    {/* Form Card */}
    <div className="bg-gray-900 rounded-2xl shadow-xl shadow-green-500/30 p-6 text-gray-100">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="description"
          placeholder="Description"
          className="w-full border border-gray-700 bg-gray-800 p-3 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <input
          name="amount"
          type="number"
          placeholder="Amount"
          className="w-full border border-gray-700 bg-gray-800 p-3 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-400 text-white font-medium shadow-md hover:scale-105 transition">
          Classify
        </button>
      </form>
    </div>

    {/* Result Section */}
    {result && (
      <div className="mt-6 bg-gray-900 rounded-2xl shadow-lg shadow-emerald-500/20 p-6 text-gray-100">
        <h2 className="text-lg font-semibold mb-3 text-emerald-300 drop-shadow">
          Classification Result
        </h2>
        <pre className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    )}
  </div>
);



}