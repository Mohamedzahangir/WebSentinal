export interface DiagnosisInput {
  sourceName: string;
  url: string;
  previous: {
    recordCount: number;
    healthScore: number;
    presentFields: string[];
  } | null;
  current: {
    recordCount: number;
    healthScore: number;
    missingFields: string[];
    error?: string | null;
  };
  expectedFields: string[];
}

export interface DiagnosisOutput {
  diagnosis: string;
  confidence: number;
  affectedFields: string[];
  recommendedAction: string;
}

function deterministic(input: DiagnosisInput): DiagnosisOutput {
  const affected = input.current.missingFields.length
    ? input.current.missingFields
    : input.expectedFields.slice(0, 3);

  let confidence = 80;
  if (input.current.recordCount === 0) confidence += 12;
  if (input.previous && input.previous.healthScore >= 90) confidence += 2;

  let cause: string;
  if (input.current.error) {
    cause = `The collector run failed with an error ("${input.current.error.slice(0, 160)}"), so no data could be extracted.`;
  } else if (
    input.previous &&
    input.current.recordCount === 0 &&
    input.previous.recordCount > 0
  ) {
    cause = `The target page returned ${input.previous.recordCount} records in the last healthy run but 0 now. Combined with the loss of required fields (${affected.join(", ")}), this strongly suggests the website's DOM structure changed and the Collector's selectors no longer match.`;
  } else if (input.current.missingFields.length) {
    cause = `The fields ${affected.join(", ")} stopped extracting while other fields still return data. This pattern indicates the elements containing those values were moved or renamed in the page markup - a partial DOM structure change rather than a full outage.`;
  } else {
    cause =
      "Record volume dropped sharply compared with the previous run, which typically means pagination or listing markup changed on the target site.";
  }

  return {
    diagnosis: cause,
    confidence: Math.min(confidence, 97),
    affectedFields: affected,
    recommendedAction: `Repair the Bright Data Collector${input.sourceName ? ` for ${input.sourceName}` : ""} via self-healing, then re-run to verify recovery.`,
  };
}

async function llmDiagnose(
  input: DiagnosisInput,
  apiKey: string,
): Promise<DiagnosisOutput | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are a web-scraping reliability engineer. Given extraction telemetry, diagnose why a scraper broke. Reply ONLY with JSON: {"diagnosis": string, "confidence": number (0-100), "affectedFields": string[], "recommendedAction": string}. Be concise and concrete about likely DOM/site changes.',
          },
          {
            role: "user",
            content: JSON.stringify({
              source: input.sourceName,
              url: input.url,
              expectedFields: input.expectedFields,
              previousRun: input.previous,
              currentRun: input.current,
            }),
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as Partial<DiagnosisOutput>;
    if (!parsed.diagnosis) return null;
    return {
      diagnosis: String(parsed.diagnosis),
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence ?? 85))),
      affectedFields:
        Array.isArray(parsed.affectedFields) && parsed.affectedFields.length
          ? parsed.affectedFields.map(String)
          : input.current.missingFields,
      recommendedAction: String(
        parsed.recommendedAction ??
          "Repair the Bright Data Collector via self-healing.",
      ),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** LLM diagnosis when OPENAI_API_KEY exists, deterministic fallback otherwise. */
export async function generateDiagnosis(
  input: DiagnosisInput,
): Promise<DiagnosisOutput & { engine: "llm" | "deterministic" }> {
  const fallback = deterministic(input);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ...fallback, engine: "deterministic" };
  const llm = await llmDiagnose(input, apiKey);
  if (llm) return { ...llm, engine: "llm" };
  return { ...fallback, engine: "deterministic" };
}
