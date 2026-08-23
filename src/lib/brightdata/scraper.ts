import type {
  Collector,
  DB,
  HealEvent,
  ProductRecord,
  Run,
  RunStatus,
  Source,
} from "@/types";
import { extractJson, findCollectorId, runBdata } from "./client";
import { detectAnomaly, evaluateHealth } from "@/lib/health";
import { generateDiagnosis } from "@/lib/ai/diagnose";
import { mutate, pushActivity } from "@/lib/store";
import { uid } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Job registry (in-process; durable state lives in the store)         */
/* ------------------------------------------------------------------ */

export interface JobInfo {
  id: string;
  kind:
    | "collector_create"
    | "collector_run"
    | "heal"
    | "heal_approve"
    | "verify_run";
  status: "running" | "done" | "error";
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
}

const jobs = new Map<string, JobInfo>();

function startJob(
  kind: JobInfo["kind"],
  fn: (job: JobInfo) => Promise<void>,
): JobInfo {
  const job: JobInfo = {
    id: uid("job"),
    kind,
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  };
  jobs.set(job.id, job);
  void (async () => {
    try {
      await fn(job);
      job.status = "done";
    } catch (err) {
      job.status = "error";
      job.error = err instanceof Error ? err.message : String(err);
    } finally {
      job.finishedAt = new Date().toISOString();
    }
  })();
  return job;
}

