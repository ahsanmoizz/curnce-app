"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

type Vendor = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

type Bill = {
  id: string;
  vendorId: string;
  invoiceNo: string;
  amount: number;
  status: string;
  dueDate: string;
  vendor?: Vendor;
};

type Payment = {
  id: string;
  billId: string;
  amount: number;
  paidDate: string;
  method: string;
  bill?: Bill;
};

export default function PayablePage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"vendors" | "bills" | "payments">("vendors");
  const [hasAPAccount, setHasAPAccount] = useState(false);
  const [accountsReady, setAccountsReady] = useState(false);
const [missingAccounts, setMissingAccounts] = useState<string[]>([]);
  // ---- Fetch data ----
  useEffect(() => {
  const loadData = async () => {
    try {
    const accountsRes = await api("/accounts");
const accounts = accountsRes || [];

const apAccount = accounts.find(
  (a: any) =>
    a.type?.toLowerCase() === "liability" &&
    a.name?.toLowerCase().includes("payable")
);

const cashAccount = accounts.find(
  (a: any) =>
    a.type?.toLowerCase() === "asset" &&
    (a.name?.toLowerCase().includes("cash") ||
      a.name?.toLowerCase().includes("bank"))
);

const expenseAccount = accounts.find(
  (a: any) => a.type?.toLowerCase() === "expense"
);
      const missing: string[] = [];
      if (!apAccount) missing.push("Accounts Payable (LIABILITY)");
      if (!cashAccount) missing.push("Cash/Bank (ASSET)");
      if (!expenseAccount) missing.push("Expense (EXPENSE)");

      if (missing.length === 0) {
        setAccountsReady(true);
        const [vendors, bills, payments] = await Promise.all([
          api("/ap/vendors"),
          api("/ap/bills"),
          api("/ap/payments"),
        ]);
        setVendors(vendors);
        setBills(bills);
        setPayments(payments);
      } else {
        setMissingAccounts(missing);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  loadData();
}, []);
  // ---- Handlers ----
  async function addVendor(formData: FormData) {
    const body = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
    };
    const vendor = await api("/ap/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setVendors((prev) => [...prev, vendor]);
  }

  async function addBill(formData: FormData) {
    const rawDate = formData.get("dueDate") as string;
    const body = {
      vendorId: formData.get("vendorId") as string,
      invoiceNo: formData.get("invoiceNo") as string,
      amount: Number(formData.get("amount")),
      dueDate: rawDate ? new Date(rawDate).toISOString() : null,
    };
    const bill = await api("/ap/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBills((prev) => [bill, ...prev]);
  }

  async function addPayment(formData: FormData) {
    const rawDate = formData.get("paidDate") as string;
    const body = {
      billId: formData.get("billId") as string,
      amount: Number(formData.get("amount")),
      paidDate: rawDate ? new Date(rawDate).toISOString() : null,
      method: formData.get("method") as string,
    };

    const payment = await api("/ap/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setPayments((prev) => [payment, ...prev]);
  }

  // ---- Helpers ----
  const statusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "text-green-600";
      case "overdue":
        return "text-red-600 font-semibold";
      case "partial":
        return "text-yellow-600";
      case "unpaid":
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen text-gray-900">
      {/* Title */}
      <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
        Accounts Payable
      </h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {["vendors", "bills", "payments"].map((t) => (
          <button
            key={t}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              tab === t
                ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setTab(t as any)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

  {loading ? (
  <p className="text-gray-500">Loading...</p>
) : !accountsReady ? (
  <div className="p-6 bg-red-50 border border-yellow-200 rounded-xl text-yellow-600 font-medium shadow-md">
    ⚠️ Please create the following accounts in <strong>Chart of Accounts</strong> before using Accounts Payable:
    <ul className="list-disc list-inside mt-2">
      {missingAccounts.map((m) => (
        <li key={m}>{m}</li>
      ))}
    </ul>
  </div>
) : (
  <>
          {/* Vendors */}
          {tab === "vendors" && (
            <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
              <h2 className="font-semibold mb-4 text-lg text-cyan-300 drop-shadow">
                Vendors
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addVendor(new FormData(e.currentTarget));
                  e.currentTarget.reset();
                }}
                className="mb-6 flex flex-wrap gap-3"
              >
                <input
                  name="name"
                  placeholder="Name"
                  required
                  className="border border-gray-700 bg-gray-800 text-gray-100 p-2 rounded-lg"
                />
                <input
                  name="email"
                  placeholder="Email"
                  className="border border-gray-700 bg-gray-800 text-gray-100 p-2 rounded-lg"
                />
                <input
                  name="phone"
                  placeholder="Phone"
                  className="border border-gray-700 bg-gray-800 text-gray-100 p-2 rounded-lg"
                />
                <input
                  name="address"
                  placeholder="Address"
                  className="border border-gray-700 bg-gray-800 text-gray-100 p-2 rounded-lg"
                />
                <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-lg hover:scale-105 transition">
                  Add Vendor
                </button>
              </form>
              <div className="bg-gray-800 rounded-xl shadow-lg p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-300">
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((v) => (
                      <tr
                        key={v.id}
                        className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                      >
                        <td className="p-3">{v.name}</td>
                        <td className="p-3">{v.email}</td>
                        <td className="p-3">{v.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bills */}
          {tab === "bills" && (
            <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
              <h2 className="font-semibold mb-4 text-lg text-cyan-300 drop-shadow">
                Bills
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addBill(new FormData(e.currentTarget));
                  e.currentTarget.reset();
                }}
                className="mb-6 flex flex-wrap gap-3"
              >
                <select
                  name="vendorId"
                  required
                  className="border border-gray-700 bg-gray-800 text-gray-100 p-2 rounded-lg"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <input
                  name="invoiceNo"
                  placeholder="Invoice No"
                  required
                  className="border border-gray-700 bg-gray-800 text-gray-100 p-2 rounded-lg"
                />
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  required
                  className="border border-gray-700 bg-gray-800 text-gray-100 p-2 rounded-lg"
                />
                <input
                  name="dueDate"
                  type="date"
                  required
                  className="border border-gray-700 bg-gray-800 text-gray-100 p-2 rounded-lg"
                />
                <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-lg hover:scale-105 transition">
                  Add Bill
                </button>
              </form>
              <div className="bg-gray-800 rounded-xl shadow-lg p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-300">
                      <th className="p-3 text-left">Vendor</th>
                      <th className="p-3 text-left">Invoice</th>
                      <th className="p-3 text-left">Amount</th>
                      <th className="p-3 text-left">Due Date</th>
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((b) => (
                      <tr
                        key={b.id}
                        className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                      >
                        <td className="p-3">{b.vendor?.name || b.vendorId}</td>
                        <td className="p-3">{b.invoiceNo}</td>
                        <td className="p-3 text-red-400">
                          ${b.amount.toFixed(2)}
                        </td>
                        <td className="p-3">
                          {b.dueDate
                            ? new Date(b.dueDate).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className={`p-3 font-medium ${statusColor(b.status)}`}>
                          {b.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payments */}
          {tab === "payments" && (
            <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
              <h2 className="font-semibold mb-4 text-lg text-cyan-300 drop-shadow">
                Payments
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addPayment(new FormData(e.currentTarget));
                  e.currentTarget.reset();
                }}
                className="mb-6 flex flex-wrap gap-3"
              >
                <select
                  name="billId"
                  required
                  className="border border-gray-700 bg-gray-800 text-gray-100 p-2 rounded-lg"
                >
                  <option value="">Select Bill</option>
                  {bills.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.invoiceNo} - {b.vendor?.name}
                    </option>
                  ))}
                </select>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  required
                  className="border border-gray-700 bg-gray-800 text-gray-100 p-2 rounded-lg"
                />
                <input
                  name="paidDate"
                  type="date"
                  required
                  className="border border-gray-700 bg-gray-800 text-gray-100 p-2 rounded-lg"
                />
                <input
                  name="method"
                  placeholder="Method"
                  required
                  className="border border-gray-700 bg-gray-800 text-gray-100 p-2 rounded-lg"
                />
                <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-lg hover:scale-105 transition">
                  Add Payment
                </button>
              </form>
              <div className="bg-gray-800 rounded-xl shadow-lg p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-300">
                      <th className="p-3 text-left">Bill</th>
                      <th className="p-3 text-left">Amount</th>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                      >
                        <td className="p-3">{p.bill?.invoiceNo || p.billId}</td>
                        <td className="p-3 text-green-400">
                          ${p.amount.toFixed(2)}
                        </td>
                        <td className="p-3">
                          {new Date(p.paidDate).toLocaleDateString()}
                        </td>
                        <td className="p-3">{p.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
