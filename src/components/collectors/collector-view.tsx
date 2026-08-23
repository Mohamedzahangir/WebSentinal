"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Play,
  Radar,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { apiGet, apiPost, usePolling } from "@/lib/client";
import {
  formatNumber,
  hostnameOf,
  timeAgo,
} from "@/lib/utils";
import { displayRecord } from "@/lib/records";
import type { Collector, ProductRecord, Run, Source } from "@/types";

type Payload = {
  collector: Collector;
  source: Source | null;
  runs: Array<Omit<Run, "records">>;
  selfHeals: number;
  openIncidents: number;
  recordCount: number;
  lastRecords: ProductRecord[];
};

export function CollectorView() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { data, refresh } = usePolling<Payload | null>(
    () => apiGet<Payload>(`/api/collectors/${id}`).catch(() => null),
    4000,
    Boolean(id),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!data?.collector) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <CardBody className="py-20 text-center text-sm text-zinc-500">
            Collector not found.
          </CardBody>
        </Card>
      </div>
    );
  }

  const c = data.collector;
  const source = data.source;

  const run = async () => {
    setBusy("run");
    setError(null);
    setNotice("Running Bright Data Collector... this can take up to a few minutes.");
    try {
      await apiPost("/api/collectors/run", { collectorRowId: c.id });
      setNotice("Run started. Data and health update automatically when it completes.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setNotice(null);
    } finally {
      setBusy(null);
      refresh();
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 md:pt-2 md:pt-0">
      <Link
        href="/sources"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <ArrowLeft className="h-3 w-3" /> Sources
      </Link>

      {/* Collector identity card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                <Radar className="h-4 w-4 text-emerald-400" />
              </span>
              <h1 className="font-mono text-lg font-bold tracking-tight text-zinc-50">
                {c.collectorId ?? "pending…"}
              </h1>
              <StatusChip status={c.status} />
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-600">
                {c.name}
              </span>
            </div>

            {source ? (
              <div className="space-y-1">
                <p className="label-micro">Target</p>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-zinc-300 transition-colors hover:text-emerald-400"
                >
                  {hostnameOf(source.url)}
                </a>
              </div>
            ) : null}

            <div>
              <p className="label-micro">Fields</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {c.fields.map((f) => (
                  <span
                    key={f}
                    className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] capitalize text-zinc-400"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-x-10 gap-y-4 lg:w-[280px] lg:shrink-0">
            <Stat label="Last Run" value={timeAgo(c.lastRunAt)} icon={<Clock className="h-3 w-3" />} />
            <Stat label="Records" value={formatNumber(data.recordCount)} />
            <Stat label="Self-Heals" value={formatNumber(data.selfHeals)} />
            <Stat
              label="Open Incidents"
              value={formatNumber(data.openIncidents)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 border-t border-white/[0.06] bg-black/20 px-6 py-4">
          <Button variant="primary" loading={busy === "run"} onClick={run} disabled={!c.collectorId}>
            <Play className="h-3.5 w-3.5" /> Run Now
          </Button>
          {c.status === "creating" ? (
            <p className="text-xs text-sky-300">
              Bright Data AI is building this collector (typically 5–10 minutes).
            </p>
          ) : null}
          {notice ? <p className="text-xs text-zinc-500">{notice}</p> : null}
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </div>
      </Card>

      {/* Latest records */}
      {data.lastRecords.length ? (
        <Card>
          <CardHeader
            title="Latest extraction"
            action={
              <Link href={`/data?source=${source?.id ?? ""}`} className="text-xs text-zinc-400 hover:text-zinc-200">
                Open explorer →
              </Link>
            }
          />
          <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.lastRecords.slice(0, 6).map((r, i) => {
              const dr = displayRecord(r);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-black/20 px-3.5 py-2.5"
                >
                  <span className="truncate pr-3 text-[13px] text-zinc-200">{dr.product}</span>
                  <span className="shrink-0 font-mono text-xs text-emerald-400">{dr.price}</span>
                </div>
              );
            })}
          </CardBody>
        </Card>
      ) : null}

      {/* Run history */}
      <Card>
        <CardHeader title="Run history" />
        <CardBody className="space-y-2 p-4">
          {data.runs.length === 0 ? (
            <p className="px-1 py-4 text-sm text-zinc-600">No runs yet.</p>
          ) : null}
          {data.runs.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-white/[0.05] bg-black/20 px-4 py-3"
            >
              <RunIcon status={r.status} />
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-300">
                {r.status}
              </span>
              <span className="ml-auto font-mono text-xs tabular-nums text-zinc-400">
                {formatNumber(r.recordCount)} records
              </span>
              <span className="font-mono text-xs tabular-nums text-zinc-500">
                health {Math.round(r.healthScore)}%
              </span>
              <span className="w-16 text-right text-[11px] text-zinc-600">{timeAgo(r.startedAt)}</span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function StatusChip({ status }: { status: Collector["status"] }) {
  const map = {
    ready: { label: "HEALTHY", cls: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" },
    creating: { label: "CREATING", cls: "border-sky-500/25 bg-sky-500/10 text-sky-300" },
    failed: { label: "FAILED", cls: "border-red-500/25 bg-red-500/10 text-red-400" },
    healing: { label: "HEALING", cls: "border-amber-500/25 bg-amber-500/10 text-amber-400" },
    error: { label: "ERROR", cls: "border-red-500/25 bg-red-500/10 text-red-400" },
  } as const;
  const s = map[status as keyof typeof map] ?? map.ready;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider ${s.cls}`}>
      ● {s.label}
    </span>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="label-micro flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-mono text-sm tabular-nums text-zinc-100">{value}</p>
    </div>
  );
}

function RunIcon({ status }: { status: Run["status"] }) {
  if (status === "success")
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
  if (status === "running")
    return <Clock className="h-4 w-4 shrink-0 animate-pulse text-sky-400" />;
  if (status === "empty")
    return <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />;
  return <XCircle className="h-4 w-4 shrink-0 text-red-500" />;
}