export function getJobs(): JobInfo[] {
  return [...jobs.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const RECORD_ARRAY_KEY_HINT = /^(data|results?|items?|records?|rows?|products?|output)$/i;

/** Best-effort extraction of the record array from arbitrary CLI JSON. */
export function extractRecords(parsed: unknown): ProductRecord[] {
  if (Array.isArray(parsed)) {
    return parsed.filter(
      (x): x is ProductRecord => typeof x === "object" && x !== null && !Array.isArray(x),
    );
  }
  let best: ProductRecord[] = [];
  let bestDepth = Infinity;

  const visit = (node: unknown, key: string | null, depth: number) => {
    if (Array.isArray(node)) {
      const objects = node.filter(
        (x): x is ProductRecord =>
          typeof x === "object" && x !== null && !Array.isArray(x),
      );
      if (
        objects.length > 0 &&
        (objects.length > best.length ||
          (objects.length === best.length &&
            depth < bestDepth &&
            key &&
            RECORD_ARRAY_KEY_HINT.test(key)))
      ) {
        best = objects;
        bestDepth = depth;
      }
      for (const item of node) visit(item, key, depth + 1);
      return;
    }
    if (typeof node === "object" && node !== null) {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        visit(v, k, depth + 1);
      }
    }
  };
  visit(parsed, null, 0);
  return best;
}

function summarizeCliEnvelope(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["status", "state", "next_step", "nextStep", "message", "summary", "version"]) {
    if (obj[key] != null) parts.push(`${key}: ${String(obj[key])}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

export function buildHealPrompt(event: HealEvent): string {
  const fields = event.affectedFields.length
    ? event.affectedFields.join(", ")
    : "product, price, availability";
  const prompt = `WebSentinel detected an extraction failure (${event.failureType}). ${event.diagnosis ?? ""} Required fields that stopped extracting: ${fields}. Previous healthy run had ${event.beforeCount} records. Please repair the scraper selectors so these fields extract again: ${fields}.`;
  return prompt.slice(0, 1000);
}

/* ------------------------------------------------------------------ */
/* Public operations — real Bright Data CLI integration                */
/* ------------------------------------------------------------------ */

/** Kick off `bdata scraper create` for a source (AI build takes 5–10 min). */
export async function startCollectorCreation(sourceId: string): Promise<string> {
  const rowId = uid("col");

  return mutate((db) => {
    const source = db.sources.find((s) => s.id === sourceId);
    if (!source) throw new Error(`Unknown source: ${sourceId}`);
    const existing = db.collectors.find(
      (c) => c.sourceId === sourceId && c.status === "creating",
    );
    if (existing) {
      // Creation already in flight — reuse it.
      return existing.id;
    }
    const collector: Collector = {
      id: rowId,
      sourceId,
      collectorId: null,
      name: `websentinel-${source.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      description: source.description,
      fields: [...source.expectedFields],
      status: "creating",
      lastRunAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.collectors.push(collector);
    pushActivity(db, {
      type: "collector",
      level: "info",
      title: "Creating Bright Data Collector",
      message: `AI-generating a collector for ${source.url} (typically 5-10 minutes).`,
      sourceName: source.name,
    });

    startJob("collector_create", async () => {
      const result = await runBdata([
        "scraper", "create", source.url, source.description,
        "--name", collector.name, "--json",
      ]);
      const parsed = extractJson(result.stdout);
      const collectorId = findCollectorId(parsed);
      await mutate((db2) => {
        const row = db2.collectors.find((c) => c.id === collector.id);
        if (!row) return;
        if (result.exitCode === 0 && collectorId) {
          row.collectorId = collectorId;
          row.status = "ready";
          pushActivity(db2, {
            type: "collector",
            level: "success",
            title: "Collector ready",
            message: `Bright Data Collector ${collectorId} created for ${source.name}.`,
            sourceName: source.name,
          });
        } else {
          row.status = "failed";
          pushActivity(db2, {
            type: "collector",
            level: "error",
            title: "Collector creation failed",
            message:
              result.stderr.slice(0, 300) ||
              result.stdout.slice(0, 300) ||
              "Unknown CLI error.",
            sourceName: source.name,
          });
        }
        row.updatedAt = new Date().toISOString();
      });
    });
    return rowId;
  });
}

/** Kick off `bdata scraper run` and evaluate extraction health afterwards. */
export function startCollectorRun(
  collectorRowId: string,
  urlOverride?: string,
): Promise<string> {
  return mutate((db) => {
    const collector = db.collectors.find((c) => c.id === collectorRowId);
    if (!collector) throw new Error("Collector not found");
    if (!collector.collectorId)
      throw new Error(
        "This collector has no Bright Data ID yet. Creation may still be in progress.",
      );
    const source = db.sources.find((s) => s.id === collector.sourceId);
    if (!source) throw new Error("Source not found");
    const targetUrl = urlOverride?.trim() || source.url;

    const run: Run = {
      id: uid("run"),
      sourceId: source.id,
      collectorRowId: collector.id,
      collectorId: collector.collectorId,
      status: "running",
      startedAt: new Date().toISOString(),
      completedAt: null,
      recordCount: 0,
      healthScore: 0,
      fieldPresence: {},
      error: null,
      records: [],
      simulated: false,
      cliExitCode: null,
      cliError: null,
    };
    db.runs.unshift(run);
    collector.lastRunAt = run.startedAt;
    collector.updatedAt = run.startedAt;

    startJob("collector_run", async () => {
      const result = await runBdata([
        "scraper", "run", collector.collectorId!, targetUrl, "--json",
      ]);
      const parsed = extractJson(result.stdout);
      const records = extractRecords(parsed);

      const prevRun = db.runs.find(
        (r) =>
          r.sourceId === source.id &&
          r.id !== run.id &&
          r.status === "success",
      );
      const evaluation = evaluateHealth(
        records,
        source.expectedFields,
        prevRun?.recordCount ?? null,
      );

      const status: RunStatus =
        result.exitCode !== 0
          ? "failed"
          : evaluation.recordCount === 0
            ? "empty"
            : "success";

      await mutate((db2) => {
        const r = db2.runs.find((x) => x.id === run.id);
        if (!r) return;
        r.completedAt = new Date().toISOString();
        r.status = status;
        r.recordCount = evaluation.recordCount;
        r.healthScore = evaluation.healthScore;
        r.fieldPresence = evaluation.fieldPresence;
        r.records = records.slice(0, 5000);
        r.cliExitCode = result.exitCode;
        r.cliError =
          status === "failed"
            ? (result.stderr.slice(0, 500) || "CLI run failed")
            : null;
        r.error =
          status === "empty"
            ? "Extraction returned no data - the page structure may have changed."
            : r.cliError;

        const src = db2.sources.find((s) => s.id === source.id)!;
        src.lastRunAt = r.completedAt;
        src.previousRecordCount = src.recordCount;
        src.previousHealthScore = src.healthScore;
        src.recordCount = evaluation.recordCount;
        src.healthScore = evaluation.healthScore;
        if (records.length > 0) {
          db2.datasets[source.id] = records;
          src.lastSuccessAt = r.completedAt;
        } else {
          delete db2.datasets[source.id];
        }

        if (status === "success") {
          src.status = evaluation.missingFields.length ? "warning" : "healthy";
        } else {
          src.status = "failing";
        }

        // Automatic anomaly detection on every completed real run.
        const anomaly = detectAnomaly(
          prevRun
            ? {
                recordCount: prevRun.recordCount,
                healthScore: prevRun.healthScore,
                fieldPresence: prevRun.fieldPresence,
              }
            : null,
          evaluation,
        );
        if (anomaly && status !== "success") {
          void createHealFlow(
            db2,
            src,
            r,
            anomaly.failureType,
            anomaly.summary,
            prevRun?.recordCount ?? null,
          );
        } else {
          pushActivity(db2, {
            type: "run",
            level: status === "success" ? "success" : "error",
            title:
              status === "success"
                ? `Run completed · ${evaluation.recordCount} records`
                : status === "empty"
                  ? "Run returned no data"
                  : "Run failed",
            message:
              status === "success"
                ? `${source.name}: health ${evaluation.healthScore}%`
                : (r.error ?? "Unknown error"),
            sourceName: source.name,
          });
        }
      });
    });
    return run.id;
  });
}

/** Create a heal event + diagnosis and kick off Bright Data self-healing. */
export async function createHealFlow(
  db: DB,
  source: Source,
  run: Run,
  failureType: string,
  failureSummary: string,
  prevHealthyCount: number | null,
): Promise<string> {
  const now = new Date().toISOString();
  const collector = db.collectors.find((c) => c.sourceId === source.id);

  const event: HealEvent = {
    id: uid("heal"),
    sourceId: source.id,
    sourceName: source.name,
    collectorId: collector?.collectorId ?? null,
    runId: run.id,
    detectedAt: now,
    failureType,
    stage: "diagnosing",
    beforeCount: prevHealthyCount ?? Math.max(run.recordCount, 1),
    beforeHealth: 99,
    afterCount: null,
    afterHealth: null,
    diagnosis: null,
    confidence: null,
    affectedFields: run.fieldPresence
    ? Object.entries(run.fieldPresence)
        .filter(([, ok]) => !ok)
        .map(([field]) => field)
    : [],
    recommendedAction: null,
    repairPreview: null,
    repairEngine: null,
    verified: false,
    simulated: false,
    schedule: [],
    updatedAt: now,
  };

  const diagnosis = await generateDiagnosis({
    sourceName: source.name,
    url: source.url,
    previous: (() => {
      const prev = db.runs.find(
        (r) => r.sourceId === source.id && r.id !== run.id && r.status === "success",
      );
      return prev
        ? {
            recordCount: prev.recordCount,
            healthScore: prev.healthScore,
            presentFields: Object.entries(prev.fieldPresence)
              .filter(([, ok]) => ok)
              .map(([f]) => f),
          }
        : null;
    })(),
    current: {
      recordCount: run.recordCount,
      healthScore: run.healthScore,
      missingFields: event.affectedFields.length
        ? event.affectedFields
        : source.expectedFields,
      error: run.error,
    },
    expectedFields: source.expectedFields,
  });

  event.diagnosis = `${failureSummary} ${diagnosis.diagnosis}`;
  event.confidence = diagnosis.confidence;
  event.recommendedAction = diagnosis.recommendedAction;
  if (!event.affectedFields.length) event.affectedFields = diagnosis.affectedFields;
  event.stage = "generating_repair";

  db.healEvents.unshift(event);
  source.status = "failing";
  pushActivity(db, {
    type: "heal",
    level: "error",
    title: "Extraction failure detected",
    message: `${failureSummary} Diagnosis: ${diagnosis.confidence}% confidence.`,
    sourceName: source.name,
  });

  // Automatically kick off the real Bright Data heal (stops at approval gate).
  if (collector?.collectorId) {
    startHealJob(event.id);
  }
  return event.id;
}

/**
 * Manual detection entry point: analyze a source's latest failed run and,
 * if anomalous, create the heal flow (diagnosis + Bright Data heal).
 */
export function detectFromLatestRun(
  sourceId: string,
): Promise<{ ok: boolean; error?: string; eventId?: string }> {
  return mutate(async (db) => {
    const source = db.sources.find((s) => s.id === sourceId);
    if (!source) return { ok: false, error: "Source not found." };

    const lastBad = db.runs.find(
      (r) => r.sourceId === sourceId && (r.status === "empty" || r.status === "failed"),
    );
    if (!lastBad)
      return { ok: false, error: "No failed run found for this source yet. Run the collector first." };

    const open = db.healEvents.find(
      (e) =>
        e.runId === lastBad.id &&
        !["recovered", "rejected", "failed"].includes(e.stage),
    );
    if (open) return { ok: true, eventId: open.id };

    const prev = db.runs.find(
      (r) => r.sourceId === sourceId && r.status === "success" && r.id !== lastBad.id,
    );
    const evaluation = evaluateHealth(
      lastBad.records,
      source.expectedFields,
      prev?.recordCount ?? null,
    );
    const anomaly = detectAnomaly(
      prev
        ? {
            recordCount: prev.recordCount,
            healthScore: prev.healthScore,
            fieldPresence: prev.fieldPresence,
          }
        : null,
      evaluation,
    );
    const failureType = anomaly?.failureType ?? (lastBad.status === "failed" ? "run_error" : "empty_extraction");
    const summary =
      anomaly?.summary ??
      `Extraction degraded for ${source.name} (${lastBad.recordCount} records).`;
    const eventId = await createHealFlow(
      db,
      source,
      lastBad,
      failureType,
      summary,
      prev?.recordCount ?? null,
    );
    return { ok: true, eventId };
  });
}

/**
 * Run `bdata scraper heal` for an event's collector.
 * Without --auto-approve the CLI stops at Bright Data's approval gate,
 * which maps to our awaiting_approval stage.
 */
export function startHealJob(healEventId: string): void {
  void mutate(async (db) => {
    const event = db.healEvents.find((e) => e.id === healEventId);
    if (!event) throw new Error("Heal event not found");
    if (!event.collectorId)
      throw new Error(
        "No real Bright Data collector attached to this source. Use Demo Mode to simulate healing.",
      );
    event.stage = "generating_repair";
    event.updatedAt = new Date().toISOString();

    startJob("heal", async () => {
      const result = await runBdata([
        "scraper", "heal", event.collectorId!, buildHealPrompt(event), "--json",
      ]);
      const parsed = extractJson(result.stdout);
      const summary = summarizeCliEnvelope(parsed);
      await mutate((db2) => {
        const ev = db2.healEvents.find((e) => e.id === healEventId);
        if (!ev) return;
        if (result.exitCode === 0) {
          ev.repairPreview =
            summary ?? result.stdout.slice(0, 600) ?? null;
          ev.repairEngine = "brightdata";
          ev.stage = "awaiting_approval";
          pushActivity(db2, {
            type: "heal",
            level: "warn",
            title: "Repair proposed by Bright Data",
            message: `Collector ${ev.collectorId} fix is awaiting your approval.`,
            sourceName: ev.sourceName,
          });
        } else {
          ev.stage = "failed";
          ev.repairPreview = result.stderr.slice(0, 600) || "Heal failed.";
          pushActivity(db2, {
            type: "heal",
            level: "error",
            title: "Self-healing failed",
            message: ev.repairPreview,
            sourceName: ev.sourceName,
          });
        }
        ev.updatedAt = new Date().toISOString();
      });
    });
    return null;
  });
}

/** Approve or reject at Bright Data's approval gate, then verify by re-running. */
export function approveHealJob(healEventId: string, approve: boolean): void {
  void mutate(async (db) => {
    const event = db.healEvents.find((e) => e.id === healEventId);
    if (!event) throw new Error("Heal event not found");
    if (event.stage !== "awaiting_approval")
      throw new Error("This event is not awaiting approval.");
    if (!event.collectorId) throw new Error("No Bright Data collector attached.");

    if (!approve) {
      event.stage = "rejected";
      event.updatedAt = new Date().toISOString();
      pushActivity(db, {
        type: "heal",
        level: "warn",
        title: "Repair rejected",
        message: `Proposed fix for ${event.collectorId} was rejected.`,
        sourceName: event.sourceName,
      });
      return;
    }

    event.stage = "repairing";
    event.updatedAt = new Date().toISOString();

    startJob("heal_approve", async () => {
      const result = await runBdata([
        "scraper", "approve", event.collectorId!, "--auto-save", "--json",
      ]);
      const parsed = extractJson(result.stdout);
      const summary = summarizeCliEnvelope(parsed);

      const approvedOk = result.exitCode === 0;
      await mutate((db2) => {
        const ev = db2.healEvents.find((e) => e.id === healEventId);
        if (!ev) return;
        ev.repairPreview = [ev.repairPreview, summary]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 900);
        if (!approvedOk) {
          ev.stage = "failed";
          pushActivity(db2, {
            type: "heal",
            level: "error",
            title: "Repair approval failed",
            message: result.stderr.slice(0, 400) || "CLI approve failed.",
            sourceName: ev.sourceName,
          });
          return;
        }
        ev.stage = "verifying";
        ev.updatedAt = new Date().toISOString();
        pushActivity(db2, {
          type: "heal",
          level: "info",
          title: "Repair applied",
          message: `Bright Data repaired collector ${ev.collectorId}. Verifying with a fresh extraction...`,
          sourceName: ev.sourceName,
        });
      });

      if (!approvedOk) return;

      // Verification = a fresh real run through the repaired collector.
      const collectorRowId = await mutate((db2) =>
        db2.collectors.find((c) => c.collectorId === event.collectorId)?.id ?? null,
      );
      if (!collectorRowId) {
        await failEvent(healEventId, "No collector row found for verification run.");
        return;
      }
      const runId = await startCollectorRun(collectorRowId);

      // Wait for the verification run to finish (CLI polls internally).
      const deadline = Date.now() + 20 * 60_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 5000));
        let status: RunStatus | null = null;
        let recordCount = 0;
        let healthScore = 0;
        let error: string | null = null;
        await mutate((db2) => {
          const vr = db2.runs.find((r) => r.id === runId);
          if (vr) {
            status = vr.status;
            recordCount = vr.recordCount;
            healthScore = vr.healthScore;
            error = vr.error;
          }
        });
        if (status && status !== "running") {
          await finalizeVerification(
            healEventId,
            status,
            recordCount,
            healthScore,
            error,
          );
          return;
        }
      }
      await failEvent(healEventId, "Verification run timed out.");
    });
  });
}

