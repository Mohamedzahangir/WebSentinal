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
import { apiGet, usePolling } from "@/lib/client";
import { formatCompact, formatNumber, hostnameOf, timeAgo } from "@/lib/utils";
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

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric
          icon={<Database className="h-3.5 w-3.5 text-emerald-500" />}
          label="Active Sources"
          value={formatNumber(d.metrics.activeSources)}
        />
        <Metric
          icon={<GaugeCircle className="h-3.5 w-3.5 text-emerald-500" />}
          label="Health"
          value={`${d.metrics.healthAverage}%`}
        />
        <Metric
          icon={<HeartPulse className="h-3.5 w-3.5 text-emerald-500" />}
          label="Records"
          value={formatCompact(d.metrics.totalRecords)}
        />
        <Metric
          icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
          label="Self-Heals"
          value={formatNumber(d.metrics.selfHeals)}
          sub={
            d.metrics.openIncidents > 0
              ? `${d.metrics.openIncidents} open incident${d.metrics.openIncidents > 1 ? "s" : ""}`
              : undefined
          }
        />
      </div>

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

      {/* Source health */}
      <Card>
        <CardHeader
          title="Source health"
          action={
            <Link
              href="/sources"
              className="flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            >
              Manage sources <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Source", "Status", "Records", "Health", "Last Run"].map((h) => (
                  <th key={h} className="label-micro px-5 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.sources.map((s) => (
                <tr
                  key={s.id}
                  className="group border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-zinc-100">{s.name}</span>
                      {s.sample ? <SimulatedTag /> : null}
                    </div>
                    <span className="text-xs text-zinc-600">{hostnameOf(s.url)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <SourceBadge status={s.status} />
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[13px] tabular-nums text-zinc-300">
                    {formatNumber(s.recordCount)}
                  </td>
                  <td className="px-5 py-3.5">
                    <HealthBar score={s.healthScore} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500">{timeAgo(s.lastRunAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="hover:border-white/[0.12]">
      <CardBody className="space-y-3 p-5 pb-4">
        <div className="flex items-center justify-between">
          <span className="label-micro">{label}</span>
          {icon}
        </div>
        <div className="font-mono text-[26px] font-bold leading-none tracking-tight text-zinc-50">
          {value}
        </div>
        {sub ? <p className="text-[11px] font-medium text-red-400">{sub}</p> : null}
      </CardBody>
    </Card>
  );
}

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 90 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.max(2, Math.min(100, score))}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums text-zinc-300">{score}%</span>
    </div>
  );
}
