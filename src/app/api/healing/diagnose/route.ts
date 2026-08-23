import { generateDiagnosis } from "@/lib/ai/diagnose";
import { readDb, mutate } from "@/lib/store";
import { ok, err, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/healing/diagnose
 * body: { eventId }
 * (Re-)generates an AI diagnosis for a heal event. Uses OpenAI when
 * OPENAI_API_KEY is set; deterministic analysis otherwise.
 */
export async function POST(request: Request) {
  const body = await readJson<{ eventId?: string }>(request);
  if (!body?.eventId) return err("`eventId` is required.");
  try {
    const db = await readDb();
    const event = db.healEvents.find((e) => e.id === body.eventId);
    if (!event) return err("Heal event not found", 404);
    const source = db.sources.find((s) => s.id === event.sourceId);
    const badRun = db.runs.find((r) => r.id === event.runId);
    const goodRun = db.runs.find(
      (r) =>
        r.sourceId === event.sourceId &&
        r.status === "success" &&
        r.id !== event.runId,
    );

    const diagnosis = await generateDiagnosis({
      sourceName: event.sourceName,
      url: source?.url ?? "",
      previous: goodRun
        ? {
            recordCount: goodRun.recordCount,
            healthScore: goodRun.healthScore,
            presentFields: Object.entries(goodRun.fieldPresence)
              .filter(([, okField]) => okField)
              .map(([f]) => f),
          }
        : null,
      current: {
        recordCount: badRun?.recordCount ?? 0,
        healthScore: badRun?.healthScore ?? 0,
        missingFields:
          badRun && Object.keys(badRun.fieldPresence).length
            ? Object.entries(badRun.fieldPresence)
                .filter(([, okField]) => !okField)
                .map(([f]) => f)
            : event.affectedFields,
        error: badRun?.error ?? null,
      },
      expectedFields: source?.expectedFields ?? event.affectedFields,
    });

    await mutate((db2) => {
      const ev = db2.healEvents.find((e) => e.id === body.eventId);
      if (!ev) return;
      ev.diagnosis = diagnosis.diagnosis;
      ev.confidence = diagnosis.confidence;
      ev.affectedFields = diagnosis.affectedFields;
      ev.recommendedAction = diagnosis.recommendedAction;
      ev.updatedAt = new Date().toISOString();
    });

    return ok({ diagnosis });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Diagnosis failed", 500);
  }
}
