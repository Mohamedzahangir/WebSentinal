"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  CheckCircle2,
  FileSearch,
  Radar,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { SimulatedTag, StageBadge } from "@/components/ui/status";
import { apiGet, apiPost, usePolling } from "@/lib/client";
import { formatNumber, timeAgo } from "@/lib/utils";
import type { Collector, HealEvent, Source } from "@/types";

type Payload = { event: HealEvent; source: Source | null; collector: Collector | null };

export function HealDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { data, refresh } = usePolling<Payload | null>(
    () =>
      id
        ? apiGet<Payload>(`/api/healing/${id}`).catch(() => null)
        : Promise.resolve(null),
    2000,
    Boolean(id),
  );

  if (!data?.event) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardBody className="py-20 text-center text-sm text-zinc-500">
            Heal event not found.
          </CardBody>
        </Card>
      </div>
    );
  }

  const e = data.event;
  const awaiting = e.stage === "awaiting_approval";

  const decide = async (approve: boolean) => {
    await apiPost("/api/healing/approve", { eventId: e.id, approve });
    refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 md:pt-2 md:pt-0">
      <Link
        href="/healing"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <ArrowLeft className="h-3 w-3" /> Self-Heal
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <p className="label-micro">Self-Heal Event</p>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
            {e.sourceName}
          </h1>
          <StageBadge stage={e.stage} />
          {e.simulated ? <SimulatedTag /> : null}
        </div>
        <p className="text-[13px] text-zinc-500">
          Extraction failure detected · {e.failureType.replace(/_/g, " ")} ·{" "}
          {timeAgo(e.detectedAt)}
        </p>
      </div>

      {/* Flow */}
      <div className="relative space-y-1">
        <FlowNode icon={<DatabaseIcon />}>
          <FlowRow label="BEFORE">
            <MetricGrid
              records={formatNumber(e.beforeCount)}
              recordsCls="text-zinc-100"
              health={`${Math.round(e.beforeHealth)}%`}
              healthCls="text-emerald-400"
            />
          </FlowRow>
        </FlowNode>

        <Connector />

        <FlowNode icon={<AlertTriangle className="h-4 w-4" />} accent="danger">
          <FlowRow label="FAILURE" right={<span className="text-xs text-red-400">{e.failureType.replace(/_/g, " ")}</span>}>
            <MetricGrid
              records={formatNumber(0)}
              recordsCls="text-red-400"
              health="0%"
              healthCls="text-red-400"
            />
            {e.affectedFields.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/[0.05] pt-3">
                {e.affectedFields.map((f) => (
                  <span key={f} className="rounded-full border border-red-500/20 bg-red-500/[0.07] px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-300">
                    ✗ {f}
                  </span>
                ))}
              </div>
            ) : null}
          </FlowRow>
        </FlowNode>

        <Connector />

        <FlowNode icon={<Stethoscope className="h-4 w-4" />} accent="info">
          <FlowRow
            label="DIAGNOSIS"
            right={
              e.confidence != null ? <ConfidenceMeter value={e.confidence} /> : undefined
            }
          >
            <p className="text-[13px] leading-relaxed text-zinc-300">{e.diagnosis ?? "Analyzing extraction telemetry…"}</p>
            {e.recommendedAction ? (
              <p className="mt-2.5 rounded-lg bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-zinc-400">
                <span className="font-semibold text-zinc-300">Recommended: </span>
                {e.recommendedAction}
              </p>
            ) : null}
          </FlowRow>
        </FlowNode>

        <Connector />

        <FlowNode icon={<Wrench className="h-4 w-4" />} accent="warn">
          <FlowRow
            label="REPAIR"
            right={
              e.collectorId ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                  <Radar className="h-3 w-3 text-emerald-500" />
                  {e.collectorId}
                </span>
              ) : e.simulated ? (
                <span className="font-mono text-[10px] uppercase tracking-wider text-violet-300">
                  Simulated repair · Demo Mode
                </span>
              ) : null
            }
          >
            <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-400">
              {e.repairPreview ??
                (awaitingLabel(e.stage))}
            </pre>
          </FlowRow>
        </FlowNode>

        <Connector />

        <FlowNode
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent={e.afterCount != null ? "success" : "muted"}
        >
          <FlowRow
            label="AFTER"
            right={
              e.verified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-300">
                  ✓ VERIFIED
                </span>
              ) : null
            }
          >
            {e.afterCount != null ? (
              <MetricGrid
                records={formatNumber(e.afterCount)}
                recordsCls="text-emerald-400"
                health={`${Math.round(e.afterHealth ?? 0)}%`}
                healthCls="text-emerald-400"
              />
            ) : (
              <p className="text-sm text-zinc-600">
                Pending recovery verification…
              </p>
            )}
          </FlowRow>
        </FlowNode>
      </div>

      {/* Actions */}
      <Card className="sticky bottom-4 z-20 border-white/10 bg-zinc-950/95 shadow-xl shadow-black/40 backdrop-blur">
        <CardBody className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {awaiting ? (
              <>
                <p className="text-[13px] font-medium text-zinc-100">
                  Bright Data repair proposal ready
                </p>
                <p className="text-xs text-zinc-500">
                  Approve to apply the fix to the Collector and verify recovery with a fresh run.
                </p>
              </>
            ) : (
              <StageStatusLine stage={e.stage} />
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {awaiting ? (
              <>
                <Button variant="danger" onClick={() => decide(false)}>
                  Reject
                </Button>
                <Button variant="primary" onClick={() => decide(true)}>
                  Approve Repair
                </Button>
              </>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function awaitingLabel(stage: HealEvent["stage"]): string {
  if (stage === "generating_repair")
    return "Bright Data AI is generating a repair proposal…";
  if (stage === "repairing") return "Applying repair to collector template…";
  if (stage === "verifying") return "Verifying recovery with a fresh extraction run…";
  return "Waiting for repair proposal…";
}

function StageStatusLine({ stage }: { stage: HealEvent["stage"] }) {
  const map: Partial<Record<HealEvent["stage"], string>> = {
    detected: "Failure detected. Generating diagnosis…",
    diagnosing: "Analyzing extraction telemetry…",
    generating_repair: "Generating repair via Bright Data AI…",
    repairing: "Applying repair…",
    verifying: "Verifying recovery…",
    recovered: "Pipeline recovered and verified.",
    rejected: "Repair rejected. Source remains degraded.",
    failed: "Healing failed — inspect repair output and retry.",
  };
  return <p className="text-[13px] text-zinc-400">{map[stage] ?? ""}</p>;
}

/* ---------------- building blocks ---------------- */

const ACCENTS: Record<string, string> = {
  danger: "border-red-500/25 shadow-[inset_2px_0_0_0_rgba(239,68,68,0.6)]",
  info: "border-sky-500/20 shadow-[inset_2px_0_0_0_rgba(56,189,248,0.55)]",
  warn: "border-amber-500/20 shadow-[inset_2px_0_0_0_rgba(245,158,11,0.55)]",
  success: "border-emerald-500/30 shadow-[inset_2px_0_0_0_rgba(16,185,129,0.65)]",
  muted: "",
};

function FlowNode({
  icon,
  accent,
  children,
}: {
  icon: React.ReactNode;
  accent?: keyof typeof ACCENTS;
  children: React.ReactNode;
}) {
  return (
    <Card className={`animate-fade-up ${accent ? ACCENTS[accent] : ""}`}>
      <CardBody className="flex gap-4 p-5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/30 text-zinc-400">
          {icon}
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </CardBody>
    </Card>
  );
}

function Connector() {
  return (
    <div className="flex justify-start pl-[35px]" aria-hidden>
      <ArrowDown className="-my-1 h-5 w-5 text-zinc-700" />
    </div>
  );
}

function FlowRow({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="label-micro !text-zinc-400">{label}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

function MetricGrid({
  records,
  recordsCls,
  health,
  healthCls,
}: {
  records: string;
  recordsCls: string;
  health: string;
  healthCls: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="label-micro">Records</p>
        <p className={`mt-0.5 font-mono text-xl font-bold tabular-nums ${recordsCls}`}>
          {records}
        </p>
      </div>
      <div>
        <p className="label-micro">Health</p>
        <p className={`mt-0.5 font-mono text-xl font-bold tabular-nums ${healthCls}`}>
          {health}
        </p>
      </div>
    </div>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-sky-400 transition-all duration-1000"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums text-sky-300">{value}%</span>
    </div>
  );
}

function DatabaseIcon() {
  return <FileSearch className="h-4 w-4" />;
}
