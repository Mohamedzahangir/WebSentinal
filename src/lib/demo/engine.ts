import { type DB, type HealEvent, type ProductRecord, type Run, HEAL_STAGE_ORDER } from "@/types";
import { DEMO_TARGET_SOURCE_ID, getDataset, mutate, pushActivity, readDb } from "@/lib/store";
import { generateProducts } from "@/lib/demo/data";
import { uid } from "@/lib/utils";

/**
 * Demo Mode — a clearly-labeled simulation of the self-healing flow.
 * Every artifact it creates is marked `simulated: true` and surfaced in the
 * UI with a DEMO badge. The real Bright Data pipeline is separate.
 */

function failureDiagnosis(sourceName: string, fields: string[]) {
  return {
    diagnosis: `${sourceName}'s product grid was re-rendered inside a new shadow DOM container, so the Collector's selectors no longer match. Fields ${fields.join(", ")} stopped extracting while the page still returns HTTP 200 - a classic silent DOM structure change.`,
    confidence: 94,
    affectedFields: fields,
    recommendedAction: `Repair the Bright Data Collector via AI self-healing, then verify with a fresh extraction run.`,
  };
}

async function hasDueTransitions(): Promise<boolean> {
  const db = await readDb();
  const nowMs = Date.now();
  return db.healEvents.some((e) => {
    if (!e.simulated || !e.schedule.length) return false;
    const currentIdx = HEAL_STAGE_ORDER.indexOf(e.stage);
    const due = e.schedule
      .filter((t) => t.at <= nowMs)
      .sort((a, b) => HEAL_STAGE_ORDER.indexOf(a.stage) - HEAL_STAGE_ORDER.indexOf(b.stage));
    if (!due.length) return false;
    return HEAL_STAGE_ORDER.indexOf(due[due.length - 1].stage) > currentIdx;
  });
}

/** Apply any due scheduled stage transitions (called from read endpoints). */
export async function tickDemo(): Promise<void> {
  if (!(await hasDueTransitions())) return;
  await mutate((db) => {
    const nowMs = Date.now();
    let mutated = false;
    for (const event of db.healEvents) {
      if (!event.simulated || !event.schedule.length) continue;
      
      const currentIdx = HEAL_STAGE_ORDER.indexOf(event.stage);
      const due = event.schedule
        .filter((t) => t.at <= nowMs)
        .sort((a, b) => HEAL_STAGE_ORDER.indexOf(a.stage) - HEAL_STAGE_ORDER.indexOf(b.stage));
        
      if (!due.length) continue;
      
      const targetTransition = due[due.length - 1];
      const targetIdx = HEAL_STAGE_ORDER.indexOf(targetTransition.stage);
      
      if (targetIdx > currentIdx) {
        for (let i = currentIdx + 1; i <= targetIdx; i++) {
          applyStageTransition(db, event, HEAL_STAGE_ORDER[i]);
        }
        event.updatedAt = new Date().toISOString();
        mutated = true;
      }
    }
    if (mutated) syncDemoPhase(db);
  });
}

function applyStageTransition(db: DB, event: HealEvent, stage: string): void {
  switch (stage) {
    case "diagnosing":
      event.stage = "diagnosing";
      break;
    case "generating_repair":
      event.stage = "generating_repair";
      break;
    case "awaiting_approval":
      event.stage = "awaiting_approval";
      pushActivity(db, {
        type: "heal",
        level: "warn",
        title: "Repair proposed",
        message: `Self-heal plan ready for ${event.sourceName}. Approval required.`,
        sourceName: event.sourceName,
        simulated: true,
      });
      break;
    case "repairing":
      event.stage = "repairing";
      break;
    case "verifying":
      event.stage = "verifying";
      break;
    case "recovered":
      recoverSource(db, event);
      break;
    default:
      event.stage = stage as HealEvent["stage"];
  }
}

