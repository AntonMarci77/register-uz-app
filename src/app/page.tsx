"use client";

import { useState, useCallback } from "react";
import { FilterParams, Entity, Statement, PaginatedResponse } from "@/types";
import FilterPanel from "@/components/FilterPanel";
import DataTable, { Column } from "@/components/DataTable";
import StatsPanel from "@/components/StatsPanel";
import ExportButton from "@/components/ExportButton";
import SyncStatus from "@/components/SyncStatus";

type TabType = "entities" | "statements" | "stats";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("statements");
  const [filters, setFilters] = useState<FilterParams>({});
  const [entitiesData, setEntitiesData] = useState<PaginatedResponse<Entity> | null>(null);
  const [statementsData, setStatementsData] = useState<PaginatedResponse<Statement> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFilter = useCallback(async (params: FilterParams) => {
    try {
      setLoading(true);
      setFilters(params);

      // Fetch both entities and statements data
      const queryParams = new URLSearchParams();
      queryParams.append("page", String(params.page || 1));
      queryParams.append("limit", "20");

      if (params.search) queryParams.append("search", params.search);
      if (params.region) queryParams.append("region", params.region);
      if (params.district) queryParams.append("district", params.district);
      if (params.legal_form) queryParams.append("legal_form", params.legal_form);
      if (params.size) queryParams.append("size", params.size);
      if (params.nace_code) queryParams.append("nace_code", params.nace_code);
      if (params.statement_type) queryParams.append("statement_type", params.statement_type);
      if (params.period_from) queryParams.append("period_from", String(params.period_from));
      if (params.period_to) queryParams.append("period_to", String(params.period_to));
      if (params.consolidated) queryParams.append("consolidated", "true");
      if (params.template_id) queryParams.append("template_id", String(params.template_id));

      const [entitiesRes, statementsRes] = await Promise.all([
        fetch(`/api/entities?${queryParams.toString()}`),
        fetch(`/api/statements?${queryParams.toString()}`),
      ]);

      if (entitiesRes.ok) {
        const data = await entitiesRes.json();
        setEntitiesData(data);
      }

      if (statementsRes.ok) {
        const data = await statementsRes.json();
        setStatementsData(data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePageChange = (page: number) => {
    handleFilter({ ...filters, page });
  };

  const entityColumns: Column<Entity>[] = [
    {
      key: "name",
      label: "Názov",
      sortable: true,
      width: "w-1/4",
    },
    {
      key: "ico",
      label: "IČO",
      sortable: true,
    },
    {
      key: "legal_form",
      label: "Právna forma",
      sortable: true,
    },
    {
      key: "region",
      label: "Kraj",
      sortable: true,
    },
    {
      key: "size",
      label: "Veľkosť",
      sortable: true,
    },
    {
      key: "nace_code",
      label: "SK NACE",
      sortable: true,
    },
  ];

  const statementColumns: Column<Statement>[] = [
    {
      key: "entity_name",
      label: "Názov jednotky",
      sortable: true,
      width: "w-1/5",
    },
    {
      key: "statement_type",
      label: "Typ závierky",
      sortable: true,
    },
    {
      key: "period_to",
      label: "Koniec obdobia",
      sortable: true,
      render: (value) =>
        value ? new Date(String(value)).toLocaleDateString("sk-SK") : "-",
    },
    {
      key: "total_assets",
      label: "Celkový majetok",
      sortable: true,
      render: (value) => (value ? `${(Number(value) / 1000).toFixed(0)} tis.` : "-"),
    },
    {
      key: "net_income",
      label: "Čistý príjem",
      sortable: true,
      render: (value) => (value ? `${(Number(value) / 1000).toFixed(0)} tis.` : "-"),
    },
    {
      key: "filing_date",
      label: "Dátum podania",
      sortable: true,
      render: (value) =>
        value ? new Date(String(value)).toLocaleDateString("sk-SK") : "-",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-slate-800">
              Prehľad účtovných závierok
            </h1>
            <p className="text-slate-600 text-sm">
              Filtrovanie, prehľadávanie a export finančných výkazov
              účtovných jednotiek z registeruz.sk.
            </p>
          </div>
        </div>

        {/* Sync Status */}
        <div className="max-w-7xl mx-auto px-6 pb-4">
          <SyncStatus />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter Panel */}
        <div className="mb-8">
          <FilterPanel onFilter={handleFilter} />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("statements")}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === "statements"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-slate-600 hover:text-slate-800"
            }`}
          >
            Účtovné závierky
          </button>
          <button
            onClick={() => setActiveTab("entities")}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === "entities"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-slate-600 hover:text-slate-800"
            }`}
          >
            Účtovné jednotky
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              activeTab === "stats"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-slate-600 hover:text-slate-800"
            }`}
          >
            Štatistiky
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
          {activeTab === "statements" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800">
                  Účtovné závierky
                </h2>
                <ExportButton filters={filters} dataType="statements" />
              </div>
              <DataTable
                columns={statementColumns}
                data={statementsData?.data || []}
                loading={loading}
                emptyMessage="Žiadne účtovné závierky sa nezhodujú s vybranými filtrami."
                pagination={
                  statementsData
                    ? {
                        page: statementsData.page,
                        limit: statementsData.limit,
                        total: statementsData.total,
                        onPageChange: handlePageChange,
                      }
                    : undefined
                }
              />
            </div>
          )}

          {activeTab === "entities" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800">
                  Účtovné jednotky
                </h2>
                <ExportButton filters={filters} dataType="entities" />
              </div>
              <DataTable
                columns={entityColumns}
                data={entitiesData?.data || []}
                loading={loading}
                emptyMessage="Žiadne účtovné jednotky sa nezhodujú s vybranými filtrami."
                pagination={
                  entitiesData
                    ? {
                        page: entitiesData.page,
                        limit: entitiesData.limit,
                        total: entitiesData.total,
                        onPageChange: handlePageChange,
                      }
                    : undefined
                }
              />
            </div>
          )}

          {activeTab === "stats" && <StatsPanel filters={filters} />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300 px-6 py-8 mt-12">
        <div className="max-w-7xl mx-auto text-center text-sm">
          <p>
            © 2026 NIVEN OÜ. Aplikácia pre výskumné účely
            študentov Ekonomickej univerzity v Bratislave.
          </p>
        </div>
      </footer>
    </div>
  );
}
