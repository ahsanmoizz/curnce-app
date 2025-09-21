"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [newContract, setNewContract] = useState({ title: "", type: "", content: "" });
  const [statusFilter, setStatusFilter] = useState("");
const [uploadedDocId, setUploadedDocId] = useState<string | null>(null);

  // Load contracts
  useEffect(() => {
    loadContracts();
  }, [statusFilter]);

  async function loadContracts() {
    const res = await api(`/contracts${statusFilter ? `?status=${statusFilter}` : ""}`);
    setContracts(res);
  }

  // Create contract
  async function handleCreateContract(e: React.FormEvent) {
    e.preventDefault();
    await api("/contracts", {
      method: "POST",
      body: JSON.stringify(newContract),
    });
    setNewContract({ title: "", type: "", content: "" });
    loadContracts();
  }

  // Upload contract PDF
 async function handleUploadPdf(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const form = e.currentTarget;
  const fileInput = form.querySelector("input[type=file]") as HTMLInputElement;
  if (!fileInput.files?.[0]) return alert("Select a file first");

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  const res = await api("/contracts/upload", {
    method: "POST",
    body: formData,
  });

  setUploadedDocId(res.documentId); // 🆕 Save the documentId
  alert(`Uploaded: ${res.name}`);
}

  // Analyze document
  async function handleAnalyze() {
  if (!uploadedDocId) return alert("Upload a PDF first");
  const res = await api(`/contracts/${uploadedDocId}/analyze`, { method: "POST" });
  alert(`Analysis done: Risk ${res.riskLevel}\nSummary: ${res.summary}`);
}

async function handleGetAnalysis() {
  if (!uploadedDocId) return alert("Upload a PDF first");
  const res = await api(`/contracts/${uploadedDocId}/analysis`);
  alert(`Latest analysis: ${res.summary}`);
}

  // Add version
  async function handleAddVersion(id: string, content: string) {
    await api(`/contracts/${id}/version`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    loadContracts();
    selectContract(id);
  }

  // Sign contract
  async function handleSignContract(id: string, role: string, signature: string) {
    await api(`/contracts/${id}/sign`, {
      method: "POST",
      body: JSON.stringify({ role, signature }),
    });
    loadContracts();
    selectContract(id);
  }

  // Update status
  async function handleUpdateStatus(id: string, status: string) {
    await api(`/contracts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    loadContracts();
    selectContract(id);
  }

  // Get one
  async function selectContract(id: string) {
    const res = await api(`/contracts/${id}`);
    setSelected(res);
  }
// =======================
// CONTRACTS PAGE (Styled)
// =======================
return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
      Contracts
    </h1>

    {/* Create contract */}
    <form
      onSubmit={handleCreateContract}
      className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100 space-y-3"
    >
      <h2 className="font-medium text-lg text-cyan-300 drop-shadow">Create Contract</h2>
      <input
        placeholder="Title"
        value={newContract.title}
        onChange={(e) => setNewContract({ ...newContract, title: e.target.value })}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <input
        placeholder="Type"
        value={newContract.type}
        onChange={(e) => setNewContract({ ...newContract, type: e.target.value })}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <textarea
        placeholder="Content"
        value={newContract.content}
        onChange={(e) => setNewContract({ ...newContract, content: e.target.value })}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:scale-105 transition">
        Create
      </button>
    </form>

    {/* Upload PDF */}
    <form
      onSubmit={handleUploadPdf}
      className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100 space-y-3"
    >
      <h2 className="font-medium text-lg text-cyan-300 drop-shadow">Upload Contract PDF</h2>
      <input
        type="file"
        accept="application/pdf"
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full text-gray-300"
      />
      <button className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-lg hover:scale-105 transition">
        Upload
      </button>
    </form>
     {uploadedDocId && (
  <div className="space-x-2 mb-6">
    <button
      onClick={handleAnalyze}
      className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
    >
      Analyze
    </button>
    <button
      onClick={handleGetAnalysis}
      className="px-3 py-1 bg-purple-700 text-white rounded-lg hover:bg-purple-600"
    >
      Get Latest Analysis
    </button>
  </div>
)}

    {/* Filters */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <label className="mr-3 font-medium text-cyan-300 drop-shadow">Filter by Status:</label>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
      >
        <option value="">All</option>
        <option value="draft">Draft</option>
        <option value="pending_approval">Pending Approval</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
        <option value="disputed">Disputed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    {/* List */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <ul className="divide-y divide-gray-700">
        {contracts.map((c) => (
          <li
            key={c.id}
            className="p-4 flex justify-between hover:bg-gray-800/70 cursor-pointer transition rounded-lg"
            onClick={() => selectContract(c.id)}
          >
            <div>
              <p className="font-medium text-gray-100">{c.title}</p>
              <p className="text-sm text-gray-400">{c.type}</p>
            </div>
            <span className="text-xs bg-gray-800 px-2 py-1 rounded text-cyan-300">
              {c.status}
            </span>
          </li>
        ))}
      </ul>
    </div>

    {/* Contract detail */}
    {selected && (
      <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100 space-y-4">
        <h2 className="font-medium text-lg text-cyan-300 drop-shadow">Contract Details</h2>
        <p><span className="font-medium">Title:</span> {selected.title}</p>
        <p><span className="font-medium">Type:</span> {selected.type}</p>
        <p><span className="font-medium">Status:</span> {selected.status}</p>

        {/* Versions */}
        <h3 className="font-medium text-cyan-400">Versions</h3>
        <ul className="list-disc ml-5 text-gray-300">
          {selected.versions?.map((v: any) => (
            <li key={v.id}>
              v{v.version}: {v.content.slice(0, 50)}...
            </li>
          ))}
        </ul>
        <button
          onClick={() => {
            const content = prompt("Enter new version content:");
            if (content) handleAddVersion(selected.id, content);
          }}
          className="px-3 py-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:scale-105 transition"
        >
          Add Version
        </button>

        {/* Signatures */}
        <h3 className="font-medium text-cyan-400">Signatures</h3>
        <ul className="list-disc ml-5 text-gray-300">
          {selected.signatures?.map((s: any) => (
            <li key={s.id}>
              {s.role} signed by {s.userId}
            </li>
          ))}
        </ul>
        <button
          onClick={() => {
            const role = prompt("Enter your role:");
            const signature = prompt("Enter your signature text:");
            if (role && signature) handleSignContract(selected.id, role, signature);
          }}
          className="px-3 py-1 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-lg hover:scale-105 transition"
        >
          Sign Contract
        </button>

        {/* Status update */}
        <h3 className="font-medium text-cyan-400">Update Status</h3>
        <div className="space-x-2">
          {["draft","pending_approval","active","completed","disputed","cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => handleUpdateStatus(selected.id, s)}
              className="px-3 py-1 bg-gray-800 text-gray-200 rounded hover:bg-gray-700"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Analysis */}
             </div>
    )}
  </div>
);

}
