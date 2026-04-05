"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { SyncStatus as SyncStatusType } from "@/types";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export default function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusType | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
    </div>
  );
}
