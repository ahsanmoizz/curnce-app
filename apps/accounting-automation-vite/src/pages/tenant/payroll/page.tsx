"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function PayrollPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingAccounts, setMissingAccounts] = useState<string[]>([]);

  // Employee form state
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empSalary, setEmpSalary] = useState<number | "">("");

  // Payroll run form state
  const [period, setPeriod] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ---- Fetch employees + runs + account readiness ----
  useEffect(() => {
    const loadData = async () => {
      try {
        const accountsRes = await api("/accounts");

        const expense = accountsRes.some(
          (a: any) =>
            a.name?.toLowerCase().includes("payroll expense") &&
            a.type === "EXPENSE"
        );
        const cash = accountsRes.some(
          (a: any) => a.name?.toLowerCase().includes("cash") && a.type === "ASSET"
        );
        // ✅ allow ANY payroll liability account
        const liability = accountsRes.some(
          (a: any) =>
            a.type === "LIABILITY" && a.name?.toLowerCase().includes("payroll")
        );

        const missing: string[] = [];
        if (!expense) missing.push("Payroll Expense (EXPENSE)");
        if (!cash) missing.push("Cash (ASSET)");
        if (!liability) missing.push("Payroll Liabilities (LIABILITY)");

        setMissingAccounts(missing);

        if (missing.length > 0) {
          setLoading(false);
          return;
        }

        const [emps, pruns] = await Promise.all([
          api("/payroll/employees"),
          api("/payroll/runs"),
        ]);
        setEmployees(emps);
        setRuns(pruns);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ---- Add Employee ----
  const addEmployee = async () => {
    try {
      if (!empName || !empEmail || !empRole || !empSalary) {
        alert("Please fill all employee fields");
        return;
      }
      const dto = { name: empName, email: empEmail, role: empRole, salary: empSalary };
      const emp = await api("/payroll/employee", {
        method: "POST",
        body: JSON.stringify(dto),
      });
      setEmployees((prev) => [...prev, emp]);
      setEmpName("");
      setEmpEmail("");
      setEmpRole("");
      setEmpSalary("");
    } catch (err) {
      console.error(err);
      alert("Failed to add employee");
    }
  };

  // ---- Run Payroll ----
  const runPayroll = async () => {
    try {
      if (!period || !startDate || !endDate) {
        alert("Please fill period, start, and end dates");
        return;
      }
      const dto = {
        period,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      };
      const result = await api("/payroll/run", {
        method: "POST",
        body: JSON.stringify(dto),
      });
      alert(`Payroll run created: ${result.cycle.id}`);
      setRuns((prev) => [result.cycle, ...prev]);
      setPeriod("");
      setStartDate("");
      setEndDate("");
         
    } catch (err) {
      console.error(err);
  

    }
    finally {
    // ✅ Chahe error ho ya na ho, 2s baad refresh hoga
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }
  };

  // ---- Block UI if accounts missing ----
  if (!loading && missingAccounts.length > 0) {
    return (
      <div className="p-6 bg-white min-h-screen text-gray-900">
        <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
          Payroll
        </h1>
        <div className="p-6 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800 font-medium">
          ⚠️ The following required accounts are missing:
          <ul className="list-disc list-inside mt-2">
            {missingAccounts.map((acc) => (
              <li key={acc}>{acc}</li>
            ))}
          </ul>
          <p className="mt-3">
            Please create these accounts in your Chart of Accounts before running payroll.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <p className="p-6">Loading payroll data...</p>;
return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
      Employees & Payroll
    </h1>

    {/* Employees Section */}
    <div className="mb-10 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="text-xl font-semibold mb-4 text-cyan-300 drop-shadow">
        Employees
      </h2>
      {employees.length === 0 ? (
        <p className="text-gray-400 italic">No employees yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-300">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-right">Salary</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr
                key={emp.id}
                className="border-b border-gray-700 hover:bg-gray-700/50 transition"
              >
                <td className="p-3">{emp.name}</td>
                <td className="p-3">{emp.email}</td>
                <td className="p-3">{emp.role}</td>
                <td className="p-3 text-right font-semibold text-green-400">
                  ${emp.salary}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add Employee Form */}
      <div className="mt-6 p-4 bg-gray-800 rounded-xl shadow-md">
        <h3 className="font-semibold mb-3 text-indigo-300 drop-shadow">
          Add Employee
        </h3>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Name"
            value={empName}
            onChange={(e) => setEmpName(e.target.value)}
            className="border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 w-40"
          />
          <input
            type="email"
            placeholder="Email"
            value={empEmail}
            onChange={(e) => setEmpEmail(e.target.value)}
            className="border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 w-56"
          />
          <input
            type="text"
            placeholder="Role"
            value={empRole}
            onChange={(e) => setEmpRole(e.target.value)}
            className="border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 w-40"
          />
          <input
            type="number"
            placeholder="Salary"
            value={empSalary}
            onChange={(e) => setEmpSalary(Number(e.target.value))}
            className="border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 w-32"
          />
          <button
            onClick={addEmployee}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition"
          >
            Add
          </button>
        </div>
      </div>
    </div>

    {/* Payroll Runs Section */}
    <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="text-xl font-semibold mb-4 text-cyan-300 drop-shadow">
        Payroll Runs
      </h2>
      {runs.length === 0 ? (
        <p className="text-gray-400 italic">No payroll runs yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-300">
              <th className="p-3 text-left">Period</th>
              <th className="p-3 text-left">Start Date</th>
              <th className="p-3 text-left">End Date</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr
                key={run.id}
                className="border-b border-gray-700 hover:bg-gray-700/50 transition"
              >
                <td className="p-3">{run.period}</td>
                <td className="p-3">{new Date(run.startDate).toLocaleDateString()}</td>
                <td className="p-3">{new Date(run.endDate).toLocaleDateString()}</td>
                <td className="p-3 font-medium text-indigo-300">{run.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Run Payroll Form */}
      <div className="mt-6 p-4 bg-gray-800 rounded-xl shadow-md">
        <h3 className="font-semibold mb-3 text-indigo-300 drop-shadow">
          Run Payroll
        </h3>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Period (e.g. 2025-08)"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 w-40"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={runPayroll}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition"
          >
            Run
          </button>
        </div>
      </div>
    </div>
  </div>
);

}
