import { startHealJob } from "@/lib/brightdata/scraper";
import { ok, err, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/healing/heal
 * body: { eventId }
 * Runs `bdata scraper heal` — Bright Data generates a repair and stops at its
 * approval gate, which maps to our awaiting_approval stage.
 */
export async function POST(request: Request) {
  const body = await readJson<{ eventId?: string }>(request);
  if (!body?.eventId) return err("`eventId` is required.");
  try {
    startHealJob(body.eventId);
    return ok({
      started: true,
      note: "Bright Data AI is generating a repair proposal. This can take several minutes.",
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to start healing", 400);
  }
}
