"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { StatGroup, StatsResponse, FilterParams } from "@/types";

interface StatsPanelProps {
  filters?: FilterParams;
}

type TabType = "region" | "size" | "type" | "nace" | "year";

const COLORS = [
  "#0d9488",
  "#14b8a6",
  "#2dd4bf",
  "#67e8f9",
  "#06b6d4",
  "#0891b2",
  "#0e7490",
];

export default function StatsPanel({ filters = {} }: StatsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("region");
  const [data, setData] = useState<StatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs: Array<{ id: TabType; label: string; groupBy: string }> = [
    { id: "region", label: "Podľa kraja", groupBy: "region" },
    { id: "size", label: "Podľa veľkosti", groupBy: "size" },
    { id: "type", label: "Podľa typu závierky", groupBy: "statement_type" },
    { id: "nace", label: "Podľa odvetvia (NACE)", groupBy: "nace" },
    { id: "year", label: "Trend podľa rokov", groupBy: "year" },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const tab = tabs.find((t) => t.id === activeTab);
        if (!tab) return;

        const params = new URLSearchParams();
        params.append("groupBy", tab.groupBy);

        // Add filter params
        if (filters.region) params.append("region", filters.region);
        if (filters.district) params.append("district", filters.district);
        if (filters.size) params.append("size", filters.size);
        if (filters.legal_form) params.append("legal_form", filters.legal_form);
        if (filters.nace_code) params.append("nace_code", filters.nace_code);
        if (filters.period_from) params.append("period_from", String(filters.period_from));
        if (filters.period_to) params.append("period_to", String(filters.period_to));
        if (filters.consolidated) params.append("consolidated", "true");

        const response = await fetch(`/api/stats?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch statistics");

        const result: StatsResponse = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [activeTab, filters]);

  const renderChart = () => {
    if (loading) {
      return <div className="flex justify-center items-center h-96 text-slate-600">Načítavanie...</div>;
    }

    if (error) {
      return (
        <div className="flex justify-center items-center h-96 text-red-600">
          Chyba: {error}
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="flex justify-center items-center h-96 text-slate-600">
          Žiadne dáta k zobrazeniu
        </div>
      );
    }

    // Prepare data for charts
    const chartData = data.map((item) => ({
      name: item.label,
      value: item.count,
      ...item,
    }));

    switch (activeTab) {
      case "region":
      case "size":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.5rem",
                }}
                formatter={(value) => [`${value} záznamov`, "Počet"]}
              />
              <Bar dataKey="value" fill="#0d9488" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "type":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} záznamov`, "Počet"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center gap-4">
              {chartData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                  <span className="text-sm text-slate-700">
                    {item.name}: <strong>{item.value}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case "nace":
        return (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={chartData.slice(0, 15)}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={190} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.5rem",
                }}
                formatter={(value) => [`${value} záznamov`, "Počet"]}
              />
              <Bar dataKey="value" fill="#0d9488" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "year":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.5rem",
                }}
                formatter={(value) => [`${value} záznamov`, "Počet"]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0d9488"
                strokeWidth={2}
                dot={{ fill: "#0d9488", r: 5 }}
                activeDot={{ r: 7 }}
                name="Počet záznamov"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-6">Štatistiky</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="w-full bg-white rounded-lg border border-slate-100 p-6">
        {renderChart()}
      </div>
    </div>
  );
}
