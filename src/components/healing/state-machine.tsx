"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealStage } from "@/types";

export const PIPELINE: Array<{ key: HealStage | "healthy"; label: string }> = [
  { key: "healthy", label: "Healthy" },
  { key: "detected", label: "Failure Detected" },
  { key: "diagnosing", label: "Diagnosing" },
  { key: "generating_repair", label: "Repair Proposed" },
  { key: "awaiting_approval", label: "Approval" },
  { key: "repairing", label: "Repairing" },
  { key: "verifying", label: "Verifying" },
  { key: "recovered", label: "Recovered" },
];

const ORDER: string[] = PIPELINE.map((p) => p.key);

/**
 * Visual self-healing state machine.
 * `stage` is the current stage of the newest heal event (or null = all healthy).
 */
export function StateMachine({ stage }: { stage: HealStage | null }) {
  const currentIndex =
    stage === null
      ? 0
      : stage === "rejected"
        ? ORDER.indexOf("awaiting_approval")
        : stage === "failed"
          ? ORDER.indexOf("generating_repair")
          : Math.max(0, ORDER.indexOf(stage));

  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-[860px] items-start lg:min-w-0">
        {PIPELINE.map((step, i) => {
          const done = i < currentIndex || (stage === null && i === 0);
          const active = i === currentIndex && !(stage === null && i === 0);
          const failedHere = stage === "rejected" && step.key === "awaiting_approval";
          return (
            <li key={step.key} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {/* connector left */}
                <span
                  className={cn(
                    "h-px flex-1 transition-colors duration-500",
                    i === 0
                      ? "bg-transparent"
                      : done || active
                        ? "bg-emerald-500/60"
                        : "bg-white/[0.08]",
                  )}
                />
                <Node done={done} active={active} failed={failedHere} />
                {/* connector right */}
                <span
                  className={cn(
                    "h-px flex-1 transition-colors duration-500",
                    i === PIPELINE.length - 1
                      ? "bg-transparent"
                      : done
                        ? "bg-emerald-500/60"
                        : "bg-white/[0.08]",
                  )}
                />
              </div>
              <span
                className={cn(
                  "mt-2 whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.1em] transition-colors duration-300",
                  active
                    ? failedHere
                      ? "text-red-400"
                      : "text-cyan-300"
                    : done
                      ? "text-emerald-400"
                      : "text-zinc-600",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Node({
  done,
  active,
  failed,
}: {
  done: boolean;
  active: boolean;
  failed: boolean;
}) {
  return (
    <span
      className={cn(
        "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-500",
        failed
          ? "border-red-500/50 bg-red-500/15 text-red-400"
          : done
            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
            : active
              ? "border-cyan-400/70 bg-cyan-400/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)] animate-[pulse-diagnose_2s_infinite]"
              : "border-white/10 bg-[#0a0a0c] text-zinc-700",
      )}
    >
      {done ? (
        <Check className="h-3 w-3" />
      ) : (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            active
              ? failed
                ? "bg-red-400"
                : "bg-emerald-300"
              : "bg-current opacity-40",
          )}
        />
      )}
    </span>
  );
}
