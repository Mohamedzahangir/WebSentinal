import { startCollectorRun } from "@/lib/brightdata/scraper";
import { ok, err, readJson } from "@/lib/api";
import { mutate } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/collectors/run
 * body: { collectorRowId, url? } or { sourceId, url? }
 * Starts a real Bright Data run and returns the run id for polling.
 * `url` optionally overrides the target for ad-hoc verification runs.
 */
export async function POST(request: Request) {
  const body = await readJson<{
    collectorRowId?: string;
    sourceId?: string;
    url?: string;
  }>(request);
  try {
    let rowId = body?.collectorRowId ?? null;
    if (!rowId && body?.sourceId) {
      rowId = await mutate((db) => {
        const c = db.collectors.find(
          (x) =>
            x.sourceId === body.sourceId &&
            x.status === "ready" &&
            x.collectorId,
        );
        return c?.id ?? null;
      });
      if (!rowId)
        return err(
          "This source has no ready Bright Data collector yet. Create one first.",
          409,
        );
    }
    if (!rowId) return err("`collectorRowId` or `sourceId` is required.");
    const runId = await startCollectorRun(rowId, body?.url);
    return ok({ runId });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to start run", 400);
  }
}
