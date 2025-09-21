"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function JournalPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [classifyResults, setClassifyResults] = useState<Record<string, any>>({});

  useEffect(() => {
    api("/accounting/journal")
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleClassify(txId: string) {
    try {
      const res = await api(`/compliance/classify/tx/${txId}`, { method: "POST" });
      setClassifyResults((prev) => ({ ...prev, [txId]: res }));
    } catch (err) {
      console.error("Classify failed:", err);
      alert("Classification failed. Check console for details.");
    }
  }
   return (
    <div className="p-6 bg-white min-h-screen text-gray-900">
      <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
        Journal Entries
      </h1>

      <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
        {loading ? (
          <p className="text-gray-400">Loading journal...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-300">
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-left">Debit</th>
                <th className="p-3 text-left">Credit</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                >
                  <td className="p-3">{e.date}</td>
                  <td className="p-3">{e.description}</td>
                  <td className="p-3 text-green-400">${e.debit}</td>
                  <td className="p-3 text-red-400">${e.credit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}