"use client";

import { useState, useEffect } from "react";
import { api } from "../../../../lib/api";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState<string>("");

  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "" });
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ----------------- LOAD CUSTOMERS (GET /customers) -----------------
  useEffect(() => {
    loadCustomers();
  }, [page, status, q]);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await api(
        `/customers?page=${page}&limit=${limit}&status=${status}&q=${q}`
      );
      setCustomers(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
      alert("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  // ----------------- CREATE CUSTOMER (POST /customers) -----------------
  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/customers", {
        method: "POST",
        body: JSON.stringify(newCustomer),
      });
      setNewCustomer({ name: "", email: "", phone: "" });
      await loadCustomers();
    } catch (err) {
      console.error(err);
      alert("Failed to create customer");
    }
  }

  // ----------------- GET CUSTOMER (GET /customers/:id) -----------------
  async function handleSelectCustomer(id: string) {
    try {
      const res = await api(`/customers/${id}`);
      setSelectedCustomer(res);
    } catch (err) {
      console.error(err);
      alert("Failed to load customer details");
    }
  }

  // ----------------- SET STATUS (POST /customers/:id/status) -----------------
  async function handleSetStatus(id: string, status: string) {
    try {
      await api(`/customers/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await loadCustomers();
      if (selectedCustomer?.id === id) {
        handleSelectCustomer(id);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  }

  // ----------------- UPLOAD DOCUMENT (POST /customers/:id/documents/upload) -----------------
  async function handleUploadDocument(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector("input[type=file]") as HTMLInputElement;
    if (!fileInput.files?.[0]) return alert("Select a file first");
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
      await api(`/customers/${id}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      alert("Document uploaded");
      handleSelectCustomer(id);
    } catch (err) {
      console.error(err);
      alert("Failed to upload document");
    }
  }
  return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
      Customers
    </h1>

    {/* Create customer */}
    <form
      onSubmit={handleCreateCustomer}
      className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100 space-y-3"
    >
      <h2 className="font-medium text-lg text-cyan-300 drop-shadow">Create Customer</h2>
      <input
        placeholder="Name"
        value={newCustomer.name}
        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
        required
      />
      <input
        placeholder="Email"
        type="email"
        value={newCustomer.email}
        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
        required
      />
      <input
        placeholder="Phone"
        value={newCustomer.phone}
        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:scale-105 transition">
        Create
      </button>
    </form>

    {/* Filters */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100 flex space-x-3">
      <input
        placeholder="Search..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
      >
        <option value="">All</option>
        <option value="active">Active</option>
        <option value="under_review">Under Review</option>
        <option value="blocked">Blocked</option>
      </select>
    </div>

    {/* List */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : customers.length === 0 ? (
        <p className="text-gray-400 italic">No customers found.</p>
      ) : (
        <ul className="divide-y divide-gray-700">
          {customers.map((c) => (
            <li
              key={c.id}
              className="p-4 flex justify-between hover:bg-gray-800/70 cursor-pointer transition rounded-lg"
              onClick={() => handleSelectCustomer(c.id)}
            >
              <div>
                <p className="font-medium text-gray-100">{c.name}</p>
                <p className="text-sm text-gray-400">{c.email}</p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded font-medium ${
                  c.status === "active"
                    ? "bg-green-600/30 text-green-400"
                    : c.status === "under_review"
                    ? "bg-yellow-600/30 text-yellow-400"
                    : c.status === "blocked"
                    ? "bg-red-600/30 text-red-400"
                    : "bg-gray-700 text-cyan-300"
                }`}
              >
                {c.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>

    {/* Pagination */}
    <div className="flex space-x-2">
      <button
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
        className="px-3 py-1 border border-gray-700 bg-gray-900 text-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-800"
      >
        Prev
      </button>
      <button
        disabled={page * limit >= total}
        onClick={() => setPage(page + 1)}
        className="px-3 py-1 border border-gray-700 bg-gray-900 text-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-800"
      >
        Next
      </button>
    </div>

    {/* Selected Customer Details */}
    {selectedCustomer && (
      <div className="mt-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100 space-y-4">
        <h2 className="font-medium text-lg text-cyan-300 drop-shadow">Customer Details</h2>
        <p><span className="font-medium">Name:</span> {selectedCustomer.name}</p>
        <p><span className="font-medium">Email:</span> {selectedCustomer.email}</p>
        <p><span className="font-medium">Status:</span> {selectedCustomer.status}</p>

        {/* Status actions */}
        <div className="space-x-2 mt-2">
          <button
            onClick={() => handleSetStatus(selectedCustomer.id, "active")}
            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-500"
          >
            Set Active
          </button>
          <button
            onClick={() => handleSetStatus(selectedCustomer.id, "under_review")}
            className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500"
          >
            Under Review
          </button>
          <button
            onClick={() => handleSetStatus(selectedCustomer.id, "blocked")}
            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-500"
          >
            Block
          </button>
        </div>

        {/* Documents */}
        <h3 className="mt-4 font-medium text-cyan-400">Documents</h3>
        <ul className="list-disc ml-5 text-gray-300">
          {selectedCustomer.documents?.map((d: any, i: number) => (
            <li key={i}>
              {d.name} ({d.mime}, {Math.round(d.size / 1024)} KB)
            </li>
          ))}
        </ul>

        {/* Upload Document */}
        <form
          onSubmit={(e) => handleUploadDocument(e, selectedCustomer.id)}
          className="mt-3 space-y-2"
        >
          <input
            type="file"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full text-gray-100"
          />
          <button className="px-3 py-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:scale-105 transition">
            Upload Document
          </button>
        </form>
      </div>
    )}
  </div>
);

}
