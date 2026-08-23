import { cn } from "@/lib/utils";
import type {
  ActivityLevel,
  HealStage,
  SourceStatus,
} from "@/types";

export function StatusDot({
  status,
  pulse = true,
  className,
}: {
  status: SourceStatus | "pending" | "creating";
  pulse?: boolean;
  className?: string;
}) {
  const color =
    status === "healthy" || status === "healed"
      ? "bg-emerald-500 text-emerald-500"
      : status === "warning"
        ? "bg-amber-500 text-amber-500"
        : status === "failing" || status === "error"
          ? "bg-red-500 text-red-500"
          : "bg-zinc-500 text-zinc-500";
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        color,
        pulse && (status === "healthy" || status === "healed") && "animate-pulse-dot",
        className,
      )}
    />
  );
}

const sourceStatusStyles: Record<SourceStatus, string> = {
  healthy: "text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.08]",
  healed: "text-emerald-300 border-emerald-400/25 bg-emerald-400/[0.1]",
  warning: "text-amber-400 border-amber-500/20 bg-amber-500/[0.08]",
  failing: "text-red-400 border-red-500/20 bg-red-500/[0.08]",
  error: "text-red-400 border-red-500/20 bg-red-500/[0.08]",
  pending: "text-zinc-400 border-white/10 bg-white/[0.04]",
};

export function SourceBadge({ status }: { status: SourceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        sourceStatusStyles[status],
      )}
    >
      <StatusDot status={status} />
      {status}
    </span>
  );
}

export const STAGE_LABELS: Record<HealStage, string> = {
  detected: "Failure detected",
  diagnosing: "Diagnosing",
  generating_repair: "Generating repair",
  awaiting_approval: "Awaiting approval",
  repairing: "Repairing",
  verifying: "Verifying recovery",
  recovered: "Recovered",
  rejected: "Rejected",
  failed: "Failed",
};

export const ACTIVE_STAGES: HealStage[] = [
  "detected",
  "diagnosing",
  "generating_repair",
  "awaiting_approval",
  "repairing",
  "verifying",
];

export function StageBadge({ stage }: { stage: HealStage }) {
  const style = ACTIVE_STAGES.includes(stage)
    ? stage === "awaiting_approval"
      ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
      : "text-sky-300 border-sky-500/25 bg-sky-500/10 animate-pulse-dot"
    : stage === "recovered"
      ? "text-emerald-300 border-emerald-500/25 bg-emerald-500/10"
      : "text-zinc-400 border-white/10 bg-white/[0.04]";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]",
        style,
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}

export function LevelDot({ level }: { level: ActivityLevel }) {
  const color =
    level === "success"
      ? "bg-emerald-500"
      : level === "error"
        ? "bg-red-500"
        : level === "warn"
          ? "bg-amber-500"
          : "bg-sky-400";
  return <span className={cn("mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full", color)} />;
}

export function DemoBadge({ small }: { small?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-violet-400/40 bg-violet-500/15 font-mono font-semibold uppercase tracking-[0.14em] text-violet-300",
        small ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]",
      )}
    >
      DEMO MODE
    </span>
  );
}

export function SimulatedTag() {
  return (
    <span className="inline-flex items-center rounded border border-violet-400/30 bg-violet-500/10 px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-wider text-violet-300">
      Demo
    </span>
  );
}
