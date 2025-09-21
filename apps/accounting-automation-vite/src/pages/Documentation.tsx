// src/pages/Documentation.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function Documentation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white px-8 py-12">
      <div className="max-w-5xl mx-auto bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700 p-10">
        <h1 className="text-4xl font-extrabold text-center text-white mb-8">
          📘 Curnce: Next-Gen Chartered Accountant Platform
        </h1>
        <p className="text-gray-400 text-center mb-12 text-lg">
          A comprehensive blueprint & whitepaper for the future of accounting automation.
        </p>

        {/* Sections */}
        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-indigo-400 mb-3">1. Introduction & Vision</h2>
            <p>
              Curnce is an advanced placement and automation platform designed for Chartered Accountants (CAs).
              It integrates traditional accounting modules with Artificial Intelligence to automate auditing, tax,
              payroll, compliance, and financial decision-making. The platform leverages cloud technologies (AWS,
              Cloudflare) and ensures scalability, security, and compliance with global standards. Its ultimate goal is
              to free accountants from repetitive tasks and empower them with real-time insights, compliance tools, and
              AI-driven auditing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-indigo-400 mb-3">2. System Architecture</h2>
            <p>
              Curnce runs entirely on cloud infrastructure with data hosted on AWS and protected by Cloudflare. All user
              data, financial records, and audit logs are securely stored and encrypted. The Super Admin Panel ensures
              that only authorized administrators can configure subscription plans, monitor system health, and enforce
              compliance rules.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-indigo-400 mb-3">3. Core Features</h2>
            <table className="w-full border border-gray-700 rounded-lg overflow-hidden text-sm">
              <thead className="bg-gray-700 text-white">
                <tr>
                  <th className="px-4 py-2 text-left">Feature</th>
                  <th className="px-4 py-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                <tr>
                  <td className="px-4 py-2">Dashboard</td>
                  <td className="px-4 py-2">Quick navigation to customer ledgers, subscriptions, and key reports.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Accounts</td>
                  <td className="px-4 py-2">Tenant-level accounts for Payables, Receivables, Payroll, Tax, and Ingestion.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Journal</td>
                  <td className="px-4 py-2">Unified view of all journal entries linked across modules.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Ledger</td>
                  <td className="px-4 py-2">Account-specific ledger views with filters and search.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Payables</td>
                  <td className="px-4 py-2">Vendor management for outgoing payments.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Receivables</td>
                  <td className="px-4 py-2">Customer/vendor management for incoming receivables.</td>
                </tr>
                {/* Add remaining rows like Payroll, Tax, Audit, AI Accountant etc. */}
              </tbody>
            </table>
          </section>

          {/* Add Sections 4-8 here just like above (Feature Linkages, AI Integrations, Compliance, etc.) */}

        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm border-t border-gray-700 pt-6">
          <p>
            Made with ❤️ by{" "}
            <a
              href="https://github.com/ahsanmoizz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              ahsanmoizz
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
