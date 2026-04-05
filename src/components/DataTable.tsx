"use client";

import { useState, useCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export interface Column<T> {
  key: keyof T;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

type SortDirection = "asc" | "desc" | null;

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  emptyMessage = "Žiadne dáta k zobrazeniu",
  onRowClick,
  pagination,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const handleSort = useCallback(
    (key: keyof T) => {
      if (sortKey === key) {
        if (sortDir === "asc") {
          setSortDir("desc");
        } else if (sortDir === "desc") {
          setSortKey(null);
          setSortDir(null);
        } else {
          setSortDir("asc");
        }
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey, sortDir]
  );

  const sortedData = useCallback(() => {
    if (!sortKey || !sortDir) return data;

    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return sorted;
  }, [data, sortKey, sortDir]);

  const displayData = sortedData();
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;

  return (
    <div className="w-full">
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-slate-600">
            Načítavanie...
          </div>
        ) : displayData.length === 0 ? (
          <div className="flex justify-center items-center h-64 text-slate-600">
            {emptyMessage}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={`px-6 py-4 text-left text-sm font-semibold text-slate-700 ${
                      column.width || ""
                    } ${column.sortable ? "cursor-pointer hover:bg-slate-100" : ""}`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable && sortKey === column.key && sortDir && (
                        <>
                          {sortDir === "asc" && (
                            <ChevronUp className="w-4 h-4 text-teal-600" />
                          )}
                          {sortDir === "desc" && (
                            <ChevronDown className="w-4 h-4 text-teal-600" />
                          )}
                        </>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayData.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-6 py-4 text-sm text-slate-700">
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4">
          <div className="text-sm text-slate-600">
            Stránka {pagination.page} z {totalPages} (Celkovo:{" "}
            {pagination.total} záznamov)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                pagination.onPageChange(Math.max(1, pagination.page - 1))
              }
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Predchádzajúca
            </button>
            <button
              onClick={() =>
                pagination.onPageChange(Math.min(totalPages, pagination.page + 1))
              }
              disabled={pagination.page >= totalPages}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Ďalšia →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
