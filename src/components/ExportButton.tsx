"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { FilterParams } from "@/types";
import { saveAs } from "file-saver";

interface ExportButtonProps {
  filters?: FilterParams;
  dataType?: "entities" | "statements";
}

export default function ExportButton({
  filters = {},
  dataType = "statements",
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("format", format);
      params.append("type", dataType);

      // Add filter params
      if (filters.search) params.append("search", filters.search);
      if (filters.region) params.append("region", filters.region);
      if (filters.district) params.append("district", filters.district);
      if (filters.legal_form) params.append("legal_form", filters.legal_form);
      if (filters.size) params.append("size", filters.size);
      if (filters.nace_code) params.append("nace_code", filters.nace_code);
      if (filters.statement_type)
        params.append("statement_type", filters.statement_type);
      if (filters.period_from)
        params.append("period_from", String(filters.period_from));
      if (filters.period_to)
        params.append("period_to", String(filters.period_to));
      if (filters.consolidated) params.append("consolidated", "true");

      const response = await fetch(`/api/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `register-uz-${dataType}-${timestamp}.${
        format === "csv" ? "csv" : "xlsx"
      }`;

      saveAs(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
      console.error("Export error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          onClick={() => handleExport("csv")}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          Exportovať ako CSV
        </button>
        <button
          onClick={() => handleExport("xlsx")}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          Exportovať ako XLSX
        </button>
      </div>
      {error && <p className="text-sm text-red-600">Chyba: {error}</p>}
      {loading && <p className="text-sm text-slate-600">Exportovanie...</p>}
    </div>
  );
}
