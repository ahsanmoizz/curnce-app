"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function ComplianceConfigPage() {
  const [configs, setConfigs] = useState<any[]>([]); // 👈 multiple configs
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/compliance/config")
      .then(setConfigs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body: any = {};
    formData.forEach((v, k) => {
      if (k === "rate") body[k] = parseFloat(v as string); // 👈 cast to float
      else body[k] = v;
    });

    await api("/compliance/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // 🔄 refresh list after saving
    const updated = await api("/compliance/config");
    setConfigs(updated);

    alert("Config saved");
  }
return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 drop-shadow-lg">
      Compliance Config
    </h1>

    {/* Config Form & List */}
    <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4 mb-6">
            <input
              name="country"
              type="text"
              placeholder="Country"
              className="w-full border border-gray-700 bg-gray-800 p-3 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              name="taxType"
              type="text"
              placeholder="Tax Type (e.g. GST)"
              className="w-full border border-gray-700 bg-gray-800 p-3 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              name="rate"
              type="number"
              placeholder="Rate %"
              className="w-full border border-gray-700 bg-gray-800 p-3 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              name="filingCycle"
              type="text"
              placeholder="Monthly/Quarterly"
              className="w-full border border-gray-700 bg-gray-800 p-3 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              name="accountCode"
              type="text"
              placeholder="Account Code"
              className="w-full border border-gray-700 bg-gray-800 p-3 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-md hover:scale-105 transition">
              Save Config
            </button>
          </form>

          {/* Saved Configs List */}
          {configs.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-blue-300 drop-shadow mb-3">
                Saved Configs
              </h2>
              <ul className="space-y-3">
                {configs.map((c, i) => (
                  <li
                    key={i}
                    className="p-4 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700/50 transition"
                  >
                    <div>
                      <span className="font-medium text-white">{c.country}</span>{" "}
                      — {c.taxType} @ {c.rate}% ({c.filingCycle})
                    </div>
                    <div className="text-gray-400 text-xs">
                      Account Code: {c.accountCode}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  </div>
);

}
