"use client";

import { useState } from "react";
import { api } from "../../../../lib/api";

export default function ComplianceLegalQueriesPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const question = (e.currentTarget as any).question.value;
    setLoading(true);
    try {
      const res = await api("/compliance/legal-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      setResult(res);
    } catch (err) {
      console.error(err);
      alert("Failed to run query");
    } finally {
      setLoading(false);
    }
  }
return (
  <div className="p-6">
    <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent mb-6">
      AI Legal Queries
    </h1>
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20 shadow-lg"
    >
      <textarea
        name="question"
        placeholder="Ask a legal compliance question..."
        className="w-full rounded-lg p-3 bg-gray-900/60 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <button
        disabled={loading}
        className="w-full px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg shadow-md hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? "Running..." : "Ask"}
      </button>
    </form>

    {result && (
      <div className="mt-6 bg-gray-900/50 border border-gray-700 p-4 rounded-xl shadow">
        <h2 className="font-semibold mb-2 text-teal-300">Answer:</h2>
        <pre className="text-sm text-gray-200 whitespace-pre-wrap">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    )}
  </div>
);
}
