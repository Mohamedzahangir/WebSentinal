import type { ProductRecord } from "@/types";

export interface HealthEvaluation {
  recordCount: number;
  fieldPresence: Record<string, boolean>;
  missingFields: string[];
  healthScore: number;
}

export interface Anomaly {
  failureType: "empty_extraction" | "schema_drift" | "volume_drop";
  severity: number;
  summary: string;
  missingFields: string[];
}

const PRESENCE_THRESHOLD = 0.5; // a field is "present" if non-empty in >=50% of records

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") {
    return v.trim().length > 0 && v !== "null" && v !== "undefined";
  }
  if (typeof v === "number") return Number.isFinite(v);
  return true;
}

/**
 * Evaluate extraction health for one run: record count, required fields,
 * null/missing values, schema consistency and basic validity.
 */
export function evaluateHealth(
  records: ProductRecord[],
  expectedFields: string[],
  previousCount?: number | null,
): HealthEvaluation {
  const count = records.length;

  if (count === 0) {
    const fieldPresence = Object.fromEntries(
      expectedFields.map((f) => [f, false]),
    );
    return {
      recordCount: 0,
      fieldPresence,
      missingFields: [...expectedFields],
      healthScore: 0,
    };
  }

  const fieldPresence: Record<string, boolean> = {};
  const missingFields: string[] = [];
  for (const field of expectedFields) {
    const filled = records.filter((r) => isFilled(r[field])).length;
    const present = filled / count >= PRESENCE_THRESHOLD;
    fieldPresence[field] = present;
    if (!present) missingFields.push(field);
  }

  const fieldScore =
    (expectedFields.length - missingFields.length) / expectedFields.length;
  const volumeScore =
    previousCount && previousCount > 0
      ? Math.min(count / previousCount, 1)
      : count > 0
        ? 1
        : 0;

  const healthScore = Math.round((fieldScore * 0.7 + volumeScore * 0.3) * 100);

  return { recordCount: count, fieldPresence, missingFields, healthScore };
}

/** Compare consecutive runs and decide whether extraction broke. */
export function detectAnomaly(
  previous: {
    recordCount: number;
    healthScore: number;
    fieldPresence: Record<string, boolean>;
  } | null,
  current: HealthEvaluation,
): Anomaly | null {
  if (current.recordCount === 0 && (!previous || previous.recordCount > 0)) {
    return {
      failureType: "empty_extraction",
      severity: 1,
      summary:
        previous && previous.recordCount > 0
          ? `Extraction returned 0 records (previous run: ${previous.recordCount}).`
          : "Extraction returned 0 records.",
      missingFields: current.missingFields,
    };
  }

  if (
    previous &&
    current.recordCount > 0 &&
    current.recordCount < previous.recordCount * 0.4
  ) {
    return {
      failureType: "volume_drop",
      severity: 0.7,
      summary: `Record count dropped ${Math.round(
        (1 - current.recordCount / previous.recordCount) * 100,
      )}% (${previous.recordCount} to ${current.recordCount}).`,
      missingFields: current.missingFields,
    };
  }

  const newlyMissing = current.missingFields.filter(
    (f) => !previous?.fieldPresence?.[f],
  );
  if (newlyMissing.length > 0 && current.healthScore < 70) {
    return {
      failureType: "schema_drift",
      severity: 0.9,
      summary: `Required fields stopped extracting: ${newlyMissing.join(", ")}.`,
      missingFields: newlyMissing,
    };
  }

  return null;
}
