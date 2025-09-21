"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

type Invoice = {
  id: string;
  customerId: string;
  invoiceNo: string;
  amount: number;
  status: string;
  dueDate: string;
  customer?: Customer;
};

type Payment = {
  id: string;
  invoiceId: string;
  amount: number;
  paidDate: string;
  method: string;
  invoice?: Invoice;
};

export default function ReceivablePage() {
   const [accounts, setAccounts] = useState<any[]>([]);
  const [hasAR, setHasAR] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingAccounts, setMissingAccounts] = useState<string[]>([]);

  const [tab, setTab] = useState<"customers" | "invoices" | "payments">(
    "customers"
  );

  // ---- Fetch data ----
  useEffect(() => {
  const loadData = async () => {
    try {
      const accountsRes = await api("/accounts");
      setAccounts(accountsRes);

      const ar = accountsRes.some((a: any) => a.name?.toLowerCase() === "accounts receivable" && a.type === "ASSET");
      const cash = accountsRes.some((a: any) => a.name?.toLowerCase().includes("cash") && a.type === "ASSET");
      const revenue = accountsRes.some((a: any) => a.type === "INCOME");

      const missing: string[] = [];
      if (!ar) missing.push("Accounts Receivable (ASSET)");
      if (!cash) missing.push("Cash (ASSET)");
      if (!revenue) missing.push("Revenue (INCOME)");

      setMissingAccounts(missing);

      if (missing.length > 0) {
        setLoading(false);
        return;
      }

      const [customers, invoices, payments] = await Promise.all([
        api("/ar/customers"),
        api("/ar/invoices"),
        api("/ar/payments"),
      ]);

      setCustomers(customers);
      setInvoices(invoices);
      setPayments(payments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  loadData();
}, []);
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

  // ---- Handlers ----
  async function addCustomer(formData: FormData) {
    const body = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
    };
    const customer = await api("/ar/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setCustomers((prev) => [...prev, customer]);
  }
async function addInvoice(formData: FormData) {
  const rawDate = formData.get("dueDate") as string; // YYYY-MM-DD
  const body = {
    customerId: formData.get("customerId") as string,
    invoiceNo: formData.get("invoiceNo") as string,
    amount: Number(formData.get("amount")),
    dueDate: rawDate ? new Date(rawDate).toISOString() : null, // 👈 FIX
  };
  const invoice = await api("/ar/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  setInvoices((prev) => [invoice, ...prev]);
}
async function addPayment(formData: FormData) {
  const rawDate = formData.get("paidDate") as string; // YYYY-MM-DD
  const body = {
    invoiceId: formData.get("invoiceId") as string,
    amount: Number(formData.get("amount")),
    paidDate: rawDate ? new Date(rawDate).toISOString() : null, // 👈 FIX
    method: formData.get("method") as string,
  };
  const payment = await api("/ar/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  setPayments((prev) => [payment, ...prev]);
}
 if (!loading && missingAccounts.length > 0) {
  return (
    <div className="p-6 bg-white min-h-screen text-gray-900">
      <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
        Accounts Receivable
      </h1>
      <div className="p-6 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800 font-medium">
        ⚠️ The following required accounts are missing:<br />
        <ul className="list-disc list-inside mt-2">
          {missingAccounts.map((acc) => (
            <li key={acc}>{acc}</li>
          ))}
        </ul>
        <p className="mt-3">Please create these accounts before using invoices or payments.</p>
      </div>
    </div>
  );
}
  return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
      Accounts Receivable
    </h1>

    {/* Tabs */}
    <div className="mb-6 flex gap-4">
      {["customers", "invoices", "payments"].map((t) => (
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
    ) : (
      <>
        {/* Customers */}
        {tab === "customers" && (
          <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
            <h2 className="font-semibold mb-4 text-cyan-300 drop-shadow">
              Customers
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addCustomer(new FormData(e.currentTarget));
                e.currentTarget.reset();
              }}
              className="mb-6 flex flex-wrap gap-3"
            >
              <input
                name="name"
                placeholder="Name"
                required
                className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
              />
              <input
                name="email"
                placeholder="Email"
                className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
              />
              <input
                name="phone"
                placeholder="Phone"
                className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
              />
             
              <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-lg hover:scale-105 transition">
                Add Customer
              </button>
            </form>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-300">
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Phone</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-700 hover:bg-gray-700/40 transition"
                  >
                    <td className="p-3">{c.name}</td>
                    <td className="p-3">{c.email}</td>
                    <td className="p-3">{c.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Invoices */}
        {tab === "invoices" && (
          <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
            <h2 className="font-semibold mb-4 text-cyan-300 drop-shadow">
              Invoices
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addInvoice(new FormData(e.currentTarget));
                e.currentTarget.reset();
              }}
              className="mb-6 flex flex-wrap gap-3"
            >
              <select
                name="customerId"
                required
                className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                name="invoiceNo"
                placeholder="Invoice No"
                required
                className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
              />
              <input
                name="amount"
                type="number"
                step="0.01"
                placeholder="Amount"
                required
                className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
              />
              <input
                name="dueDate"
                type="date"
                required
                className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
              />
              <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-lg hover:scale-105 transition">
                Add Invoice
              </button>
            </form>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-300">
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-left">Invoice</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Due Date</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-gray-700 hover:bg-gray-700/40 transition"
                  >
                    <td className="p-3">{i.customer?.name || i.customerId}</td>
                    <td className="p-3">{i.invoiceNo}</td>
                    <td className="p-3 text-green-400">
                      ${i.amount.toFixed(2)}
                    </td>
                    <td className="p-3">
                      {i.dueDate
                        ? new Date(i.dueDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3 font-medium text-yellow-400">
                      {i.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payments */}
        {tab === "payments" && (
          <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
            <h2 className="font-semibold mb-4 text-cyan-300 drop-shadow">
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
                name="invoiceId"
                required
                className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
              >
                <option value="">Select Invoice</option>
                {invoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNo} - {i.customer?.name}
                  </option>
                ))}
              </select>
              <input
                name="amount"
                type="number"
                step="0.01"
                placeholder="Amount"
                required
                className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
              />
              <input
                name="paidDate"
                type="date"
                required
                className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
              />
              <input
                name="method"
                placeholder="Method"
                required
                className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
              />
              <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-lg hover:scale-105 transition">
                Add Payment
              </button>
            </form>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-300">
                  <th className="p-3 text-left">Invoice</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Method</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-700 hover:bg-gray-700/40 transition"
                  >
                    <td className="p-3">{p.invoice?.invoiceNo || p.invoiceId}</td>
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
        )}
      </>
    )}
  </div>
);


}
