"use client";

import { useEffect, useState } from "react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
} from "chart.js";
import { api } from "../../lib/api";
import{ Link }from "react-router-dom";

// ✅ Register chart.js modules
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement
);

type Plan = { id: string; name: string; price: number; interval: string };
type Subscription = { id: string; status: string; renewalDate: string; plan?: Plan };

export default function TenantDashboard() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [legalQueries, setLegalQueries] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api("/subscription/billing/me").catch(() => null),
      api("/customers?limit=5").catch(() => ({ items: [] })),
      api("/legal/queries?status=pending&limit=5").catch(() => ({ items: [] })),
      api("/analytics/payments").catch(() => null),
      api("/analytics/ledger").catch(() => null),
      api("/analytics/compliance").catch(() => null),
      api("/accounts").catch(() => []),
      api("/accounting/journal").catch(() => []),
    ])
      .then(([sub, custRes, legalRes, payments, ledger, compliance, accRes, journalRes]) => {
        setSubscription(sub);
        setCustomers(custRes.items || []);
        setLegalQueries(legalRes.items || []);
        setAnalytics({ payments, ledger, compliance });
        setAccounts(accRes || []);
        setJournal(journalRes || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6">Loading dashboard...</p>;

  return (
    <div className="p-6 bg-white min-h-screen text-gray-900 space-y-10">
      {/* Title */}
      <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
        Dashboard
      </h1>

      {/* Subscription Summary */}
      <div className="bg-gray-100 rounded-2xl shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-purple-600 drop-shadow">
          Subscription
        </h2>
        {!subscription ? (
          <p className="text-gray-600">
            No active subscription.{" "}
            <Link to="/tenant/billing" className="text-blue-600 hover:underline">
              Subscribe now
            </Link>
          </p>
        ) : (
          <>
            <p>
              <span className="font-medium">Plan:</span>{" "}
              {subscription.plan?.name} (${subscription.plan?.price}/
              {subscription.plan?.interval})
            </p>
            <p>
              <span className="font-medium">Status:</span>{" "}
              <span
                className={
                  subscription.status === "active"
                    ? "text-green-600 font-semibold"
                    : "text-red-600 font-semibold"
                }
              >
                {subscription.status}
              </span>
            </p>
            <p>
              <span className="font-medium">Renews:</span>{" "}
              {subscription.renewalDate
                ? new Date(subscription.renewalDate).toLocaleDateString()
                : "—"}
            </p>
          </>
        )}
        <Link
          to="/tenant/billing"
          className="block mt-3 text-blue-600 hover:underline text-sm"
        >
          Go to Billing →
        </Link>
      </div>

      {/* Analytics / Accounts / Journal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Accounts Chart */}
        {accounts.length > 0 && (
          <div className="bg-gray-100 p-6 rounded-2xl shadow-md border border-gray-200">
            <h3 className="font-semibold mb-3 text-blue-600">Accounts Overview</h3>
            <Doughnut
              data={{
                labels: accounts.map((a) => a.name),
                datasets: [
                  {
                    label: "Accounts",
                    data: accounts.map((a) => 1), // each account counts as 1
                    backgroundColor: [
                      "rgba(37, 99, 235, 0.6)",
                      "rgba(16, 185, 129, 0.6)",
                      "rgba(244, 63, 94, 0.6)",
                      "rgba(234, 179, 8, 0.6)",
                    ],
                  },
                ],
              }}
            />
            <Link
              to="/tenant/accounting/accounts"
              className="block mt-3 text-blue-600 hover:underline text-sm"
            >
              Manage Accounts →
            </Link>
          </div>
        )}

        {/* Journal Chart */}
        {journal.length > 0 && (
          <div className="bg-gray-100 p-6 rounded-2xl shadow-md border border-gray-200">
            <h3 className="font-semibold mb-3 text-green-600">Journal Activity</h3>
            <Bar
              data={{
                labels: journal.map((e) => e.date),
                datasets: [
                  {
                    label: "Debit",
                    data: journal.map((e) => e.debit),
                    backgroundColor: "rgba(16, 185, 129, 0.6)",
                  },
                  {
                    label: "Credit",
                    data: journal.map((e) => e.credit),
                    backgroundColor: "rgba(239, 68, 68, 0.6)",
                  },
                ],
              }}
            />
            <Link
              to="/tenant/accounting/journal"
              className="block mt-3 text-green-600 hover:underline text-sm"
            >
              View Journal →
            </Link>
          </div>
        )}
      </div>

      {/* Animated Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-white animate-pulse">
          <span className="text-3xl font-bold">99%</span>
          <span className="text-sm">Uptime</span>
        </div>
        <div className="bg-gradient-to-r from-pink-500 to-red-500 rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-white animate-bounce">
          <span className="text-3xl font-bold">24/7</span>
          <span className="text-sm">Support</span>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-white animate-spin-slow">
          <span className="text-3xl font-bold">AI</span>
          <span className="text-sm">Automation</span>
        </div>
      </div>

      {/* Customers Summary */}
      <div className="bg-gray-100 p-6 rounded-2xl shadow-md border border-gray-200">
        <h2 className="text-xl font-semibold mb-3 text-blue-600">Recent Customers</h2>
        {customers.length === 0 ? (
          <p className="text-gray-500">No customers found.</p>
        ) : (
          <ul className="divide-y divide-gray-300">
            {customers.map((c: any) => (
              <li key={c.id} className="py-2 flex justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-gray-500">{c.email}</p>
                </div>
                <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/tenant/customers"
          className="block mt-3 text-blue-600 hover:underline text-sm"
        >
          Manage Customers →
        </Link>
      </div>

      {/* Legal Queries Summary */}
      <div className="bg-gray-100 p-6 rounded-2xl shadow-md border border-gray-200">
        <h2 className="text-xl font-semibold mb-3 text-pink-600">
          Pending Legal Queries
        </h2>
        {legalQueries.length === 0 ? (
          <p className="text-gray-500">No pending queries.</p>
        ) : (
          <ul className="divide-y divide-gray-300">
            {legalQueries.map((q: any) => (
              <li key={q.id} className="py-2">
                <p className="font-medium">{q.question}</p>
                <p className="text-xs text-gray-500">
                  {new Date(q.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/tenant/legalai"
          className="block mt-3 text-pink-600 hover:underline text-sm"
        >
          Go to LegalAI →
        </Link>
      </div>
    </div>
  );

}