async function failEvent(healEventId: string, message: string): Promise<void> {
  await mutate((db) => {
    const ev = db.healEvents.find((e) => e.id === healEventId);
    if (!ev) return;
    ev.stage = "failed";
    ev.updatedAt = new Date().toISOString();
    pushActivity(db, {
      type: "heal",
      level: "error",
      title: "Recovery failed",
      message,
      sourceName: ev.sourceName,
    });
  });
}

async function finalizeVerification(
  healEventId: string,
  status: RunStatus,
  recordCount: number,
  healthScore: number,
  error: string | null,
): Promise<void> {
  await mutate((db) => {
    const ev = db.healEvents.find((e) => e.id === healEventId);
    if (!ev) return;
    if (status === "success" && recordCount > 0 && healthScore >= 70) {
      ev.stage = "recovered";
      ev.verified = true;
      ev.afterCount = recordCount;
      ev.afterHealth = healthScore;
      const src = db.sources.find((s) => s.id === ev.sourceId);
      if (src) {
        src.selfHeals += 1;
        src.status = "healed";
      }
      pushActivity(db, {
        type: "heal",
        level: "success",
        title: "SELF-HEAL COMPLETED",
        message: `${ev.sourceName}: ${recordCount} records recovered · health ${healthScore}%.`,
        sourceName: ev.sourceName,
      });
    } else {
      ev.stage = "failed";
      pushActivity(db, {
        type: "heal",
        level: "error",
        title: "Recovery verification failed",
        message: error ?? "Post-repair run did not produce healthy data.",
        sourceName: ev.sourceName,
      });
    }
    ev.updatedAt = new Date().toISOString();
  });
}
