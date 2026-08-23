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
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        <CardBody className="py-7">
          <StateMachine stage={currentStage} />
        </CardBody>
      </Card>

      {/* Events */}
      <Card>
        <CardHeader title="Heal events" />
        <CardBody className="space-y-3 p-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <FlaskConical className="h-8 w-8 text-zinc-700" />
              <p className="max-w-sm text-sm leading-relaxed text-zinc-600">
                No heal events yet. Trigger the labeled simulation above to see the full
                self-healing flow — or run a real collector and WebSentinel will detect real failures.
              </p>
            </div>
          ) : null}
          {events.map((event) => (
            <Link key={event.id} href={`/healing/${event.id}`} className="block">
              <div className="group flex flex-col gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-4 py-4 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-zinc-100">
                      {event.sourceName}
                    </span>
                    {event.simulated ? <SimulatedTag /> : null}
                    <StageBadge stage={event.stage} />
                  </div>
                  <p className="line-clamp-1 text-xs text-zinc-500">{event.failureType}</p>
                </div>
                <div className="flex shrink-0 items-center gap-5 font-mono text-xs tabular-nums text-zinc-500">
                  <span>
                    {formatCompactCount(event.beforeCount)} →{" "}
                    <span
                      className={
                        event.afterCount != null ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      {formatCompactCount(event.afterCount ?? 0)}
                    </span>{" "}
                    records
                  </span>
                  <span>{timeAgo(event.detectedAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </CardBody>
      </Card>

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
