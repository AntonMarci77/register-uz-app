"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Download, Filter } from "lucide-react";
import {
  TEMPLATE_INFO,
  getGroupedTemplates,
  getTemplateName,
  type TemplateInfo as TemplateInfoType,
} from "@/lib/template-mapping";

interface Template {
  id: number;
  nazov: string;
  nariadenieMF: string;
}

interface RowDefinition {
  oznacenie: string | null;
  cisloRiadku: number;
  text: string;
}

interface RowStat {
  row: number;
  oznacenie: string | null;
  label: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  median: number;
  stddev: number;
}

interface RowData {
  row: number;
  oznacenie: string | null;
  label: string;
  value: number | null;
  rawValue: string | null;
}

interface LineItemRecord {
  reportId: number;
  statementId: number;
  entityId: number | null;
  ico: string | null;
  nazovUJ: string | null;
  obdobieOd: string | null;
  obdobieDo: string | null;
  mena: string;
  rows: RowData[];
}

interface LineItemsResponse {
  template: {
    id: number;
    nazov: string;
    nariadenieMF: string;
  };
  table: {
    index: number;
    name: string;
    rowDefinitions: RowDefinition[];
  };
  data: LineItemRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats: {
    rowStats: RowStat[];
    totalReports: number;
  };
}

interface Codebook {
  kod: string;
  nazov: any;
  text: string;
}

interface CodebooksResponse {
  codebooks: {
    sablony: Template[];
    kraje: Codebook[];
    velkosti: Codebook[];
    pravneFormy: Codebook[];
    skNace: Codebook[];
  };
}

