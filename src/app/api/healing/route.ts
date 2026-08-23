import { readDb } from "@/lib/store";
import { ok } from "@/lib/api";
import { tickDemo } from "@/lib/demo/engine";
import { getJobs } from "@/lib/brightdata/scraper";

export const dynamic = "force-dynamic";

export async function GET() {
  await tickDemo();
  const db = await readDb();
  const jobs = getJobs();
  return ok({
    events: db.healEvents,
    busyCollectorRows: jobs
      .filter(
        (j) =>
          j.kind === "heal" ||
          j.kind === "heal_approve" ||
          j.kind === "collector_create",
      )
      .filter((j) => j.status === "running").length,
  });
}
