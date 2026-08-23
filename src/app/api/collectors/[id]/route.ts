import { readDb, getDataset } from "@/lib/store";
import { ok, err } from "@/lib/api";
import { tickDemo } from "@/lib/demo/engine";

export const dynamic = "force-dynamic";

/** GET /api/collectors/[id] — id is our internal collector row id. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await tickDemo();
    const { id } = await params;
    const db = await readDb();
    const collector = db.collectors.find((c) => c.id === id || c.collectorId === id);
    if (!collector) return err("Collector not found", 404);

    const source = db.sources.find((s) => s.id === collector.sourceId) ?? null;
    const runs = db.runs
      .filter((r) => r.collectorRowId === collector.id)
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        status: r.status,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        recordCount: r.recordCount,
        healthScore: r.healthScore,
        error: r.error,
        simulated: r.simulated,
      }));

    const healEvents = db.healEvents.filter((e) => e.sourceId === collector.sourceId);
    const dataset = source ? getDataset(db, source.id) : [];

    return ok({
      collector,
      source,
      runs,
      selfHeals: healEvents.filter((e) => e.stage === "recovered").length,
      openIncidents: healEvents.filter(
        (e) => !["recovered", "rejected", "failed"].includes(e.stage),
      ).length,
      recordCount: dataset.length,
      lastRecords: dataset.slice(0, 8),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to load collector", 500);
  }
}