// Slovak locale number formatter
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return "—";
  return new Intl.NumberFormat("sk-SK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

type ViewMode = "stats" | "data";
type TableIndex = 0 | 1 | 2;

export default function VyskumPage() {
  // State: Templates and codebooks
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number>(687);
  const [codebooks, setCodebooks] = useState<CodebooksResponse["codebooks"] | null>(null);

  // State: Filters
  const [tableIndex, setTableIndex] = useState<TableIndex>(0);
  const [region, setRegion] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [legalForm, setLegalForm] = useState<string>("");
  const [naceCode, setNaceCode] = useState<string>("");
  const [periodFrom, setPeriodFrom] = useState<string>("");
  const [periodTo, setPeriodTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // State: Data and view
  const [data, setData] = useState<LineItemsResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("stats");
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch codebooks on mount
  useEffect(() => {
    const fetchCodebooks = async () => {
      try {
        const res = await fetch("/api/cb");
        if (res.ok) {
          const json = (await res.json()) as CodebooksResponse;
          setCodebooks(json.codebooks);
          // Set default template to 687 if available
          if (json.codebooks?.sablony?.some((t) => t.id === 687)) {
            setSelectedTemplate(687);
          }
        }
      } catch (err) {
        console.error("Error fetching codebooks:", err);
      }
    };
    fetchCodebooks();
  }, []);

  // Fetch line items data
  const fetchData = useCallback(
    async (pageNum: number = 1) => {
      if (!selectedTemplate) return;
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("template_id", String(selectedTemplate));
        params.append("table_index", String(tableIndex));
        params.append("page", String(pageNum));
        params.append("limit", "50");

        if (region) params.append("region", region);
        if (size) params.append("size", size);
        if (legalForm) params.append("legal_form", legalForm);
        if (naceCode) params.append("nace_code", naceCode);
        if (periodFrom) params.append("period_from", periodFrom);
        if (periodTo) params.append("period_to", periodTo);

        const res = await fetch(`/api/line-items?${params.toString()}`);
        if (res.ok) {
          const json = (await res.json()) as LineItemsResponse;
          setData(json);
          setPage(pageNum);
        } else {
          console.error("Error fetching line items:", res.status);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedTemplate, tableIndex, region, size, legalForm, naceCode, periodFrom, periodTo]
  );

  // Fetch data when filters change
  useEffect(() => {
    setPage(1);
    fetchData(1);
  }, [selectedTemplate, tableIndex, region, size, legalForm, naceCode, periodFrom, periodTo, fetchData]);

  // Export handler
  const handleExport = async () => {
    if (!data) return;

    let csv = "";
    const tableNames = ["Aktíva", "Pasíva", "VZaS"];

    // Header
    csv += `"${data.template.nazov}"\n`;
    csv += `"Tabuľka: ${data.table.name}"\n`;
    csv += `"Dátum exportu: ${new Date().toLocaleDateString("sk-SK")}"\n\n`;

    if (viewMode === "stats") {
      // Stats view CSV
      csv += '"Riadok","Označenie","Názov položky","Počet","Priemer","Medián","Min","Max","Suma","Smerodajná odchýlka"\n';
      data.stats.rowStats.forEach((stat) => {
        csv += `"${stat.row}","${stat.oznacenie || ""}","${stat.label}","${stat.count}","${formatNumber(stat.avg)}","${formatNumber(stat.median)}","${formatNumber(stat.min)}","${formatNumber(stat.max)}","${formatNumber(stat.sum)}","${formatNumber(stat.stddev)}"\n`;
      });
    } else {
      // Raw data view CSV
      csv += '"ICO","Názov jednotky","Obdobie od","Obdobie do","Mena"';
      if (data.data.length > 0 && data.data[0].rows.length > 0) {
        data.data[0].rows.forEach((row) => {
          csv += `,"${row.oznacenie} - ${row.label}"`;
        });
      }
      csv += "\n";

      data.data.forEach((record) => {
        csv += `"${record.ico || ""}","${record.nazovUJ || ""}","${record.obdobieOd || ""}","${record.obdobieDo || ""}","${record.mena}"`;
        record.rows.forEach((row) => {
          const val = row.value !== null ? row.value : "";
          csv += `,"${val}"`;
        });
        csv += "\n";
      });
    }

    // Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `export-${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-slate-800">
              Výskum riadkových položiek
            </h1>
            <p className="text-slate-600">
              Prehliadajte finančné dáta z ľubovoľnej šablóny a analyzujte riadkové položky
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Template Selector */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Šablóna
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(Number(e.target.value));
                  setTableIndex(0);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {(() => {
                  const grouped = getGroupedTemplates();
                  const knownIds = new Set(grouped.flatMap((g) => g.templates.map((t) => t.id)));
                  const apiTemplates = (codebooks?.sablony ?? []);
                  const unknownTemplates = apiTemplates.filter((t) => !knownIds.has(t.id));

                  return (
                    <>
                      {grouped.map((group) => (
                        <optgroup key={group.category} label={group.label}>
                          {group.templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.shortName} (ID: {t.id})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      {unknownTemplates.length > 0 && (
                        <optgroup label="Ostatné šablóny">
                          {unknownTemplates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nazov} (ID: {t.id})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  );
                })()}
              </select>
              {TEMPLATE_INFO[selectedTemplate] && (
                <p className="text-xs text-slate-500 mt-1">
                  {TEMPLATE_INFO[selectedTemplate].description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Table Selector Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
          {(TEMPLATE_INFO[selectedTemplate]?.tables ?? [
            { name: "Aktíva", tableIndex: 0 },
            { name: "Pasíva", tableIndex: 1 },
            { name: "VZaS", tableIndex: 2 },
          ]).map((tab) => (
            <button
              key={tab.tableIndex}
              onClick={() => setTableIndex(tab.tableIndex as TableIndex)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                tableIndex === tab.tableIndex
                  ? "border-teal-600 text-teal-600"
                  : "border-transparent text-slate-600 hover:text-slate-800"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-lg border border-slate-200 mb-6 overflow-hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-teal-600" />
              <span className="font-medium text-slate-800">Filtre</span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-600 transition-transform ${
                showFilters ? "rotate-180" : ""
              }`}
            />
          </button>

          {showFilters && (
            <div className="border-t border-slate-200 p-6 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Kraj
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Všetky --</option>
                    {(codebooks?.kraje ?? []).map((k) => (
                      <option key={k.kod} value={k.kod}>
                        {k.text}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Veľkosť
                  </label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Všetky --</option>
                    {(codebooks?.velkosti ?? []).map((v) => (
                      <option key={v.kod} value={v.kod}>
                        {v.text}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Právna forma
                  </label>
                  <select
                    value={legalForm}
                    onChange={(e) => setLegalForm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Všetky --</option>
                    {(codebooks?.pravneFormy ?? []).map((pf) => (
                      <option key={pf.kod} value={pf.kod}>
                        {pf.text}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    SK NACE
                  </label>
                  <select
                    value={naceCode}
                    onChange={(e) => setNaceCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Všetky --</option>
                    {(codebooks?.skNace ?? []).map((n) => (
                      <option key={n.kod} value={n.kod}>
                        {n.text}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Obdobie od (YYYY-MM)
                  </label>
                  <input
                    type="text"
                    value={periodFrom}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                    placeholder="2020-01"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Obdobie do (YYYY-MM)
                  </label>
                  <input
                    type="text"
                    value={periodTo}
                    onChange={(e) => setPeriodTo(e.target.value)}
                    placeholder="2024-12"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Toggle and Export */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setViewMode("stats")}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                viewMode === "stats"
                  ? "border-teal-600 text-teal-600"
                  : "border-transparent text-slate-600 hover:text-slate-800"
              }`}
            >
              Štatistiky
            </button>
            <button
              onClick={() => setViewMode("data")}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                viewMode === "data"
                  ? "border-teal-600 text-teal-600"
                  : "border-transparent text-slate-600 hover:text-slate-800"
              }`}
            >
              Údaje
            </button>
          </div>
          <button
            onClick={handleExport}
            disabled={!data}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-slate-300 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {loading && (
            <div className="p-12 text-center text-slate-600">
              Načítavanie...
            </div>
          )}

          {!loading && viewMode === "stats" && data && (
            <div>
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-semibold text-slate-800">
                  {data.table.name}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {data.stats.totalReports} výkazov spolu
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left font-medium text-slate-700">
                        Riadok
                      </th>
                      <th className="px-6 py-3 text-left font-medium text-slate-700">
                        Označenie
                      </th>
                      <th className="px-6 py-3 text-left font-medium text-slate-700">
                        Názov položky
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-slate-700">
                        Počet
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-slate-700">
                        Priemer
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-slate-700">
                        Medián
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-slate-700">
                        Min
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-slate-700">
                        Max
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-slate-700">
                        Suma
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-slate-700">
                        Smerodajná odchýlka
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stats.rowStats.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-8 text-center text-slate-600">
                          Žiadne dáta sa nezhodujú s vybranými filtrami.
                        </td>
                      </tr>
                    ) : (
                      data.stats.rowStats.map((stat, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-slate-200 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                          } hover:bg-teal-50 transition-colors`}
                        >
                          <td className="px-6 py-3 text-slate-900">{stat.row}</td>
                          <td className="px-6 py-3 text-slate-900">{stat.oznacenie || "—"}</td>
                          <td className="px-6 py-3 text-slate-900">{stat.label}</td>
                          <td className="px-6 py-3 text-right text-slate-900">
                            {stat.count}
                          </td>
                          <td className="px-6 py-3 text-right text-slate-900">
                            {formatNumber(stat.avg)} EUR
                          </td>
                          <td className="px-6 py-3 text-right text-slate-900">
                            {formatNumber(stat.median)} EUR
                          </td>
                          <td className="px-6 py-3 text-right text-slate-900">
                            {formatNumber(stat.min)} EUR
                          </td>
                          <td className="px-6 py-3 text-right text-slate-900">
                            {formatNumber(stat.max)} EUR
                          </td>
                          <td className="px-6 py-3 text-right text-slate-900 font-medium">
                            {formatNumber(stat.sum)} EUR
                          </td>
                          <td className="px-6 py-3 text-right text-slate-900">
                            {formatNumber(stat.stddev)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && viewMode === "data" && data && (
            <div>
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-semibold text-slate-800">
                  {data.table.name}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Strany {data.pagination.page} z {data.pagination.totalPages}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left font-medium text-slate-700">
                        IČO
                      </th>
                      <th className="px-6 py-3 text-left font-medium text-slate-700">
                        Názov jednotky
                      </th>
                      <th className="px-6 py-3 text-left font-medium text-slate-700">
                        Obdobie
                      </th>
                      <th className="px-6 py-3 text-left font-medium text-slate-700">
                        Mena
                      </th>
                      {data.data.length > 0 &&
                        data.data[0].rows.slice(0, 5).map((row) => (
                          <th key={row.row} className="px-6 py-3 text-right font-medium text-slate-700 text-xs">
                            {row.oznacenie || row.label}
                          </th>
                        ))}
                      {data.data.length > 0 && data.data[0].rows.length > 5 && (
                        <th className="px-6 py-3 text-right font-medium text-slate-700 text-xs">
                          ...+{data.data[0].rows.length - 5}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-600">
                          Žiadne dáta sa nezhodujú s vybranými filtrami.
                        </td>
                      </tr>
                    ) : (
                      data.data.map((record, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-slate-200 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                          } hover:bg-teal-50 transition-colors`}
                        >
                          <td className="px-6 py-3 text-slate-900 font-medium">{record.ico}</td>
                          <td className="px-6 py-3 text-slate-900">{record.nazovUJ}</td>
                          <td className="px-6 py-3 text-slate-900 text-xs">
                            {record.obdobieOd} — {record.obdobieDo}
                          </td>
                          <td className="px-6 py-3 text-slate-900">{record.mena}</td>
                          {record.rows.slice(0, 5).map((row) => (
                            <td key={row.row} className="px-6 py-3 text-right text-slate-900">
                              {formatNumber(row.value)}
                            </td>
                          ))}
                          {record.rows.length > 5 && (
                            <td className="px-6 py-3 text-right text-slate-600 text-xs">
                              ...
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                  <div className="text-sm text-slate-600">
                    Strana {data.pagination.page} z {data.pagination.totalPages}
                    ({data.pagination.total} záznamov celkom)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchData(Math.max(1, page - 1))}
                      disabled={!data.pagination.hasPrevPage}
                      className="px-3 py-1 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Predchádzajúci
                    </button>
                    <button
                      onClick={() => fetchData(Math.min(data.pagination.totalPages, page + 1))}
                      disabled={!data.pagination.hasNextPage}
                      className="px-3 py-1 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Ďalší
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !data && (
            <div className="p-12 text-center text-slate-600">
              Žiadne dáta k zobrazeniu. Vyberte šablónu a tabuľku.
            </div>
          )}
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
