import { readDb } from "@/lib/store";
import { ok, err } from "@/lib/api";
import { tickDemo } from "@/lib/demo/engine";

export const dynamic = "force-dynamic";

/** GET /api/runs/[id] — poll a run's status (records omitted while running). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await tickDemo();
    const { id } = await params;
    const db = await readDb();
    const run = db.runs.find((r) => r.id === id);
    if (!run) return err("Run not found", 404);
    const source = db.sources.find((s) => s.id === run.sourceId) ?? null;
    return ok({
      run: {
        ...run,
        records: run.status === "running" ? [] : run.records.slice(0, 100),
      },
      source,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to load run", 500);
  }
}
