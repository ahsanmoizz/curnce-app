"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function ComplianceReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
const [alerts, setAlerts] = useState<any[]>([]);
  useEffect(() => {
  api("/compliance/reports")
    .then(setReports)
    .catch(console.error)
    .finally(() => setLoading(false));

  // ADD THIS
  api("/alerts")
    .then(setAlerts)
    .catch(() => setAlerts([]));
}, []);
async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const body: any = {};
  formData.forEach((v, k) => (body[k] = v));

  await api("/compliance/report", {   // 👈 FIXED
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  alert("Report generated");
}

 return (
    <div className="p-6">
      {alerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 mb-6 rounded-lg backdrop-blur-md">
          <h2 className="font-semibold mb-2 text-red-300">Compliance Alerts</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {alerts.map((a, i) => (
              <li key={i}>{a.message}</li>
            ))}
          </ul>
        </div>
      )}

      <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent mb-6">
        Compliance Reports
      </h1>

      <form
        onSubmit={handleGenerate}
        className="space-y-4 bg-white/10 backdrop-blur-lg p-6 rounded-xl shadow border border-white/20"
      >
        <input
          name="type"
          placeholder="Report Type"
          className="w-full rounded-lg p-3 bg-gray-900/60 border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <input
          name="period"
          placeholder="Period (e.g. 2023-Q1)"
          className="w-full rounded-lg p-3 bg-gray-900/60 border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md hover:opacity-90 transition">
          Generate Report
        </button>
      </form>

      <div className="mt-6">
        {loading ? (
          <p className="text-gray-400">Loading reports...</p>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li
                key={r.id}
                className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg shadow hover:border-indigo-500 transition"
              >
                <span className="font-semibold text-indigo-300">{r.type}</span>{" "}
                <span className="text-gray-400">— {r.period}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}