/** Restore healthy extraction state for a simulated recovery. */
function recoverSource(db: DB, event: HealEvent): void {
  const source = db.sources.find((s) => s.id === event.sourceId);
  if (!source) return;

  const restoredCount = event.beforeCount || source.recordCount || 1200;
  const records: ProductRecord[] = generateProducts(restoredCount, 22);
  db.datasets[source.id] = records;

  const nowIso = new Date().toISOString();
  const run: Run = {
    id: uid("run"),
    sourceId: source.id,
    collectorRowId: "simulated",
    collectorId: event.collectorId,
    status: "success",
    startedAt: nowIso,
    completedAt: nowIso,
    recordCount: records.length,
    healthScore: 99,
    fieldPresence: Object.fromEntries(
      source.expectedFields.map((f) => [f, true]),
    ),
    error: null,
    records: [],
    simulated: true,
    cliExitCode: null,
    cliError: null,
  };
  db.runs.unshift(run);

  source.recordCount = records.length;
  source.healthScore = 99;
  source.status = "healed";
  source.selfHeals += 1;
  source.lastRunAt = nowIso;
  source.lastSuccessAt = nowIso;

  event.stage = "recovered";
  event.verified = true;
  event.afterCount = records.length;
  event.afterHealth = 99;

  pushActivity(db, {
    type: "heal",
    level: "success",
    title: "SELF-HEAL COMPLETED",
    message: `${source.name}: DOM repaired, ${records.length.toLocaleString()} records recovered · health 99%.`,
    sourceName: source.name,
    simulated: true,
  });
}

function syncDemoPhase(db: DB): void {
  const event = db.demo.eventId
    ? db.healEvents.find((e) => e.id === db.demo.eventId)
    : undefined;
  if (!db.demo.enabled) {
    db.demo.phase = "idle";
    return;
  }
  db.demo.phase =
    (event?.stage as typeof db.demo.phase | undefined) ?? db.demo.phase;
}

/* ------------------------------------------------------------------ */
/* Public controls                                                     */
/* ------------------------------------------------------------------ */

export async function enableDemo(): Promise<void> {
  await mutate((db) => {
    db.demo.enabled = true;
    if (!db.demo.phase || db.demo.phase === "idle") db.demo.phase = "idle";
    // Make sure the demo target has a healthy baseline dataset.
    getDataset(db, DEMO_TARGET_SOURCE_ID);
    pushActivity(db, {
      type: "system",
      level: "info",
      title: "Demo Mode enabled",
      message:
        "Simulated failures are labeled DEMO. Real Bright Data collectors remain available separately.",
      sourceName: null,
      simulated: true,
    });
  });
}

export async function disableDemo(): Promise<void> {
  await mutate((db) => {
    db.demo.enabled = false;
    db.demo.phase = "idle";
    db.demo.eventId = null;
    pushActivity(db, {
      type: "system",
      level: "info",
      title: "Demo Mode disabled",
      message: "Back to live monitoring.",
      sourceName: null,
      simulated: false,
    });
  });
}

/** Inject a simulated website structure change on the demo target source. */
export async function triggerDemoFailure(): Promise<
  { ok: true; eventId: string } | { ok: false; error: string }
