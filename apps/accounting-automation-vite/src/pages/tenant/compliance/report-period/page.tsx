"use client";

import { useState } from "react";
import { api } from "../../../../lib/api";

export default function ComplianceReportByPeriodPage() {
  const [period, setPeriod] = useState("");
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Fetch single compliance report by period
  async function fetchReport(e: React.FormEvent) {
    e.preventDefault();
    if (!period) return;
    setLoading(true);
    try {
      const data = await api(`/compliance/report/${period}`);
      setReport(data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch report");
    } finally {
      setLoading(false);
    }
  }

  // 🔹 Fetch filing report for a given month (YYYY-MM)
  async function fetchFilingReport(month: string) {
    try {
      const data = await api(`/compliance/report/filing?period=${month}`);
      console.log("Filing report", data);
      alert(`Filing report for ${month} fetched. Check console for details.`);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch filing report");
    }
  }
return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500 drop-shadow-lg">
      Compliance Report by Period
    </h1>

    {/* Form Card */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-pink-500/30 p-6 text-gray-100">
      <form onSubmit={fetchReport} className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Enter period (e.g. 2023-Q4)"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="flex-1 rounded-lg p-3 bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg shadow-md hover:scale-105 transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Loading..." : "Fetch Report"}
        </button>
      </form>

      {/* Filing Report Demo Button */}
      <button
        onClick={() => fetchFilingReport("2023-08")}
        className="mb-6 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md hover:scale-105 transition"
      >
        Fetch Filing Report (2023-08)
      </button>

      {/* Report Result */}
      {report && (
        <div className="bg-gray-900 rounded-2xl shadow-lg shadow-pink-500/20 p-6 text-gray-100">
          <h2 className="text-lg font-semibold mb-3 text-pink-300 drop-shadow">
            Report Result
          </h2>
          <pre className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 overflow-x-auto">
            {JSON.stringify(report, null, 2)}
          </pre>
        </div>
      )}
    </div>
  </div>
);

}
