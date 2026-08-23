"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Database,
  GaugeCircle,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DemoBadge, LevelDot, SimulatedTag, SourceBadge } from "@/components/ui/status";
import { RecordsChart } from "@/components/dashboard/records-chart";
import { DemoPanel } from "@/components/dashboard/demo-panel";
import { SentinelNetwork } from "@/components/dashboard/sentinel-network";
import { apiGet, usePolling } from "@/lib/client";
import { cn, formatCompact, formatNumber, timeAgo } from "@/lib/utils";
import type { DashboardPayload } from "@/types";

export function DashboardView() {
  const { data, loading, refresh } = usePolling<DashboardPayload>(
    () => apiGet<DashboardPayload>("/api/dashboard"),
    4000,
  );

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>
        <div className="h-[240px] animate-pulse rounded-xl bg-white/[0.03]" />
      </div>
    );
  }
  if (!data) return null;

  const d = data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero strip */}
      <div className="flex flex-col gap-1 pt-2 md:pt-0">
        <h1 className="font-mono text-lg font-bold tracking-[0.22em] text-zinc-50">
          WEB<span className="text-emerald-400"> SENTINEL</span>
        </h1>
        <p className="text-[13px] text-zinc-500">
          Web intelligence that never goes blind.
          {d.demo.enabled ? (
            <span className="ml-2 align-middle">
              <DemoBadge small />
            </span>
          ) : null}
        </p>
      </div>

      <DemoPanel demo={d.demo} onChange={refresh} />

      {/* Sentinel Network Hero */}
      <SentinelNetwork data={d} demo={d.demo} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Chart */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Extraction volume · last 12h"
            action={
              <span className="flex items-center gap-4 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-4 rounded-full bg-emerald-500/80" /> records
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-4 rounded-full bg-red-500/70" /> incidents
                </span>
              </span>
            }
          />
          <CardBody className="pt-2">
            <RecordsChart data={d.chart} />
          </CardBody>
        </Card>

        {/* Activity */}
        <Card className="min-h-[280px]">
          <CardHeader title="Recent activity" />
          <CardBody className="space-y-4 px-5 py-4">
            {d.activities.length === 0 ? (
              <p className="text-[13px] text-zinc-600">Nothing yet — run a source to see activity.</p>
            ) : null}
            {d.activities.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <LevelDot level={a.level} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium leading-snug text-zinc-200">
                    {a.title}
                    {a.simulated ? <SimulatedTag /> : null}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                    {a.message}
                  </p>
                  <p className="mt-1 text-[10.5px] uppercase tracking-wider text-zinc-600">
                    {a.sourceName ? `${a.sourceName} · ` : ""}
                    {timeAgo(a.at)}
                  </p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Live Intelligence Stream */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3 border-b border-white/[0.04] pb-2">
           <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase flex items-center gap-2">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
             </span>
             Live Intelligence
           </h2>
           <Link href="/sources" className="text-[11px] text-zinc-500 hover:text-cyan-400 transition-colors uppercase tracking-wider">
             Manage Sources →
           </Link>
        </div>
        
        <div className="flex flex-col">
          {d.sources.map((s) => {
            const isFailing = s.status === "error" || s.status === "failing";
            const isWarning = s.status === "warning";
            return (
              <div
                key={s.id}
                className="group flex items-center justify-between py-2.5 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.01] transition-colors"
              >
                <div className="flex items-center gap-4 min-w-[200px]">
                  <span className={cn(
                    "flex h-4 w-4 items-center justify-center text-[10px]",
                    isFailing ? "text-red-500" : isWarning ? "text-amber-500" : "text-emerald-500"
                  )}>
                    {isFailing ? "✕" : isWarning ? "⚠" : "●"}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-200 truncate max-w-[220px]">
                    {s.name}
                    {s.sample ? <span className="ml-2 text-[9px] text-cyan-500/50">DEMO</span> : null}
                  </span>
                </div>
                
                <div className="flex items-center gap-8 text-right min-w-[300px] justify-end">
                  <span className={cn(
                    "font-mono text-[11px] uppercase tracking-widest font-semibold w-24 text-left",
                    isFailing ? "text-red-400" : isWarning ? "text-amber-400" : "text-emerald-400"
                  )}>
                    {s.status}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-zinc-400 w-32">
                    <span className="text-white">{formatNumber(s.recordCount)}</span> records
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


