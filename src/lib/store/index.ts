import fs from "node:fs/promises";
import path from "node:path";
import type {
  Activity,
  Collector,
  DB,
  DemoState,
  HealEvent,
  ProductRecord,
  Project,
  Run,
  Source,
} from "@/types";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/client";
import { generateProducts } from "@/lib/demo/data";
import { uid } from "@/lib/utils";

export type { DB };

interface StoreBackend {
  read(): Promise<DB>;
  write(db: DB): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

const DEFAULT_DEMO: DemoState = {
  enabled: false,
  phase: "idle",
  sourceId: null,
  eventId: null,
  startedAt: null,
};

function iso(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

export const DEMO_TARGET_SOURCE_ID = "src_competitor_x";

function seedDb(): DB {
  const now = iso();
  const project: Project = {
    id: "proj_main",
    name: "Competitive Intelligence",
    description: "Track competitor product catalogs, pricing and availability.",
    createdAt: now,
  };

  const mkSource = (
    id: string,
    name: string,
    url: string,
    recordCount: number,
    healthScore: number,
    lastRunOffsetMin: number,
  ): Source => ({
    id,
    projectId: project.id,
    name,
    url,
    description:
      "Track product name, price, availability, discount and rating.",
    status: healthScore >= 95 ? "healthy" : "warning",
    expectedFields: ["product", "price", "availability", "discount", "rating"],
    recordCount,
    healthScore,
    previousRecordCount: null,
    previousHealthScore: null,
    lastRunAt: iso(-lastRunOffsetMin * 60_000),
    lastSuccessAt: iso(-lastRunOffsetMin * 60_000),
    selfHeals: id === DEMO_TARGET_SOURCE_ID ? 1 : 0,
    sample: true,
    createdAt: iso(-30 * 24 * 3600_000),
    updatedAt: now,
  });

  const sources: Source[] = [
    mkSource("src_regional_store", "Regional Store", "https://regional-store.example.com/products", 1284, 100, 42),
    mkSource(DEMO_TARGET_SOURCE_ID, "Competitor X", "https://competitor-x.example.com/catalog", 2391, 99, 18),
    mkSource("src_product_catalog", "Product Catalog", "https://catalog.example.com/products", 4820, 100, 65),
  ];

  return {
    version: 1,
    projects: [project],
    sources,
    collectors: [],
    runs: [],
    healEvents: [],
    activities: [
      {
        id: uid("act"),
        type: "system",
        level: "info",
        title: "WebSentinel initialized",
        message:
          "Monitoring 3 sources. Create real Bright Data collectors or enable Demo Mode to see the self-healing flow.",
        sourceName: null,
        at: iso(-5 * 60_000),
        simulated: false,
      },
    ],
    datasets: {},
    demo: { ...DEFAULT_DEMO },
  };
}

export function getDataset(db: DB, sourceId: string): ProductRecord[] {
  if (db.datasets[sourceId]) return db.datasets[sourceId];
  const source = db.sources.find((s) => s.id === sourceId);
  if (!source) return [];
  const seeds: Record<string, number> = {
    src_regional_store: 11,
    [DEMO_TARGET_SOURCE_ID]: 22,
    src_product_catalog: 33,
  };
  const records = generateProducts(source.recordCount || 100, seeds[sourceId] ?? 7);
  db.datasets[sourceId] = records;
  return records;
}

/* ------------------------------------------------------------------ */
/* File backend (local fallback — always available)                    */
/* ------------------------------------------------------------------ */

class FileStore implements StoreBackend {
  private file = path.join(process.cwd(), ".websentinel", "db.json");
  private cache: DB | null = null;

  async read(): Promise<DB> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(this.file, "utf8");
      this.cache = JSON.parse(raw) as DB;
    } catch {
      this.cache = seedDb();
      await this.write(this.cache).catch(() => {});
    }
    return this.cache!;
  }

  async write(db: DB): Promise<void> {
    this.cache = db;
    try {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      await fs.writeFile(this.file, JSON.stringify(db), "utf8");
    } catch {
      // Read-only filesystems still work in-memory for the session.
    }
  }
}

