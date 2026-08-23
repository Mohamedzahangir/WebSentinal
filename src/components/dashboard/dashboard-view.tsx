"use client";
import { useEffect, useState } from "react";
import { DemoPanel } from "@/components/dashboard/demo-panel";
import { SentinelNetwork } from "@/components/dashboard/sentinel-network";
import { apiGet, usePolling } from "@/lib/client";
import { cn, formatNumber } from "@/lib/utils";
import type { DashboardPayload } from "@/types";
import { X, AlertTriangle } from "lucide-react";

export function DashboardView() {
  const [pollInterval, setPollInterval] = useState(4000);
  const { data, loading, refresh } = usePolling<DashboardPayload>(
    () => apiGet<DashboardPayload>("/api/dashboard"),
    pollInterval,
  );

  useEffect(() => {
    if (data?.demo.enabled && !["idle", "recovered", "rejected"].includes(data.demo.phase)) {
      setPollInterval(1000);
    } else {
      setPollInterval(4000);
    }
  }, [data?.demo.phase, data?.demo.enabled]);

  if (loading && !data) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#050505]">
        <div className="font-mono text-xs text-[#e21d2f] animate-pulse uppercase tracking-widest">
          INITIALIZING SPIDER-SENSE...
        </div>
      </div>
    );
  }
  if (!data) return null;
  const d = data;

  return (
    <div className="absolute inset-0 bg-[#0A0A0A] overflow-hidden">
      {/* Sentinel Network Hero Canvas */}
      <SentinelNetwork data={d} demo={d.demo} />

      {/* Floating Demo Panel - Moved to Top Right to avoid telemetry overlap */}
      <div className="absolute top-6 right-6 z-50 w-full max-w-sm px-4 pointer-events-auto">
        <DemoPanel demo={d.demo} onChange={refresh} />
      </div>

      {/* Live Intelligence Feed - Floating Comic Rail */}
      {/* Live Intelligence Feed - Floating Comic Rail in lower-left */}
      <div className="absolute bottom-6 left-6 z-40 w-[240px] hidden xl:flex flex-col gap-2 pointer-events-none">
        <div className="border-l-[3px] border-[#e21d2f] bg-[#050505]/90 backdrop-blur comic-shadow p-3 pointer-events-auto">
          <h2 className="text-[10px] font-bold tracking-[0.2em] text-[#e21d2f] uppercase flex items-center gap-2 mb-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full bg-[#e21d2f] opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 bg-[#e21d2f]"></span>
            </span>
            Live Intelligence
          </h2>
          
          <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-2">
            {d.sources.map((s) => {
              const isFailing = s.status === "error" || s.status === "failing";
              const isWarning = s.status === "warning";
              return (
                <div key={s.id} className="flex flex-col gap-1 border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-300 truncate max-w-[180px]">
                      {isFailing ? <X className="inline w-3 h-3 text-[#e21d2f] mr-1" /> : isWarning ? <AlertTriangle className="inline w-3 h-3 text-[#f59e0b] mr-1" /> : <span className="inline-block w-1.5 h-1.5 bg-[#22c55e] mr-2" />}
                      {s.name}
                    </span>
                    <span className={cn(
                      "font-mono text-[9px] uppercase tracking-widest font-bold",
                      isFailing ? "text-[#e21d2f]" : isWarning ? "text-[#f59e0b]" : "text-[#22c55e]"
                    )}>
                      {s.status}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-zinc-500 pl-4">
                    {formatNumber(s.recordCount)} records
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


