"use client";

import { useState, useEffect, useCallback } from "react";
import { FilterParams } from "@/types";

interface CodebookItem {
  kod: string;
  text: string;
  nadradenaLokacia?: string;
}

interface TemplateItem {
  id: number;
  nazov: string;
  nariadenieMF?: string;
}

interface CodebooksResponse {
  codebooks: {
    pravneFormy: CodebookItem[];
    skNace: CodebookItem[];
    druhyVlastnictva: CodebookItem[];
    velkosti: CodebookItem[];
    kraje: CodebookItem[];
    okresy: CodebookItem[];
    sidla: CodebookItem[];
    sablony: TemplateItem[];
  };
}

interface FilterPanelProps {
  onFilter: (params: FilterParams) => void;
}

const YEARS = Array.from({ length: 18 }, (_, i) => 2009 + i);

export default function FilterPanel({ onFilter }: FilterPanelProps) {
  const [codebooks, setCodebooks] = useState<CodebooksResponse["codebooks"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [legalForm, setLegalForm] = useState("");
  const [size, setSize] = useState("");
  const [naceCode, setNaceCode] = useState("");
  const [naceSearch, setNaceSearch] = useState("");
  const [statementType, setStatementType] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [periodFrom, setPeriodFrom] = useState("2009");
  const [periodTo, setPeriodTo] = useState("2026");
  const [consolidated, setConsolidated] = useState(false);

  useEffect(() => {
    const fetchCodebooks = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/cb");
        if (!response.ok) throw new Error("Failed to fetch codebooks");
        const data: CodebooksResponse = await response.json();
        setCodebooks(data.codebooks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load codebooks");
      } finally {
        setLoading(false);
      }
    };
    fetchCodebooks();
  }, []);

  const filteredDistricts = (codebooks?.okresy ?? []).filter(
    (d) => !region || d.nadradenaLokacia === region
  );

  const filteredNace = (codebooks?.skNace ?? []).filter(
    (n) =>
      naceSearch === "" ||
      n.kod.toLowerCase().includes(naceSearch.toLowerCase()) ||
      n.text.toLowerCase().includes(naceSearch.toLowerCase())
  ).slice(0, 20);

  const handleApply = useCallback(() => {
    const params: FilterParams = { page: 1 };
    if (search) params.search = search;
    if (region) params.region = region;
    if (district) params.district = district;
    if (legalForm) params.legal_form = legalForm;
    if (size) params.size = size;
    if (naceCode) params.nace_code = naceCode;
    if (statementType) params.statement_type = statementType;
    if (templateId) params.template_id = parseInt(templateId);
    if (periodFrom) params.period_from = parseInt(periodFrom);
    if (periodTo) params.period_to = parseInt(periodTo);
    if (consolidated) params.consolidated = consolidated;
    onFilter(params);
  }, [search, region, district, legalForm, size, naceCode, statementType, templateId, periodFrom, periodTo, consolidated, onFilter]);

  const handleReset = useCallback(() => {
    setSearch(""); setRegion(""); setDistrict(""); setLegalForm("");
    setSize(""); setNaceCode(""); setNaceSearch(""); setStatementType(""); setTemplateId("");
    setPeriodFrom("2009"); setPeriodTo("2026"); setConsolidated(false);
    onFilter({});
  }, [onFilter]);

  if (loading) {
    return (
      <div className="w-full bg-white border-b border-slate-200 px-6 py-8">
        <p className="text-slate-600">Načítavanie filtrov...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-white border-b border-slate-200 px-6 py-8">
        <p className="text-red-600">Chyba pri načítaní filtrov: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border-b border-slate-200 px-6 py-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-6">Filtre</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Search */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-2">Hľadať podľa názvu</label>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Názov jednotky..."
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
        </div>

        {/* Region */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-2">Kraj</label>
          <select value={region} onChange={(e) => { setRegion(e.target.value); setDistrict(""); }}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
            <option value="">-- Vybrať kraj --</option>
            {(codebooks?.kraje ?? []).map((r) => (
              <option key={r.kod} value={r.kod}>{r.text}</option>
            ))}
          </select>
        </div>

        {/* District */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-2">Okres</label>
          <select value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!region}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500">
            <option value="">-- Vybrať okres --</option>
            {filteredDistricts.map((d) => (
              <option key={d.kod} value={d.kod}>{d.text}</option>
            ))}
          </select>
        </div>

        {/* Legal Form */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-2">Právna forma</label>
          <select value={legalForm} onChange={(e) => setLegalForm(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
            <option value="">-- Vybrať formu --</option>
            {(codebooks?.pravneFormy ?? []).map((f) => (
              <option key={f.kod} value={f.kod}>{f.text}</option>
            ))}
          </select>
        </div>

        {/* Organization Size */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-2">Veľkosť organizácie</label>
          <select value={size} onChange={(e) => setSize(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
            <option value="">-- Vybrať veľkosť --</option>
            {(codebooks?.velkosti ?? []).map((s) => (
              <option key={s.kod} value={s.kod}>{s.text}</option>
            ))}
          </select>
        </div>

        {/* NACE Code */}
        <div className="flex flex-col relative">
          <label className="block text-sm font-medium text-slate-700 mb-2">SK NACE - Odvetvie</label>
          <input type="text" value={naceSearch} onChange={(e) => setNaceSearch(e.target.value)}
            placeholder="Hľadať kód alebo názov..."
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
          {naceSearch && filteredNace.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto w-full">
              {filteredNace.map((n) => (
                <button key={n.kod} onClick={() => { setNaceCode(n.kod); setNaceSearch(""); }}
                  className="w-full text-left px-3 py-2 hover:bg-teal-50 text-sm">
                  <span className="font-medium text-slate-700">{n.kod}</span>
                  <span className="text-slate-600 ml-2">{n.text}</span>
                </button>
              ))}
            </div>
          )}
          {naceCode && (
            <div className="mt-2 inline-flex items-center bg-teal-50 border border-teal-200 px-3 py-1 rounded-lg">
              <span className="text-sm text-teal-800">{naceCode}</span>
              <button onClick={() => { setNaceCode(""); setNaceSearch(""); }}
                className="ml-2 text-teal-600 hover:text-teal-800">x</button>
            </div>
          )}
        </div>

        {/* Statement Type */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-2">Typ závierky</label>
          <select value={statementType} onChange={(e) => setStatementType(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
            <option value="">-- Vybrať typ --</option>
            <option value="Riadna">Riadna</option>
            <option value="Mimoriadna">Mimoriadna</option>
            <option value="Priebežná">Priebežná</option>
          </select>
        </div>

        {/* Formulár výkazu (šablóna) */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-2">Formulár výkazu</label>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
            <option value="">-- Vybrať formulár --</option>
            {(codebooks?.sablony ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nazov}{s.nariadenieMF ? ` (${s.nariadenieMF})` : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Pre porovnateľnosť údajov vyberajte rovnaký formulár
          </p>
        </div>

        {/* Period From */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-2">Obdobie od (rok)</label>
          <select value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
            {YEARS.map((year) => (<option key={year} value={year}>{year}</option>))}
          </select>
        </div>

        {/* Period To */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-2">Obdobie do (rok)</label>
          <select value={periodTo} onChange={(e) => setPeriodTo(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
            {YEARS.map((year) => (<option key={year} value={year}>{year}</option>))}
          </select>
        </div>

        {/* Consolidated */}
        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={consolidated} onChange={(e) => setConsolidated(e.target.checked)}
              className="w-4 h-4 accent-teal-600 rounded" />
            <span className="text-sm font-medium text-slate-700">Iba konsolidované</span>
          </label>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mt-8">
        <button onClick={handleApply}
          className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium">
          Použiť filtre
        </button>
        <button onClick={handleReset}
          className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium">
          Resetovať
        </button>
      </div>
    </div>
  );
}
