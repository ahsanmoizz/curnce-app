"use client";

import { useState } from "react";
import { api } from "../../../../lib/api";

export default function ComplianceReviewPage() {
  const [result, setResult] = useState<any>(null);
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const form = e.currentTarget as any;
  const content = form.content?.value?.trim();
  if (!content) {
    alert("Please enter document text before submitting.");
    return;
  }
  const res = await api("/compliance/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  setResult(res);
}
return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 drop-shadow-lg">
      Review Document
    </h1>

    {/* Form Card */}
    <div className="bg-gray-900 rounded-2xl shadow-xl shadow-pink-500/30 p-6 text-gray-100">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          name="content"
          placeholder="Document text..."
          className="w-full h-48 rounded-lg p-3 bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:outline-none"
        />
        <button
          type="submit"
          className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-md hover:scale-105 transition"
        >
          Review
        </button>
      </form>
    </div>

    {/* Result Card */}
    {result && (
      <div className="mt-6 bg-gray-900 rounded-2xl shadow-lg shadow-purple-500/20 p-6 text-gray-100">
        <h2 className="text-lg font-semibold mb-3 text-purple-300 drop-shadow">
          Review Result
        </h2>
        <pre className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 whitespace-pre-wrap overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    )}
  </div>
);

}