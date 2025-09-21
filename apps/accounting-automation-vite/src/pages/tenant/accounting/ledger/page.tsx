"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function LedgerPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const data = await api("/accounts");
        setAccounts(data);

        // 👇 Automatically select first account (if available)
        if (data.length > 0) {
          setSelectedAccount(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load accounts", err);
      }
    };

    loadAccounts();
  }, []);

  // ✅ Fetch ledger whenever account changes
  useEffect(() => {
    if (!selectedAccount) return;
    setLoading(true);

    api(`/accounting/ledger/${selectedAccount}`)
      .then((data) => setLedger(data))
      .catch((err) => console.error("Failed to load ledger", err))
      .finally(() => setLoading(false));
  }, [selectedAccount]);

  return (
    <div className="p-6 bg-white min-h-screen text-gray-900">
      {/* Title */}
      <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
        General Ledger
      </h1>

      {/* Account Selector */}
      <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
        <label className="mr-3 font-medium text-cyan-300 drop-shadow">
          Select Account:
        </label>
        <select
          value={selectedAccount ?? ""}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Ledger Table */}
      <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
        {loading ? (
          <p className="text-gray-500">Loading ledger...</p>
        ) : ledger.length === 0 ? (
          <p className="text-gray-400 italic">
            No entries for this account yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-300">
                <th className="p-3 text-left">Account</th>
                <th className="p-3 text-left">Debit</th>
                <th className="p-3 text-left">Credit</th>
                <th className="p-3 text-left">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger
                .reduce((acc: any[], row, i) => {
                  const prevBalance = i === 0 ? 0 : acc[i - 1].balance;
                  const balance =
                    prevBalance + (row.debit ?? 0) - (row.credit ?? 0);
                  acc.push({ ...row, balance });
                  return acc;
                }, [])
                .map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                  >
                    <td className="p-3">
                      {row.account?.name ||
                        row.account?.code ||
                        row.accountId}
                    </td>
                    <td className="p-3 text-green-400 font-medium">
                      ${row.debit?.toFixed(2)}
                    </td>
                    <td className="p-3 text-red-400 font-medium">
                      ${row.credit?.toFixed(2)}
                    </td>
                    <td className="p-3 font-semibold text-blue-300">
                      ${row.balance.toFixed(2)}
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
