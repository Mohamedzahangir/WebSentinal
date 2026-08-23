"use client";

import { useState } from "react";
import Link from "next/link";
import { FlaskConical, Play, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBadge, StageBadge } from "@/components/ui/status";
import { apiPost } from "@/lib/client";
import type { DemoState } from "@/types";

const PHASE_TEXT: Record<DemoState["phase"], string> = {
  idle: "Ready. Trigger a simulated website change to walk through the full self-healing flow.",
  failure_injected: "Simulated DOM change injected — extraction failed. Detecting...",
  diagnosing: "Analyzing extraction telemetry...",
  generating_repair: "Bright Data is preparing a repair plan (simulated)...",
  awaiting_approval: "Repair proposed. Approve to apply the fix and verify recovery.",
  repairing: "Applying repair to the Collector (simulated)...",
  verifying: "Verifying recovered extraction...",
  recovered: "Pipeline recovered and verified. Data flow restored.",
  rejected: "Repair rejected. Source remains degraded.",
};

export function DemoPanel({
  demo,
  onChange,
}: {
  demo: DemoState;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (action: string) => {
    setBusy(action);
    try {
      await apiPost("/api/demo", { action });
      onChange();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-violet-500/25 bg-violet-500/[0.04]">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-3.5 w-3.5 text-violet-400" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300">
              Self-Healing Simulation
            </span>
            {demo.enabled ? <DemoBadge small /> : null}
          </div>
          <p className="text-[13px] leading-relaxed text-zinc-400">
            {PHASE_TEXT[demo.phase]}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {demo.phase === "idle" || demo.phase === "recovered" || demo.phase === "rejected" ? (
            <>
              <Button
                variant="primary"
                loading={busy === "trigger-failure"}
                onClick={() => act("trigger-failure")}
              >
                <Play className="h-3.5 w-3.5" />
                Trigger Demo Failure
              </Button>
              {demo.enabled ? (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={busy === "disable"}
                  onClick={() => act("disable")}
                >
                  <RotateCcw className="h-3 w-3" />
                  Exit Demo
                </Button>
              ) : null}
            </>
          ) : null}

          {demo.phase === "awaiting_approval" ? (
            <>
              <Button variant="danger" loading={busy === "reject"} onClick={() => act("reject")}>
                Reject
              </Button>
              <Button variant="primary" loading={busy === "approve"} onClick={() => act("approve")}>
                <ShieldCheck className="h-3.5 w-3.5" />
                Approve Repair
              </Button>
            </>
          ) : null}

          {["failure_injected", "diagnosing", "generating_repair", "repairing", "verifying"].includes(
            demo.phase,
          ) ? (
            <Link href="/healing" className="inline-flex">
              <Button variant="secondary">
                <TriangleAlert className="h-3.5 w-3.5 text-amber-400" />
                Watch live on Self-Heal
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
      {demo.phase !== "idle" ? (
        <div className="flex items-center gap-3 border-t border-violet-500/15 bg-black/20 px-5 py-2.5">
          <span className="label-micro !text-violet-300/70">Current stage</span>
          <StageBadge stage={demo.phase as never} />
        </div>
      ) : null}
    </div>
  );
}
