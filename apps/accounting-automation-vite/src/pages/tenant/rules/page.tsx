"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRules() {
    setLoading(true);
    try {
      setRules(await api("/rules"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRules();
  }, []);
  const handleCreate = async () => {
  const name = prompt("Enter rule name:");
  if (!name) return;

  const scope = prompt("Enter rule scope (e.g. global, branch, etc):") || "global";

  const whenExprRaw = prompt(
    "Enter WHEN condition (JSON)",
    '{"descriptionContains":"uber"}'
  );
  const thenActionRaw = prompt(
    "Enter THEN action (JSON)",
    '{"category":"Expense:Travel"}'
  );

  await api("/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      scope,
      whenExpr: whenExprRaw ? JSON.parse(whenExprRaw) : {},
      thenAction: thenActionRaw ? JSON.parse(thenActionRaw) : {},
    }),
  });

  loadRules();
};

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    await api(`/rules/${id}`, { method: "DELETE" });
    loadRules();
  };

  const handleEdit = async (id: string, currentName: string) => {
    const name = prompt("Update rule name:", currentName);
    if (!name || name === currentName) return;
    await api(`/rules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    loadRules();
  };
  return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
      Rules
    </h1>

    {/* Rules Card */}
    <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
        <h2 className="text-lg font-semibold text-cyan-300 drop-shadow">
          Rules List
        </h2>
        <button
          onClick={handleCreate}
          className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:scale-105 transition"
        >
          + Add
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 italic">Loading rules...</p>
      ) : rules.length === 0 ? (
        <p className="text-gray-500 italic">No rules available.</p>
      ) : (
        <ul className="divide-y divide-gray-700">
          {rules.map((r) => (
            <li
              key={r.id}
              className="p-3 flex justify-between items-center hover:bg-gray-800/50 rounded-lg transition"
            >
              <span className="text-gray-100">{r.name}</span>
              <div className="space-x-2">
                <button
                  onClick={() => handleEdit(r.id, r.name)}
                  className="px-3 py-1 text-sm bg-yellow-500 text-white rounded-lg shadow hover:bg-yellow-600 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

}
