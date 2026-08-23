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
    <div className="relative overflow-hidden border-[2px] border-[#8b5cf6]/40 bg-[#050505]/95 comic-panel comic-shadow">
      <div className="flex flex-col gap-5 p-6">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-[#8b5cf6]">
              Self-Healing Simulation
            </span>
            {demo.enabled ? <DemoBadge small /> : null}
          </div>
          <p className="text-[14px] leading-relaxed text-zinc-300 font-medium">
            {PHASE_TEXT[demo.phase]}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {demo.phase === "idle" || demo.phase === "recovered" || demo.phase === "rejected" ? (
            <>
              <Button
                variant="primary"
                loading={busy === "trigger-failure"}
                onClick={() => act("trigger-failure")}
                className="font-mono uppercase tracking-widest text-[11px] font-black"
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                Trigger Demo Failure
              </Button>
              {demo.enabled ? (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={busy === "disable"}
                  onClick={() => act("disable")}
                  className="font-mono uppercase tracking-widest text-[10px] font-bold text-zinc-400 hover:text-white"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Exit Demo
                </Button>
              ) : null}
            </>
          ) : null}

          {demo.phase === "awaiting_approval" ? (
            <>
              <Button variant="danger" loading={busy === "reject"} onClick={() => act("reject")} className="font-mono uppercase tracking-widest text-[11px] font-black bg-[#050505] border-[2px] border-[#e21d2f] text-[#e21d2f] hover:bg-[#e21d2f] hover:text-white">
                Reject
              </Button>
              <Button variant="primary" loading={busy === "approve"} onClick={() => act("approve")} className="font-mono uppercase tracking-widest text-[11px] font-black bg-[#22c55e] border-[2px] border-[#22c55e] text-[#050505] hover:bg-[#050505] hover:text-[#22c55e]">
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                Approve Repair
              </Button>
            </>
          ) : null}

          {["failure_injected", "diagnosing", "generating_repair", "repairing", "verifying"].includes(
            demo.phase,
          ) ? (
            <Link href="/healing" className="inline-flex">
              <Button variant="secondary" className="font-mono uppercase tracking-widest text-[11px] font-black border-[2px] border-[#f59e0b] bg-[#050505] text-[#f59e0b] hover:bg-[#f59e0b] hover:text-[#050505]">
                <TriangleAlert className="h-3.5 w-3.5 mr-1" />
                Watch live on Self-Heal
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
      {demo.phase !== "idle" ? (
        <div className="flex items-center gap-3 border-t-[2px] border-[#8b5cf6]/20 bg-[#050505] px-6 py-3">
          <span className="font-mono text-[10px] font-black tracking-[0.2em] uppercase text-[#8b5cf6]/70">Current stage</span>
          <StageBadge stage={demo.phase as never} />
        </div>
      ) : null}
    </div>
  );
}
