"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

type AuditLog = {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  details?: any;
  ip?: string;
  createdAt: string;
    verified?: boolean;   // ✅ blockchain verification
  txHash?: string;      // ✅ transaction hash link
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: "",
    userId: "",
    fromDate: "",
    toDate: "",
    page: 1,
    limit: 20,
  });
  const [total, setTotal] = useState(0);

  // ---- Fetch logs ----
  // ✅ AuditPage.jsx
useEffect(() => {
  const params = new URLSearchParams();
  if (filters.action) params.append("action", filters.action);
  if (filters.userId) params.append("userId", filters.userId);
  if (filters.fromDate) params.append("fromDate", filters.fromDate);
  if (filters.toDate) params.append("toDate", filters.toDate);
  params.append("page", String(filters.page));
  params.append("limit", String(filters.limit));

  setLoading(true);
  api(`/audit?${params.toString()}`)
    .then((res) => {
      setLogs(res.items || []);
      setTotal(res.total || 0);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
}, [
  filters.page,
  filters.limit,
  filters.action,
  filters.userId,
  filters.fromDate,
  filters.toDate,
]);



  // ---- Export ----
 async function handleExport(format: "csv" | "json") {
  try {
    const params = new URLSearchParams({
      format,
      action: filters.action,
      userId: filters.userId,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    });

    // ✅ use api helper with raw:true
    const blob = await api(`/audit/export?${params.toString()}`, {
      raw: true,
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${Date.now()}.${format}`;
    document.body.appendChild(a); // needed for Firefox
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Export failed", err);
  }
}
  return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
      Audit Logs
    </h1>

    {/* Filters */}
    <div className="flex flex-wrap gap-3 mb-6 bg-gray-900 p-6 rounded-2xl shadow-xl shadow-blue-500/30 text-gray-100">
      <input
        placeholder="Action"
        value={filters.action}
        onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
      <input
        placeholder="User ID"
        value={filters.userId}
        onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
      <input
        type="date"
        value={filters.fromDate}
        onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
      <input
        type="date"
        value={filters.toDate}
        onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
      <button
        onClick={() => handleExport("csv")}
        className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg font-medium hover:scale-105 transition"
      >
        Export CSV
      </button>
      <button
        onClick={() => handleExport("json")}
        className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg font-medium hover:scale-105 transition"
      >
        Export JSON
      </button>
    </div>

    {/* Logs Table */}
    <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      {loading ? (
        <p className="text-gray-500">Loading logs...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-400 italic">No logs available</p>
      ) : (
        <div className="overflow-x-auto">
         <table className="w-full text-sm">
  <thead>
    <tr className="border-b border-gray-700 text-gray-300">
      {["Time", "User", "Action", "IP", "Details"].map((h) => (
        <th key={h} className="px-4 py-2 text-left font-medium">
          {h}
        </th>
      ))}
    </tr>
  </thead>
  <tbody>
    {logs.map((log) => (
      <tr
        key={log.id}
        className="border-b border-gray-700 hover:bg-gray-700/50 transition"
      >
        <td className="px-4 py-2">
          {new Date(log.createdAt).toLocaleString()}
        </td>
        <td className="px-4 py-2">{log.userId}</td>
        <td className="px-4 py-2 text-cyan-300 font-medium">{log.action}</td>
        <td className="px-4 py-2">{log.ip || "—"}</td>
        <td className="px-4 py-2 text-xs text-gray-300">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(log.details, null, 2)}
          </pre>
        </td>
      </tr>
    ))}
  </tbody>
</table>

        </div>
      )}
    </div>

    {/* Pagination */}
    <div className="flex gap-3 mt-6 items-center">
      <button
        disabled={filters.page <= 1}
        onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
        className="px-4 py-2 bg-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-600 transition"
      >
        Prev
      </button>
      <span className="text-gray-500">
        Page {filters.page} of {Math.ceil(total / filters.limit)}
      </span>
      <button
        disabled={filters.page >= Math.ceil(total / filters.limit)}
        onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
        className="px-4 py-2 bg-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-600 transition"
      >
        Next
      </button>
    </div>
  </div>
);



}
