"use client";

import Link from "next/link";
import { FlaskConical, Play, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SimulatedTag, StageBadge } from "@/components/ui/status";
import { StateMachine } from "@/components/healing/state-machine";
import { apiGet, apiPost, usePolling } from "@/lib/client";
import { timeAgo } from "@/lib/utils";
import type { DemoState, HealEvent, HealStage } from "@/types";

type Payload = { events: HealEvent[]; demo: DemoState };

export function HealingView() {
  const { data, refresh } = usePolling<Payload>(
    () =>
      Promise.all([
        apiGet<{ events: HealEvent[] }>("/api/healing"),
        apiGet<{ demo: DemoState }>("/api/demo"),
      ]).then(([healing, demo]) => ({ ...healing, demo: demo.demo })),
    2500,
  );

  const events = data?.events ?? [];
  const live = events.find(
    (e) => !["recovered", "rejected", "failed"].includes(e.stage),
  );
  const currentStage: HealStage | null = live
    ? live.stage
    : data?.demo.phase === "recovered" && events[0]
      ? "recovered"
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 md:pt-2 md:pt-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">Self-Heal</h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            Autonomous failure recovery: detect → diagnose → heal → approve → verify.
          </p>
        </div>
        <Button
          variant="primary"
          loading={false}
          onClick={async () => {
            await apiPost("/api/demo", { action: "trigger-failure" }).catch(() => {});
            refresh();
          }}
        >
          <Play className="h-3.5 w-3.5" /> Simulate Failure (Demo)
        </Button>
      </div>

      {/* Live state machine */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.04] bg-[#0a0a0c] shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] px-2 py-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <StateMachine stage={currentStage} />
      </div>

      {/* Events */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase mt-8 mb-4">Event History</h2>
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center rounded-xl border border-white/[0.04] bg-white/[0.01]">
              <FlaskConical className="h-8 w-8 text-zinc-700" />
              <p className="max-w-sm text-sm leading-relaxed text-zinc-600">
                No heal events yet. Trigger the labeled simulation above to see the full
                self-healing flow — or run a real collector and WebSentinel will detect real failures.
              </p>
            </div>
          ) : null}
          {events.map((event) => (
            <Link key={event.id} href={`/healing/${event.id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 rounded-xl">
              <div className="group flex flex-col gap-3 rounded-xl border border-white/[0.04] bg-[#0a0a0c] px-5 py-4 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/[0.03] hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">
                      {event.sourceName}
                    </span>
                    {event.simulated ? <SimulatedTag /> : null}
                    <StageBadge stage={event.stage} />
                  </div>
                  <p className="line-clamp-1 text-xs text-zinc-500">{event.failureType.replace(/_/g, " ")}</p>
                </div>
                <div className="flex shrink-0 items-center gap-6 font-mono text-[13px] tabular-nums text-zinc-500">
                  <span>
                    {formatCompactCount(event.beforeCount)} →{" "}
                    <span
                      className={
                        event.afterCount != null ? "text-emerald-400 font-bold" : "text-red-400"
                      }
                    >
                      {formatCompactCount(event.afterCount ?? 0)}
                    </span>{" "}
                    records
                  </span>
                  <span className="text-zinc-600 w-20 text-right">{timeAgo(event.detectedAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-zinc-600">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        Real healing runs through the Bright Data CLI (`scraper heal` / `scraper approve`).
        Simulated flows are always labeled Demo.
      </p>
    </div>
  );
}

function formatCompactCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}
