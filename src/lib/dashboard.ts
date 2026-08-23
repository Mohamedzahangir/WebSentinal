import type { ChartPoint, DashboardPayload, SourceStatus } from "@/types";
import { getDataset, readDb } from "@/lib/store";
import { evaluateHealth } from "@/lib/health";
import { tickDemo } from "@/lib/demo/engine";
import { isSupabaseConfigured } from "@/lib/supabase/client";

function deterministicSeries(base: number): number[] {
  // Stable pseudo-history so the chart looks alive without fake randomness.
  const out: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const wave = Math.sin(i * 1.7) * 0.06 + Math.cos(i * 0.9) * 0.04;
    out.push(Math.max(1, Math.round(base * (1 + wave - i * 0.004))));
  }
  out.push(base);
  return out;
}

export async function buildDashboard(): Promise<DashboardPayload> {
  await tickDemo();
  const db = await readDb();

  const activeSources = db.sources.filter((s) =>
    ["healthy", "healed", "warning"].includes(s.status),
  ).length;

  const healthValues = db.sources
    .map((s) => s.healthScore)
    .filter((n) => Number.isFinite(n));
  const healthAverage = healthValues.length
    ? Math.round(
        healthValues.reduce((a, b) => a + b, 0) / healthValues.length,
      )
    : 0;

  const totalRecords = db.sources.reduce((a, s) => a + s.recordCount, 0);
  const selfHeals = db.sources.reduce((a, s) => a + s.selfHeals, 0);
  const openIncidents = db.healEvents.filter((e) =>
    !["recovered", "rejected", "failed"].includes(e.stage),
  ).length;

  const chart: ChartPoint[] = (() => {
    const primary = db.sources[0];
    if (!primary) return [];
    const series = deterministicSeries(primary.recordCount || 1000);
    const incidentsByBucket = new Map<number, number>();
    for (const run of db.runs) {
      if (run.status === "success" || run.simulated) continue;
      const hoursAgo = Math.floor(
        (Date.now() - new Date(run.startedAt).getTime()) / 3600_000,
      );
      if (hoursAgo >= 0 && hoursAgo < series.length) {
        incidentsByBucket.set(
          series.length - 1 - hoursAgo,
          (incidentsByBucket.get(series.length - 1 - hoursAgo) ?? 0) + 1,
        );
      }
    }
    return series.map((records, i) => ({
      label:
        i === series.length - 1
          ? "now"
          : `${series.length - 1 - i}h`,
      records,
      incidents: incidentsByBucket.get(i) ?? 0,
    }));
  })();

  return {
    metrics: {
      activeSources,
      healthAverage,
      totalRecords,
      selfHeals,
      openIncidents,
    },
    sources: db.sources.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      status: s.status,
      recordCount: s.recordCount,
      healthScore: s.healthScore,
      lastRunAt: s.lastRunAt,
      sample: s.sample,
    })),
    activities: db.activities.slice(0, 10),
    chart,
    demo: db.demo,
    integrations: {
      brightdata: true, // CLI auth verified at runtime; UI shows live state per operation
      supabase: isSupabaseConfigured(),
      llm: Boolean(process.env.OPENAI_API_KEY),
    },
  };
}

/** Recompute a source's aggregate health from its latest dataset. */
export async function recomputeSourceHealth(sourceId: string): Promise<number> {
  const db = await readDb();
  const source = db.sources.find((s) => s.id === sourceId);
  if (!source) return 0;
  const records = getDataset(db, sourceId);
  const evaluation = evaluateHealth(records, source.expectedFields, null);
  return evaluation.healthScore;
}

export function statusRank(status: SourceStatus): number {
  switch (status) {
    case "healthy":
      return 0;
    case "healed":
      return 1;
    case "warning":
      return 2;
    case "failing":
      return 3;
    case "error":
      return 4;
    default:
      return 5;
  }
}
