"use client";
import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "ASSET",
    currency: "USD",
  });

  // ✅ Load accounts
  useEffect(() => {
    api("/accounts")
      .then(setAccounts)
      .catch((err) => console.error("Failed to load accounts", err))
      .finally(() => setLoading(false));
  }, []);

  // ✅ Create account
  async function createAccount(e: any) {
    e.preventDefault();
    try {
      const newAcc = await api("/accounts", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setAccounts((prev) => [...prev, newAcc]); // instant update
      setForm({ code: "", name: "", type: "ASSET", currency: "USD" });
    } catch (err) {
      console.error("Failed to create account", err);
    }
  }

  return (
    <div className="p-6 bg-white min-h-screen text-gray-900">
      {/* Title */}
      <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
        Chart of Accounts
      </h1>

      {/* Create Account Form */}
      <form
        onSubmit={createAccount}
        className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 flex flex-wrap gap-3 text-gray-100"
      >
        <input
          placeholder="Code"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          className="border border-gray-700 bg-gray-800 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
        />
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border border-gray-700 bg-gray-800 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
        />
        <input
  placeholder="Type (e.g. CASH, OPERATING EXPENSE, REVENUE)"
  value={form.type}
  onChange={(e) =>
    setForm({ ...form, type: e.target.value.toUpperCase() }) // ✅ always uppercase
  }
  className="border border-gray-700 bg-gray-800 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
/>
        <input
          placeholder="Currency"
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value })}
          className="border border-gray-700 bg-gray-800 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
        />
        <button
          type="submit"
          className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-4 py-2 rounded-lg shadow-lg hover:opacity-90 transition"
        >
          Add
        </button>
      </form>

      {/* Accounts Table */}
      <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
        {loading ? (
          <p className="text-gray-400">Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <p className="text-gray-400 italic">No accounts yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-300">
                <th className="p-3 text-left">Code</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Currency</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                >
                  <td className="p-3">{a.code}</td>
                  <td className="p-3">{a.name}</td>
                  <td className="p-3">{a.type}</td>
                  <td className="p-3 text-blue-300 font-medium">
                    {a.currency}
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
