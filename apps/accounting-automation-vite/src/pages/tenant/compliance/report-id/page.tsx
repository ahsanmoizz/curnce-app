"use client";

import { useState } from "react";
import { api } from "../../../../lib/api";

export default function ComplianceReportByIdPage() {
  const [reportId, setReportId] = useState("");
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportId) return;
    setLoading(true);
    try {
      const data = await api(`/compliance/report/id/${reportId}`);
      setReport(data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch report by ID");
    } finally {
      setLoading(false);
    }
  }
return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 drop-shadow-lg">
      Compliance Report by ID
    </h1>

    {/* Form Card */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-purple-500/30 p-6 text-gray-100">
      <form onSubmit={fetchReport} className="flex gap-3">
        <input
          type="text"
          placeholder="Enter report ID"
          value={reportId}
          onChange={(e) => setReportId(e.target.value)}
          className="flex-1 rounded-lg p-3 bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-md hover:scale-105 transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Loading..." : "Fetch Report"}
        </button>
      </form>
    </div>

    {/* Report Result */}
    {report && (
      <div className="bg-gray-900 rounded-2xl shadow-lg shadow-purple-500/20 p-6 text-gray-100">
        <h2 className="text-lg font-semibold mb-3 text-purple-300 drop-shadow">
          Report Result
        </h2>
        <pre className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 overflow-x-auto">
          {JSON.stringify(report, null, 2)}
        </pre>
      </div>
    )}
  </div>
);

}
