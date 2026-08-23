import { readDb } from "@/lib/store";
import { ok, err } from "@/lib/api";
import { tickDemo } from "@/lib/demo/engine";

export const dynamic = "force-dynamic";

/** GET /api/healing/[id] — full heal-event detail including records context. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await tickDemo();
    const { id } = await params;
    const db = await readDb();
    const event = db.healEvents.find((e) => e.id === id);
    if (!event) return err("Heal event not found", 404);
    const source = db.sources.find((s) => s.id === event.sourceId) ?? null;
    const collector = db.collectors.find(
      (c) => c.collectorId === event.collectorId,
    );
    return ok({ event, source, collector });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to load heal event", 500);
  }
}
