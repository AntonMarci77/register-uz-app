"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Database } from "lucide-react";
import { SyncStatus as SyncStatusType } from "@/types";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

interface BackfillStats {
  is_running: boolean;
  progress: { processed: number; updated: number; total: number } | null;
  last_result: { processed: number; updated: number; failed: number; remaining: number; timestamp: string } | null;
  stats: {
    total_active_reports: number;
    with_content: number;
    without_content: number;
    with_tabulky: number;
    percent_complete: string;
  };
}

export default function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusType | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [backfill, setBackfill] = useState<BackfillStats | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const backfillIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/sync");
      if (!response.ok) throw new Error("Failed to fetch sync status");

      const text = await response.text();
      if (!text || text === "null") {
        setStatus(null);
        setError(null);
        return;
      }

      const data: SyncStatusType = JSON.parse(text);
      setStatus(data);
      setError(null);

      // Update syncing state based on server response
      if (data.status === "syncing") {
        setSyncing(true);
      } else {
        setSyncing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sync status");
    } finally {
      setLoading(false);
    }
  };

  // Set up polling — faster when syncing, slower when idle
  useEffect(() => {
    fetchStatus();

    const startPolling = (intervalMs: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchStatus, intervalMs);
    };

    // Poll every 5s while syncing, every 60s when idle
    startPolling(syncing ? 5000 : 60000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [syncing]);

  const fetchBackfillStatus = async () => {
    try {
      const response = await fetch("/api/sync/backfill");
      if (!response.ok) return;
      const data: BackfillStats = await response.json();
      setBackfill(data);
      setBackfilling(data.is_running);
    } catch {
      // Silently fail — backfill status is optional
    }
  };

  // Poll backfill status when running
  useEffect(() => {
    fetchBackfillStatus();
    if (backfilling) {
      backfillIntervalRef.current = setInterval(fetchBackfillStatus, 3000);
    } else {
      if (backfillIntervalRef.current) clearInterval(backfillIntervalRef.current);
    }
    return () => {
      if (backfillIntervalRef.current) clearInterval(backfillIntervalRef.current);
    };
  }, [backfilling]);

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch("/api/sync", { method: "POST" });
      if (!response.ok) throw new Error("Sync failed to start");
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
      setSyncing(false);
    }
  };

  const handleBackfill = async () => {
    try {
      setBackfilling(true);
      const response = await fetch("/api/sync/backfill?batch=1000&concurrency=30", { method: "POST" });
      if (!response.ok) throw new Error("Backfill failed to start");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backfill failed");
      setBackfilling(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-600">Načítavanie stavu synchronizácie...</div>;
  }

  if (!status) {
    return (
      <div className="flex items-center gap-4 px-6 py-4 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <div className="text-sm text-slate-700">
          Žiadna synchronizácia nebola vykonaná. Databáza je prázdna.
        </div>
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="ml-auto px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Spúšťa sa..." : "Spustiť synchronizáciu"}
        </button>
      </div>
    );
  }

  const lastSyncDate = status.last_sync
    ? format(new Date(status.last_sync), "d. MMMM yyyy, HH:mm", { locale: sk })
    : "Prebieha...";

  return (
    <div className="flex items-center gap-4 px-6 py-4 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="flex items-center gap-3">
        {status.status === "syncing" ? (
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
        ) : status.status === "error" ? (
          <AlertCircle className="w-5 h-5 text-red-600" />
        ) : (
          <CheckCircle className="w-5 h-5 text-green-600" />
        )}

        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium text-slate-700">
            Stav:{" "}
            <span
              className={
                status.status === "syncing"
                  ? "text-blue-600"
                  : status.status === "error"
                    ? "text-red-600"
                    : "text-green-600"
              }
            >
              {status.status === "syncing"
                ? "Synchronizuje sa... (môže trvať niekoľko minút)"
                : status.status === "error"
                  ? "Chyba"
                  : "Synchronizované"}
            </span>
          </div>
          <div className="text-xs text-slate-600">
            Posledná synchronizácia: <strong>{lastSyncDate}</strong>
          </div>
          <div className="text-xs text-slate-600">
            Celkový počet záznamov:{" "}
            <strong>{(status.total_records ?? 0).toLocaleString("sk-SK")}</strong>
            {status.status === "syncing" && (
              <span className="text-blue-500 ml-2">(pribúdajú...)</span>
            )}
          </div>
          {status.error_message && (
            <div className="text-xs text-red-600 mt-1">
              Chyba: {status.error_message}
            </div>
          )}
        </div>
      </div>

      {status.status !== "syncing" && (
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="ml-auto px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {syncing ? "Spúšťa sa..." : "Synchronizovať"}
        </button>
      )}

      {/* Backfill section */}
      {backfill && backfill.stats.without_content > 0 && (
        <div className="w-full mt-3 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <Database className="w-4 h-4 text-orange-500" />
            <div className="flex-1">
              <div className="text-xs text-slate-600">
                Obsah výkazov: <strong>{backfill.stats.with_content.toLocaleString("sk-SK")}</strong> z{" "}
                <strong>{backfill.stats.total_active_reports.toLocaleString("sk-SK")}</strong>{" "}
                ({backfill.stats.percent_complete}%)
              </div>
              {/* Progress bar */}
              <div className="mt-1 w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, parseFloat(backfill.stats.percent_complete))}%` }}
                />
              </div>
              {backfilling && backfill.progress && (
                <div className="text-xs text-blue-500 mt-1">
                  Spracované: {backfill.progress.processed}/{backfill.progress.total},
                  aktualizované: {backfill.progress.updated}
                </div>
              )}
              {backfill.last_result && !backfilling && (
                <div className="text-xs text-slate-500 mt-1">
                  Posledný beh: {backfill.last_result.updated} aktualizovaných,
                  {" "}{backfill.last_result.remaining.toLocaleString("sk-SK")} zostáva
                </div>
              )}
            </div>
            <button
              onClick={handleBackfill}
              disabled={backfilling || syncing}
              className="px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1.5"
            >
              <Database className={`w-3.5 h-3.5 ${backfilling ? "animate-pulse" : ""}`} />
              {backfilling ? "Prebieha..." : "Doplniť obsah"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
