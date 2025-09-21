"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

type KPIBlockProps = {
  title: string;
  value: string | number;
};

function KPIBlock({ title, value }: KPIBlockProps) {
  return (
    <div className="p-4 border rounded-lg bg-gray-50 shadow-sm">
      <h4 className="text-sm text-gray-500">{title}</h4>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"payments" | "ledger" | "compliance">("payments");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  let cancelled = false;

  const run = async () => {
    setLoading(true);

    try {
      const res = await api(`/analytics/${activeTab}`);

      if (!cancelled) {
        setData((prev: any) => {
          // ✅ Prevent infinite loop if data is identical
          const next = res || { kpis: {}, series: {} };
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        });
      }
    } catch (err) {
      if (!cancelled) console.error(err);
    } finally {
      if (!cancelled) setLoading(false);
    }
  };

  run();

  return () => {
    cancelled = true;
  };
}, [activeTab]);


  const renderKPIs = (kpis: Record<string, any>) => {
    const entries = Object.entries(kpis || {});
    if (!entries.length) return <p className="text-gray-500">No KPIs available</p>;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {entries.map(([key, value]) => (
          <KPIBlock key={key} title={key} value={value} />
        ))}
      </div>
    );
  };

  const renderSeries = (series: any) => {
    if (!series || !series.labels) return <p className="text-gray-500">No series data</p>;

    const keys = Object.keys(series).filter((k) => Array.isArray(series[k]));
    const length = Math.max(...keys.map((k) => series[k]?.length || 0));

   return (
<div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-800/50">
<table className="min-w-full text-sm">
<thead>
<tr className="bg-gray-800 text-gray-200">
{keys.map((key) => (
<th key={key} className="px-4 py-3 text-left capitalize">
{key}
</th>
))}
</tr>
</thead>
<tbody>
{Array.from({ length }).map((_, idx) => (
<tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/30">
{keys.map((key) => (
<td key={key} className="px-4 py-3 text-gray-300">
{series[key]?.[idx] ?? "—"}
</td>
))}
</tr>
))}
</tbody>
</table>
</div>
);
};


return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
      Analytics Dashboard
    </h1>

    {/* Tabs */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-4 flex space-x-4 text-gray-100">
      {["payments", "ledger", "compliance"].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab as any)}
          className={`pb-2 px-4 font-medium transition-colors ${
            activeTab === tab
              ? "border-b-2 border-cyan-400 text-cyan-300"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>

    {/* Content Area */}
    <div className="bg-white rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-900">
      {loading ? (
        <p className="text-gray-500">Loading {activeTab}...</p>
      ) : data ? (
        <div>
          {renderKPIs(data.kpis)}
          {renderSeries(data.series)}
        </div>
      ) : (
        <p className="text-gray-500 italic">No data available</p>
      )}
    </div>
  </div>
);


}