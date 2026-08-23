import { approveHealJob } from "@/lib/brightdata/scraper";
import { approveDemoRepair } from "@/lib/demo/engine";
import { readDb } from "@/lib/store";
import { ok, err, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/healing/approve
 * body: { eventId, approve: boolean }
 * Real mode: resumes Bright Data's approval gate (`bdata scraper approve`)
 * and verifies recovery with a fresh extraction run.
 * Demo mode (simulated event): advances the labeled simulation instead.
 */
export async function POST(request: Request) {
  const body = await readJson<{ eventId?: string; approve?: boolean }>(request);
  if (!body?.eventId) return err("`eventId` is required.");
  const approve = body.approve !== false;

  try {
    const db = await readDb();
    const event = db.healEvents.find((e) => e.id === body.eventId);
    if (!event) return err("Heal event not found", 404);

    if (event.simulated) {
      const result = await approveDemoRepair(approve);
      if (!result.ok) return err(result.error ?? "Failed", 400);
      return ok({ approved: approve, simulated: true });
    }

    approveHealJob(body.eventId!, approve);
    return ok({
      approved: approve,
      simulated: false,
      note: approve
        ? "Bright Data is applying the repair. Recovery will be verified with a fresh run."
        : "Repair rejected.",
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to process approval", 400);
  }
}
