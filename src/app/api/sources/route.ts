import { mutate, readDb, pushActivity } from "@/lib/store";
import { ok, err, readJson } from "@/lib/api";
import { uid } from "@/lib/utils";
import type { Source } from "@/types";

export const dynamic = "force-dynamic";

const KNOWN_FIELDS = ["product", "price", "availability", "discount", "rating", "url", "title", "name"];

function parseFieldsFromText(text: string): string[] {
  const t = text.toLowerCase();
  const fields = KNOWN_FIELDS.filter((f) => {
    if (f === "product") return t.includes("product") || t.includes("name");
    if (f === "title") return t.includes("title");
    if (f === "price") return t.includes("price");
    if (f === "availability") return t.includes("availab") || t.includes("stock");
    if (f === "discount") return t.includes("discount") || t.includes("sale");
    if (f === "rating") return t.includes("rating") || t.includes("review");
    if (f === "url") return t.includes("url") || t.includes("link");
    return false;
  });
  return fields.length
    ? fields
    : ["product", "price", "availability", "discount", "rating"];
}

export async function GET() {
  try {
    const db = await readDb();
    return ok({
      sources: db.sources,
      collectors: db.collectors,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to load sources", 500);
  }
}

export async function POST(request: Request) {
  const body = await readJson<{
    name?: string;
    url?: string;
    description?: string;
    expectedFields?: string[];
  }>(request);
  if (!body?.url) return err("`url` is required.");
  if (!/^https?:\/\//i.test(body.url))
    return err("URL must start with http:// or https://");

  try {
    const source = await mutate((db) => {
      const name =
        body.name?.trim() ||
        new URL(body.url!).hostname.replace(/^www\./, "").split(".")[0] ||
        "New Source";
      const description = body.description?.trim() ?? "";
      const now = new Date().toISOString();
      const source: Source = {
        id: uid("src"),
        projectId: db.projects[0]?.id ?? "proj_main",
        name,
        url: body.url!,
        description,
        status: "pending",
        expectedFields:
          body.expectedFields && body.expectedFields.length
            ? body.expectedFields
            : parseFieldsFromText(`${name} ${description}`),
        recordCount: 0,
        healthScore: 0,
        previousRecordCount: null,
        previousHealthScore: null,
        lastRunAt: null,
        lastSuccessAt: null,
        selfHeals: 0,
        sample: false,
        createdAt: now,
        updatedAt: now,
      };
      db.sources.unshift(source);
      pushActivity(db, {
        type: "source",
        level: "info",
        title: "Source added",
        message: `${source.name} is now monitored for ${source.expectedFields.join(", ")}.`,
        sourceName: source.name,
      });
      return source;
    });
    return ok({ source });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to create source", 500);
  }
}
