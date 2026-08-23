import { detectFromLatestRun } from "@/lib/brightdata/scraper";
import { approveDemoRepair, tickDemo, triggerDemoFailure } from "@/lib/demo/engine";
import { readDb } from "@/lib/store";
import { ok, err, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/healing/detect
 * body: { sourceId, demo?: boolean }
 * Real mode: analyzes the latest failed run of a source with a Bright Data collector.
 * Demo mode: injects a simulated website change on the demo target.
 */
export async function POST(request: Request) {
  const body = await readJson<{ sourceId?: string; demo?: boolean }>(request);
  try {
    if (body?.demo) {
      await tickDemo();
      const result = await triggerDemoFailure();
      if (!result.ok) return err(result.error, 400);
      return ok({ eventId: result.eventId, simulated: true });
    }

    let sourceId = body?.sourceId ?? null;
    if (!sourceId) {
      // Default to the source with the most recent failure.
      const db = await readDb();
      const bad = db.runs.find((r) => r.status === "empty" || r.status === "failed");
      sourceId = bad?.sourceId ?? null;
    }
    if (!sourceId)
      return err("No failed runs to analyze. Run a collector first.", 409);

    const result = await detectFromLatestRun(sourceId);
    if (!result.ok) return err(result.error ?? "Detection failed", 400);
    return ok({ eventId: result.eventId!, simulated: false });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Detection failed", 500);
  }
}

/** Convenience passthrough so one endpoint also handles demo approvals. */
export async function PUT(request: Request) {
  const body = await readJson<{ approve?: boolean }>(request);
  const result = await approveDemoRepair(Boolean(body?.approve));
  if (!result.ok) return err(result.error ?? "Failed", 400);
  return ok({ approved: Boolean(body?.approve) });
}