> {
  return mutate((db) => {
    const source =
      db.sources.find((s) => s.id === db.demo.sourceId) ??
      db.sources.find((s) => s.id === DEMO_TARGET_SOURCE_ID);
    if (!source)
      return { ok: false as const, error: "No demo target source found." };

    const beforeCount = Math.max(source.recordCount, 100);
    const beforeHealth = Math.max(source.healthScore, 90);
    const fields = [...source.expectedFields];
    const diag = failureDiagnosis(source.name, fields);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const failedRun: Run = {
      id: uid("run"),
      sourceId: source.id,
      collectorRowId: "simulated",
      collectorId: null,
      status: "empty",
      startedAt: nowIso,
      completedAt: nowIso,
      recordCount: 0,
      healthScore: 0,
      fieldPresence: Object.fromEntries(fields.map((f) => [f, false])),
      error: "Extraction returned no data - the page structure may have changed.",
      records: [],
      simulated: true,
      cliExitCode: null,
      cliError: null,
    };
    db.runs.unshift(failedRun);

    // The simulated site change wipes current extraction results.
    delete db.datasets[source.id];

    source.previousRecordCount = source.recordCount;
    source.previousHealthScore = source.healthScore;
    source.recordCount = 0;
    source.healthScore = 0;
    source.status = "failing";
    source.lastRunAt = nowIso;

    const event: HealEvent = {
      id: uid("heal"),
      sourceId: source.id,
      sourceName: source.name,
      collectorId: null,
      runId: failedRun.id,
      detectedAt: nowIso,
      failureType: "empty_extraction",
      stage: "detected",
      beforeCount,
      beforeHealth,
      afterCount: null,
      afterHealth: null,
      diagnosis: diag.diagnosis,
      confidence: diag.confidence,
      affectedFields: diag.affectedFields,
      recommendedAction: diag.recommendedAction,
      repairPreview: [
        "Bright Data self-heal plan (simulated):",
        "1. Re-fetch target page with fresh browser render",
        "2. Re-locate product card container (new div[data-testid='product-tile'])",
        `3. Re-bind selector paths for ${fields.join(", ")}`,
        "4. Validate against last-known-good schema",
        "5. Await operator approval before saving template v2",
      ].join("\n"),
      repairEngine: "simulated",
      verified: false,
      simulated: true,
      schedule: [
        { stage: "diagnosing", at: nowMs + 2200 },
        { stage: "generating_repair", at: nowMs + 4400 },
        { stage: "awaiting_approval", at: nowMs + 6600 },
      ],
      updatedAt: nowIso,
    };
    db.healEvents.unshift(event);

    db.demo.enabled = true;
    db.demo.phase = "failure_injected";
    db.demo.sourceId = source.id;
    db.demo.eventId = event.id;
    db.demo.startedAt = nowIso;

    pushActivity(db, {
      type: "heal",
      level: "error",
      title: "Failure detected",
      message: `${source.name}: extraction returned 0 records (previous ${beforeCount.toLocaleString()}). Health 99% → 0%.`,
      sourceName: source.name,
      simulated: true,
    });

    return { ok: true as const, eventId: event.id };
  });
}

/** Approve or reject the pending simulated repair. */
export async function approveDemoRepair(
  approve: boolean,
): Promise<{ ok: boolean; error?: string }> {
  return mutate((db) => {
    const event = db.demo.eventId
      ? db.healEvents.find((e) => e.id === db.demo.eventId)
      : undefined;
    if (!event) return { ok: false, error: "No active demo heal event." };
    if (event.stage !== "awaiting_approval")
      return { ok: false, error: "The repair is not awaiting approval." };

    const nowMs = Date.now();
    if (!approve) {
      event.stage = "rejected";
      event.schedule = [];
      event.updatedAt = new Date().toISOString();
      db.demo.phase = "rejected";
      pushActivity(db, {
        type: "heal",
        level: "warn",
        title: "Repair rejected",
        message: `${event.sourceName}: proposed fix discarded. The source stays degraded until healed.`,
        sourceName: event.sourceName,
        simulated: true,
      });
      return { ok: true };
    }

    event.stage = "repairing";
    event.schedule = [
      { stage: "verifying", at: nowMs + 2600 },
      { stage: "recovered", at: nowMs + 5200 },
    ];
    event.updatedAt = new Date().toISOString();
    db.demo.phase = "repairing";
    pushActivity(db, {
      type: "heal",
      level: "info",
      title: "Repair approved",
      message: `Applying Bright Data repair plan to ${event.sourceName}, then verifying...`,
      sourceName: event.sourceName,
      simulated: true,
    });
    return { ok: true };
  });
}
