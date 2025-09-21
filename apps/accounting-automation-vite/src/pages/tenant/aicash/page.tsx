"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function CashManagementPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<any | null>(null);

  // ✅ Load uploaded docs on mount
  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const data = await api("/ai-cash/docs");
      setDocs(data);
    } catch (err) {
      console.error("Failed to load docs", err);
    }
  };

  // ✅ Upload doc
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api("/ai-cash/upload", {
        method: "POST",
        body: formData,
      });
      await loadDocs();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

const loadSummary = async () => {
  try {
    const data = await api("/ai-cash/summary");
    setSummary(data);
  } catch (err) {
    console.error("Failed to load summary", err);
  }
};

useEffect(() => {
  loadDocs();
  loadSummary();
}, []);
  // ✅ Ask AI
  const handleAskAI = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAiResponse(null);
    try {
    const data = await api("/ai-cash/ask", {
  method: "POST",
  body: JSON.stringify({ prompt: query }),
  headers: { "Content-Type": "application/json" },
});
  
      setAiResponse(data.answer);
    } catch (err) {
      console.error("AI query failed", err);
    } finally {
      setLoading(false);
    }
  };

// ⬇️ ADD THIS RIGHT BELOW
const handleDownload = async (format: string) => {
  try {
    const blob = await api(`/ai-cash/export?format=${format}`, {
      method: "GET",
      raw: true, // use raw because your api.ts supports it
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report.${format === "excel" ? "xlsx" : format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download failed", err);
  }
};

  return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
      AI Cash Management
    </h1>

    {/* Upload Section */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <label className="mr-3 font-medium text-cyan-300 drop-shadow">
        Upload Financial Docs:
      </label>
      <input
        type="file"
        onChange={handleUpload}
        disabled={uploading}
        className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
      />
      {uploading && (
        <p className="text-sm text-gray-400 mt-2">Uploading...</p>
      )}
    </div>

    {/* Docs List */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="text-lg font-semibold mb-3 text-cyan-300 drop-shadow">
        Uploaded Docs
      </h2>
      {docs.length === 0 ? (
        <p className="text-gray-400 italic">No documents uploaded yet.</p>
      ) : (
        <ul className="list-disc list-inside space-y-1">
          {docs.map((d) => (
            <li key={d.id} className="text-gray-200">
              {d.filename}{" "}
              <span className="text-gray-400">({d.type})</span>
            </li>
          ))}
        </ul>
      )}
    </div>


<div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
  <h2 className="text-lg font-semibold mb-3 text-cyan-300 drop-shadow">
    Financial Summary
  </h2>
  {summary ? (
    <ul className="space-y-1 text-gray-200">
      <li>Total Invoices: ₹{summary.totalInvoices}</li>
      <li>Total Payroll: ₹{summary.totalPayroll}</li>
      <li>Other Expenses: ₹{summary.otherExpenses}</li>
      <li className="font-bold text-green-400">
        Net Cash: ₹{summary.netCash}
      </li>
    </ul>
  ) : (
    <p className="text-gray-400 italic">No data yet.</p>
  )}
</div>
    {/* Ask AI Section */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="text-lg font-semibold mb-3 text-cyan-300 drop-shadow">
        Ask AI
      </h2>
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask about invoices, payrolls, compliance, etc..."
        className="w-full border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
        rows={4}
      />
      <button
        onClick={handleAskAI}
        disabled={loading}
        className="mt-3 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 hover:scale-105 transition text-white font-medium shadow-lg"
      >
        {loading ? "Thinking..." : "Ask AI"}
      </button>

      {aiResponse && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg text-gray-100 shadow-inner">
          <h3 className="font-semibold mb-2 text-cyan-300">AI Response</h3>
          <pre className="whitespace-pre-wrap text-sm">{aiResponse}</pre>
        </div>
      )}
    </div>

    {/* Download Reports */}
    <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="text-lg font-semibold mb-3 text-cyan-300 drop-shadow">
        Reports
      </h2>
      <div className="flex space-x-4">
        <button
    onClick={() => handleDownload("csv")}
    className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition"
  >
    Download CSV
  </button>
  <button
    onClick={() => handleDownload("excel")}
    className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition"
  >
    Download Excel
  </button>
  <button
    onClick={() => handleDownload("pdf")}
    className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition"
  >
    Download PDF
  </button>
      </div>
    </div>
  </div>
);
}