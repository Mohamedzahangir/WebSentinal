import { startCollectorCreation } from "@/lib/brightdata/scraper";
import { ok, err, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/collectors/create
 * body: { sourceId }
 * Kicks off `bdata scraper create` (AI generation takes 5-10 minutes).
 * Poll GET /api/collectors/[id] until status is ready/failed.
 */
export async function POST(request: Request) {
  const body = await readJson<{ sourceId?: string; url?: string; description?: string }>(
    request,
  );
  if (!body?.sourceId) return err("`sourceId` is required.");
  try {
    const collectorRowId = await startCollectorCreation(body.sourceId);
    return ok({
      collectorRowId,
      note: "Bright Data is AI-generating the collector. This typically takes 5-10 minutes.",
    });
  } catch (e) {
    return err(
      e instanceof Error ? e.message : "Failed to start collector creation",
      400,
    );
  }
}
