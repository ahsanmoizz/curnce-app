"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

type Tenant = { id: string };

type LegalQuery = {
  id: string;
  tenantId: string;
  question: string;
  answer?: string;
  category?: string;
  status: string;
  explanation?: string;
  createdAt: string;
};

export default function LegalQueriesPage() {
  const [queries, setQueries] = useState<LegalQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  // ---- Fetch tenant, queries + summary ----
  useEffect(() => {
    api("/tenants/me")
      .then(setTenant)
      .catch(() => setTenant(null));

    refreshQueries();
    fetchSummary();
  }, []);
async function refreshQueries() {
  setLoading(true);
  try {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (status) params.append("status", status.toLowerCase()); // ✅ force lowercase

    const data = await api(`/legal/queries?${params.toString()}`);
    setQueries(data.items || []);
  } catch (err) {
    console.error(err);
    alert("❌ Failed to load queries");
  } finally {
    setLoading(false);
  }
}

  async function fetchSummary() {
    try {
      const data = await api("/legal/queries/summary");
      setPendingCount(data.pendingCount);
    } catch (err) {
      console.error(err);
    }
  }

  async function addQuery(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!tenant) {
        alert("❌ No tenant found. Please re-login.");
        return;
      }

      const body = { question, category, tenantId: tenant.id };
      const q = await api("/legal/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      setQueries((prev) => [q, ...prev]);
      setQuestion("");
      setCategory("");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to create query");
    }
  }

  async function resolveQuery(id: string) {
    try {
      const result = await api(`/legal/query/${id}/resolve`, { method: "PATCH" });
      setQueries((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...result } : q))
      );
    } catch (err) {
      console.error(err);
      alert("❌ Failed to resolve query");
    }
  }

  async function exportQueries(format: string) {
    try {
      const res = await fetch(`/api/legal/queries/export?format=${format}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `legal-queries.${format}`;
      link.click();
    } catch (err) {
      console.error(err);
      alert(" Failed to export queries");
    }
  }

  return (
    <div className="p-6 bg-white min-h-screen text-gray-900">
      {/* Title */}
      <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
        Legal Queries{" "}
        <span className="text-sm text-gray-500">(Pending: {pendingCount})</span>
      </h1>

      {/* Add Query Form */}
      <form
        onSubmit={addQuery}
        className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100 flex flex-wrap gap-4"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter legal question"
          required
          className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition w-80"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition w-40"
        />
        <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:scale-105 transition">
          Ask Query
        </button>
      </form>

      {/* Filters */}
      <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100 flex flex-wrap gap-3">
          <select
  value={status}
  onChange={(e) => setStatus(e.target.value)}
  className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
>
  <option value="">All Status</option>
  <option value="pending">Pending</option>
  <option value="resolved">Resolved</option>
</select>
        <button
          onClick={refreshQueries}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
        >
          Apply Filters
        </button>
        <button
          onClick={() => exportQueries("csv")}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
        >
          Export CSV
        </button>
        <button
          onClick={() => exportQueries("json")}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
        >
          Export JSON
        </button>
      </div>

      {/* Queries Table */}
      <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
        {loading ? (
          <p className="text-gray-500">Loading queries...</p>
        ) : queries.length === 0 ? (
          <p className="text-gray-400 italic">No queries found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-300">
                <th className="p-3 text-left">Question</th>
                <th className="p-3 text-left">Answer</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Created</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                >
                  <td className="p-3">{q.question}</td>
                  <td className="p-3">{q.answer || "—"}</td>
                  <td className="p-3">{q.category || "—"}</td>
                      <td className="p-3">
  {q.status.toLowerCase() === "pending" ? (
    <span className="text-yellow-400 font-medium">Pending</span>
  ) : q.status.toLowerCase() === "resolved" ? (
    <span className="text-green-400 font-medium">Resolved</span>
  ) : (
    <span className="text-gray-400">{q.status}</span>
  )}
</td>
                  <td className="p-3">
                    {q.createdAt ? new Date(q.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="p-3">
                    {q.status === "pending" && (
                      <button
                        onClick={() => resolveQuery(q.id)}
                        className="px-3 py-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:scale-105 transition"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}