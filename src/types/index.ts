export type SourceStatus =
  | "pending"
  | "healthy"
  | "warning"
  | "failing"
  | "healed"
  | "error";

export type CollectorStatus =
  | "creating"
  | "ready"
  | "healing"
  | "failed"
  | "error";

export type RunStatus = "running" | "success" | "failed" | "empty";

export type HealStage =
  | "detected"
  | "diagnosing"
  | "generating_repair"
  | "awaiting_approval"
  | "repairing"
  | "verifying"
  | "recovered"
  | "rejected"
  | "failed";

export const HEAL_STAGE_ORDER: HealStage[] = [
  "detected",
  "diagnosing",
  "generating_repair",
  "awaiting_approval",
  "repairing",
  "verifying",
  "recovered",
];

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Source {
  id: string;
  projectId: string;
  name: string;
  url: string;
  description: string;
  status: SourceStatus;
  expectedFields: string[];
  recordCount: number;
  healthScore: number;
  previousRecordCount: number | null;
  previousHealthScore: number | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  selfHeals: number;
  sample: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Collector {
  id: string;
  sourceId: string;
  /** Real Bright Data collector id, e.g. c_xxxxxxxxx */
  collectorId: string | null;
  name: string;
  description: string;
  fields: string[];
  status: CollectorStatus;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRecord {
  product?: string;
  title?: string;
  price?: number | string | null;
  currency?: string | null;
  availability?: string | null;
  discount?: number | string | null;
  rating?: number | string | null;
  url?: string | null;
  [key: string]: unknown;
}

export interface Run {
  id: string;
  sourceId: string;
  collectorRowId: string;
  /** Real Bright Data collector id used for this run */
  collectorId: string | null;
  status: RunStatus;
  startedAt: string;
  completedAt: string | null;
  recordCount: number;
  healthScore: number;
  fieldPresence: Record<string, boolean>;
  error: string | null;
  records: ProductRecord[];
  simulated: boolean;
  cliExitCode: number | null;
  cliError: string | null;
}

export interface DiagnosisResult {
  diagnosis: string;
  confidence: number;
  affectedFields: string[];
  recommendedAction: string;
  engine: "llm" | "deterministic";
}

export interface StageTransition {
  stage: HealStage;
  at: number;
}

export interface HealEvent {
  id: string;
  sourceId: string;
  sourceName: string;
  /** Real Bright Data collector id involved in the healing process */
  collectorId: string | null;
  runId: string | null;
  detectedAt: string;
  failureType: string;
  stage: HealStage;
  beforeCount: number;
  beforeHealth: number;
  afterCount: number | null;
  afterHealth: number | null;
  diagnosis: string | null;
  confidence: number | null;
  affectedFields: string[];
  recommendedAction: string | null;
  repairPreview: string | null;
  repairEngine: "brightdata" | "simulated" | null;
  verified: boolean;
  simulated: boolean;
  schedule: StageTransition[];
  updatedAt: string;
}

export type ActivityLevel = "info" | "success" | "warn" | "error";

export interface Activity {
  id: string;
  type: "heal" | "run" | "source" | "collector" | "system";
  level: ActivityLevel;
  title: string;
  message: string;
  sourceName: string | null;
  at: string;
  simulated: boolean;
}

export type DemoPhase =
  | "idle"
  | "failure_injected"
  | "diagnosing"
  | "generating_repair"
  | "awaiting_approval"
  | "repairing"
  | "verifying"
  | "recovered"
  | "rejected";

export interface DemoState {
  enabled: boolean;
  phase: DemoPhase;
  sourceId: string | null;
  eventId: string | null;
  startedAt: string | null;
}

export interface ChartPoint {
  label: string;
  records: number;
  incidents: number;
}

export interface DashboardPayload {
  metrics: {
    activeSources: number;
    healthAverage: number;
    totalRecords: number;
    selfHeals: number;
    openIncidents: number;
  };
  sources: Array<{
    id: string;
    name: string;
    url: string;
    status: SourceStatus;
    recordCount: number;
    healthScore: number;
    lastRunAt: string | null;
    sample: boolean;
  }>;
  activities: Activity[];
  chart: ChartPoint[];
  demo: DemoState;
  integrations: {
    brightdata: boolean;
    supabase: boolean;
    llm: boolean;
  };
}

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiErr {
  ok: false;
  error: string;
}

export type ApiResponse<T> = ApiOk<T> | ApiErr;

export interface DB {
  version: number;
  projects: Project[];
  sources: Source[];
  collectors: Collector[];
  runs: Run[];
  healEvents: HealEvent[];
  activities: Activity[];
  datasets: Record<string, ProductRecord[]>;
  demo: DemoState;
}