/* ------------------------------------------------------------------ */
/* Supabase backend (used when service-role credentials exist)         */
/* ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
class SupabaseStore implements StoreBackend {
  async read(): Promise<DB> {
    const sb = getSupabaseAdmin()!;
    const [projects, sources, collectors, runs, heals, acts, datasets, state] =
      await Promise.all([
        sb.from("projects").select("*"),
        sb.from("sources").select("*"),
        sb.from("collectors").select("*"),
        sb.from("runs").select("*"),
        sb.from("heal_events").select("*"),
        sb.from("activities").select("*").order("at", { ascending: false }),
        sb.from("datasets").select("*"),
        sb.from("app_state").select("*").eq("key", "demo").maybeSingle(),
      ]);
    const rows = <T>(r: unknown): T[] => {
      if (Array.isArray(r)) return r as T[];
      const d = (r as { data?: unknown })?.data;
      return Array.isArray(d) ? (d as T[]) : [];
    };
    const raw = <T extends Record<string, any>>(arr: unknown[]): T[] =>
      arr as T[];

    return {
      version: 1,
      projects: rows<Project>(projects),
      sources: raw<any>(sources.data ?? []).map(
        (s): Source => ({
          id: s.id,
          projectId: s.project_id,
          name: s.name,
          url: s.url,
          description: s.description ?? "",
          status: s.status,
          expectedFields: s.expected_fields ?? [],
          recordCount: s.record_count ?? 0,
          healthScore: Number(s.health_score ?? 0),
          previousRecordCount: s.previous_record_count ?? null,
          previousHealthScore:
            s.previous_health_score != null
              ? Number(s.previous_health_score)
              : null,
          lastRunAt: s.last_run_at ?? null,
          lastSuccessAt: s.last_success_at ?? null,
          selfHeals: s.self_heals ?? 0,
          sample: s.sample ?? false,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        }),
      ),
      collectors: raw<any>(collectors.data ?? []).map(
        (c): Collector => ({
          id: c.id,
          sourceId: c.source_id,
          collectorId: c.collector_id ?? null,
          name: c.name ?? "",
          description: c.description ?? "",
          fields: c.fields ?? [],
          status: c.status,
          lastRunAt: c.last_run_at ?? null,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        }),
      ),
      runs: raw<any>(runs.data ?? []).map(
        (r): Run => ({
          id: r.id,
          sourceId: r.source_id,
          collectorRowId: r.collector_row_id,
          collectorId: r.collector_id ?? null,
          status: r.status,
          startedAt: r.started_at,
          completedAt: r.completed_at ?? null,
          recordCount: r.record_count ?? 0,
          healthScore: Number(r.health_score ?? 0),
          fieldPresence: r.field_presence ?? {},
          error: r.error ?? null,
          records: r.records ?? [],
          simulated: r.simulated ?? false,
          cliExitCode: r.cli_exit_code ?? null,
          cliError: r.cli_error ?? null,
        }),
      ),
      healEvents: raw<any>(heals.data ?? []).map(
        (h): HealEvent => ({
          id: h.id,
          sourceId: h.source_id,
          sourceName: h.source_name,
          collectorId: h.collector_id ?? null,
          runId: h.run_id ?? null,
          detectedAt: h.detected_at,
          failureType: h.failure_type,
          stage: h.stage,
          beforeCount: h.before_count ?? 0,
          beforeHealth: Number(h.before_health ?? 0),
          afterCount: h.after_count ?? null,
          afterHealth:
            h.after_health != null ? Number(h.after_health) : null,
          diagnosis: h.diagnosis ?? null,
          confidence: h.confidence != null ? Number(h.confidence) : null,
          affectedFields: h.affected_fields ?? [],
          recommendedAction: h.recommended_action ?? null,
          repairPreview: h.repair_preview ?? null,
          repairEngine: h.repair_engine ?? null,
          verified: h.verified ?? false,
          simulated: h.simulated ?? false,
          schedule: h.schedule ?? [],
          updatedAt: h.updated_at,
        }),
      ),
      activities: raw<any>(acts.data ?? []).map(
        (a): Activity => ({
          id: a.id,
          type: a.type,
          level: a.level,
          title: a.title,
          message: a.message ?? "",
          sourceName: a.source_name ?? null,
          at: a.at,
          simulated: a.simulated ?? false,
        }),
      ),
      datasets: Object.fromEntries(
        rows<{ source_id: string; records: ProductRecord[] }>(
          datasets,
        ).map((d) => [d.source_id, d.records ?? []]),
      ),
      demo:
        (state.data as { value?: DemoState } | null)?.value ??
        ({ ...DEFAULT_DEMO } as DemoState),
    };
  }

  async write(db: DB): Promise<void> {
    const sb = getSupabaseAdmin()!;
    await Promise.all([
      sb.from("projects").upsert(db.projects),
      sb.from("sources").upsert(
        db.sources.map(({ expectedFields, recordCount, healthScore, previousRecordCount, previousHealthScore, selfHeals, lastRunAt, lastSuccessAt, createdAt, updatedAt, ...rest }) => ({
          ...rest,
          expected_fields: expectedFields,
          record_count: recordCount,
          health_score: healthScore,
          previous_record_count: previousRecordCount,
          previous_health_score: previousHealthScore,
          self_heals: selfHeals,
          last_run_at: lastRunAt,
          last_success_at: lastSuccessAt,
          created_at: createdAt,
          updated_at: updatedAt,
        })),
      ),
      sb.from("collectors").upsert(
        db.collectors.map(({ collectorId, lastRunAt, createdAt, updatedAt, ...rest }) => ({
          ...rest,
          collector_id: collectorId,
          last_run_at: lastRunAt,
          created_at: createdAt,
          updated_at: updatedAt,
        })),
      ),
      sb.from("runs").upsert(
        db.runs.map(({ collectorRowId, collectorId, startedAt, completedAt, recordCount, healthScore, fieldPresence, cliExitCode, cliError, ...rest }) => ({
          ...rest,
          collector_row_id: collectorRowId,
          collector_id: collectorId,
          started_at: startedAt,
          completed_at: completedAt,
          record_count: recordCount,
          health_score: healthScore,
          field_presence: fieldPresence,
          cli_exit_code: cliExitCode,
          cli_error: cliError,
        })),
      ),
      sb.from("heal_events").upsert(
        db.healEvents.map(({ sourceName, collectorId, runId, detectedAt, failureType, beforeCount, beforeHealth, afterCount, afterHealth, affectedFields, recommendedAction, repairPreview, repairEngine, updatedAt, ...rest }) => ({
          ...rest,
          source_name: sourceName,
          collector_id: collectorId,
          run_id: runId,
          detected_at: detectedAt,
          failure_type: failureType,
          before_count: beforeCount,
          before_health: beforeHealth,
          after_count: afterCount,
          after_health: afterHealth,
          affected_fields: affectedFields,
          recommended_action: recommendedAction,
          repair_preview: repairPreview,
          repair_engine: repairEngine,
          updated_at: updatedAt,
        })),
      ),
      sb.from("activities").upsert(
        db.activities.map(({ sourceName, ...rest }) => ({
          ...rest,
          source_name: sourceName,
        })),
      ),
      sb.from("datasets").upsert(
        Object.entries(db.datasets).map(([source_id, records]) => ({
          source_id,
          records,
          updated_at: new Date().toISOString(),
        })),
      ),
      sb.from("app_state").upsert({
        key: "demo",
        value: db.demo,
        updated_at: new Date().toISOString(),
      }),
    ]);
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

const backend: StoreBackend = isSupabaseConfigured()
  ? new SupabaseStore()
  : new FileStore();

let queue: Promise<unknown> = Promise.resolve();

/** Serialized read-modify-write so concurrent API calls never clobber state. */
export function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const task = queue.then(async () => {
    const db = await backend.read();
    const result = await fn(db);
    await backend.write(db);
    return result;
  });
  queue = task.catch(() => {});
  return task;
}

export async function readDb(): Promise<DB> {
  return backend.read();
}

export function pushActivity(
  db: DB,
  a: Omit<Activity, "id" | "at" | "simulated"> & { simulated?: boolean },
): Activity {
  const activity: Activity = {
    id: uid("act"),
    at: new Date().toISOString(),
    simulated: a.simulated ?? false,
    ...a,
  };
  db.activities.unshift(activity);
  db.activities = db.activities.slice(0, 200);
  return activity;
}

export function freshDemoState(): DemoState {
  return { ...DEFAULT_DEMO };
}
