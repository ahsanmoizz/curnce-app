"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function TreasuryPage() {
  const [loading, setLoading] = useState(true);

  // ---- State for entities ----
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [paymentRuns, setPaymentRuns] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [bankStatements, setBankStatements] = useState<any[]>([]);

  // ---- Forms ----
  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [currency, setCurrency] = useState("USD");

  const [forecastHorizon, setForecastHorizon] = useState("monthly");
  const [forecastStart, setForecastStart] = useState("");
  const [forecastEnd, setForecastEnd] = useState("");

  const [runBankAcc, setRunBankAcc] = useState("");
  const [runDate, setRunDate] = useState("");
  const [runCurrency, setRunCurrency] = useState("USD");
  const [runAmount, setRunAmount] = useState<number | "">("");

  const [collCustomerId, setCollCustomerId] = useState("");
  const [collDate, setCollDate] = useState("");
  const [collAmount, setCollAmount] = useState<number | "">("");
  const [collCurrency, setCollCurrency] = useState("USD");

  const [statementBankAcc, setStatementBankAcc] = useState("");
  const [statementDate, setStatementDate] = useState("");

  // ---- Load all data on mount ----
  useEffect(() => {
    Promise.all([
      api("/treasury/bank-accounts"),
      api("/treasury/forecasts"),
      api("/treasury/payment-runs"),
      api("/treasury/collections"),
      api("/treasury/bank/statements"),
    ])
      .then(([accs, fcs, prs, cols, stmts]) => {
        setBankAccounts(accs);
        setForecasts(fcs);
        setPaymentRuns(prs);
        setCollections(cols);
        setBankStatements(stmts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ---- Actions ----
  const addBankAccount = async () => {
    const dto = { name: bankName, accountNo, currency };
    const acc = await api("/treasury/bank-accounts", {
      method: "POST",
      body: JSON.stringify(dto),
    });
    setBankAccounts((prev) => [...prev, acc]);
    setBankName("");
    setAccountNo("");
    setCurrency("USD");
  };

  const generateForecast = async () => {
    const dto = { horizon: forecastHorizon, startDate: forecastStart, endDate: forecastEnd };
    const fc = await api("/treasury/forecast", { method: "POST", body: JSON.stringify(dto) });
    setForecasts((prev) => [fc, ...prev]);
  };

  const createPaymentRun = async () => {
    const dto = {
      bankAccountId: runBankAcc,
      scheduledDate: runDate,
      currency: runCurrency,
      items: [{ amount: Number(runAmount), currency: runCurrency }],
    };
    const run = await api("/treasury/payment-runs", { method: "POST", body: JSON.stringify(dto) });
    setPaymentRuns((prev) => [run, ...prev]);
  };

  const approveRun = async (id: string) => {
    const run = await api(`/treasury/payment-runs/${id}/approve`, { method: "POST" });
    setPaymentRuns((prev) => prev.map((r) => (r.id === id ? run : r)));
  };

  const executeRun = async (id: string) => {
    const run = await api(`/treasury/payment-runs/${id}/execute`, { method: "POST" });
    setPaymentRuns((prev) => prev.map((r) => (r.id === id ? run : r)));
  };

  const planCollection = async () => {
    const dto = { customerId: collCustomerId, expectedOn: collDate, amount: Number(collAmount), currency: collCurrency };
    const col = await api("/treasury/collections/plan", { method: "POST", body: JSON.stringify(dto) });
    setCollections((prev) => [col, ...prev]);
  };

  const markCollectionReceived = async (id: string) => {
    const col = await api(`/treasury/collections/${id}/receive`, {
      method: "POST",
      body: JSON.stringify({ receivedOn: new Date().toISOString() }),
    });
    setCollections((prev) => prev.map((c) => (c.id === id ? col : c)));
  };

  const importBankStatement = async () => {
    const dto = { bankAccountId: statementBankAcc, statementDate, raw: {}, items: [] };
    const st = await api("/treasury/bank/import", { method: "POST", body: JSON.stringify(dto) });
    setBankStatements((prev) => [st, ...prev]);
  };

  const autoReconcile = async (id: string) => {
    const result = await api(`/treasury/bank/${id}/reconcile/auto`, { method: "POST" });
    alert(`Auto reconciled ${result.matched} items`);
  };

  // ---- Render ----
  if (loading) return <p className="p-6">Loading treasury data...</p>;
 return (
  <div className="p-6 bg-white min-h-screen text-gray-900 space-y-10">
    {/* Title */}
    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
      Cash Management
    </h1>

    {/* ---- Bank Accounts ---- */}
    <section className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="text-xl font-semibold text-cyan-300 drop-shadow mb-4">Bank Accounts</h2>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-gray-700 text-gray-300">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Account No</th>
            <th className="p-2 text-left">Currency</th>
          </tr>
        </thead>
        <tbody>
          {bankAccounts.map((acc) => (
            <tr key={acc.id} className="border-b border-gray-700 hover:bg-gray-700/40 transition">
              <td className="p-2">{acc.name}</td>
              <td className="p-2">{acc.accountNo}</td>
              <td className="p-2">{acc.currency}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          placeholder="Name"
          className="flex-1 border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <input
          value={accountNo}
          onChange={(e) => setAccountNo(e.target.value)}
          placeholder="Account No"
          className="flex-1 border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
        />
        <input
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          placeholder="Currency"
          className="w-28 border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
        />
       <button
  onClick={addBankAccount}
  className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
>
  Add
</button>
      </div>
    </section>

    {/* ---- Forecasts ---- */}
    <section className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="text-xl font-semibold text-cyan-300 drop-shadow mb-4">Forecasts</h2>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-gray-700 text-gray-300">
            <th className="p-2 text-left">Period</th>
            <th className="p-2 text-left">Horizon</th>
            <th className="p-2 text-left">Inflow</th>
            <th className="p-2 text-left">Outflow</th>
            <th className="p-2 text-left">Net</th>
          </tr>
        </thead>
        <tbody>
          {forecasts.map((fc) => (
            <tr key={fc.id} className="border-b border-gray-700 hover:bg-gray-700/40 transition">
              <td className="p-2">{fc.period}</td>
              <td className="p-2">{fc.horizon}</td>
              <td className="p-2 text-green-400">{fc.inflow}</td>
              <td className="p-2 text-red-400">{fc.outflow}</td>
              <td className="p-2 text-blue-300 font-semibold">{fc.net}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-3 items-center">
        <select className="w-32 border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <input type="date" className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg" />
        <input type="date" className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg" />
       <button
  onClick={generateForecast}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
>
  Generate
</button>
      </div>
    </section>

    {/* ---- Payment Runs ---- */}
    <section className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="text-xl font-semibold text-cyan-300 drop-shadow mb-4">Payment Runs</h2>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-gray-700 text-gray-300">
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Currency</th>
            <th className="p-2 text-left">Total</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paymentRuns.map((run) => (
            <tr key={run.id} className="border-b border-gray-700 hover:bg-gray-700/40 transition">
              <td className="p-2">{new Date(run.scheduledDate).toLocaleDateString()}</td>
              <td className="p-2">{run.currency}</td>
              <td className="p-2 text-blue-300">{run.totalAmount}</td>
              <td className="p-2">{run.status}</td>
              <td className="p-2 space-x-2">
            {run.status === "draft" && (
  <button
    onClick={() => approveRun(run.id)}
    className="px-2 py-1 bg-yellow-500 text-white rounded-lg shadow hover:bg-yellow-600 transition"
  >
    Approve
  </button>
)}
{run.status === "approved" && (
  <button
    onClick={() => executeRun(run.id)}
    className="px-2 py-1 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
  >
    Execute
  </button>
)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-3 items-center">
        <select className="flex-1 border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg">
          <option value="">Select Bank Account</option>
          {bankAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
        <input type="date" className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg" />
        <input placeholder="Amount" className="w-28 border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg" />
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
          Create
        </button>
      </div>
    </section>

    {/* ---- Collections ---- */}
    <section className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="text-xl font-semibold text-cyan-300 drop-shadow mb-4">Collections</h2>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-gray-700 text-gray-300">
            <th className="p-2 text-left">Customer</th>
            <th className="p-2 text-left">Expected</th>
            <th className="p-2 text-left">Amount</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {collections.map((col) => (
            <tr key={col.id} className="border-b border-gray-700 hover:bg-gray-700/40 transition">
              <td className="p-2">{col.customerId}</td>
              <td className="p-2">{new Date(col.expectedOn).toLocaleDateString()}</td>
              <td className="p-2 text-blue-300">{col.amount}</td>
              <td className="p-2">{col.status}</td>
              <td className="p-2">
                {col.status !== "received" && (
                 <button
  onClick={() => markCollectionReceived(col.id)}
  className="px-2 py-1 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
>
  Mark Received
</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-3 items-center">
        <input placeholder="Customer ID" className="flex-1 border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg" />
        <input type="date" className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg" />
        <input placeholder="Amount" className="w-28 border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg" />
        <input placeholder="Currency" className="w-28 border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg" />
      <button
  onClick={planCollection}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
>
  Plan
</button>
      </div>
    </section>

    {/* ---- Bank Statements ---- */}
    <section className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="text-xl font-semibold text-cyan-300 drop-shadow mb-4">Bank Statements</h2>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-gray-700 text-gray-300">
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Items</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bankStatements.map((st) => (
            <tr key={st.id} className="border-b border-gray-700 hover:bg-gray-700/40 transition">
              <td className="p-2">{new Date(st.statementDate).toLocaleDateString()}</td>
              <td className="p-2">{st.items?.length}</td>
              <td className="p-2">
              <button
  onClick={() => autoReconcile(st.id)}
  className="px-2 py-1 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
>
  Auto Reconcile
</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-3 items-center">
        <select className="flex-1 border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg">
          <option value="">Select Bank Account</option>
          {bankAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
        <input type="date" className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg" />
      <button
  onClick={importBankStatement}
  className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
>
  Import
</button>
      </div>
    </section>
  </div>
);


}
