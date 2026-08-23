import { readDb, getDataset } from "@/lib/store";
import { ok } from "@/lib/api";
import { tickDemo } from "@/lib/demo/engine";
import { displayRecord } from "@/lib/records";

export const dynamic = "force-dynamic";

/**
 * GET /api/data?source=<id|all>&q=<search>&sort=<field>&dir=asc|desc&page=1&pageSize=50
 */
export async function GET(request: Request) {
  await tickDemo();
  const db = await readDb();
  const sp = new URL(request.url).searchParams;

  const sourceParam = sp.get("source") ?? "all";
  const q = (sp.get("q") ?? "").toLowerCase().trim();
  const sortField = sp.get("sort") ?? "product";
  const dir = sp.get("dir") === "desc" ? -1 : 1;
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = Math.min(200, Math.max(10, Number(sp.get("pageSize") ?? "50")));

  const rows: Array<Record<string, unknown> & { _source: string; _sourceName: string }> = [];
  for (const source of db.sources) {
    if (sourceParam !== "all" && source.id !== sourceParam) continue;
    const dataset = getDataset(db, source.id);
    for (const record of dataset) {
      rows.push({
        ...record,
        _source: source.id,
        _sourceName: source.name,
      });
    }
  }

  const filtered = q
    ? rows.filter((r) =>
        Object.entries(r).some(([k, v]) => {
          if (k.startsWith("_")) return false;
          return String(v ?? "").toLowerCase().includes(q);
        }),
      )
    : rows;

  filtered.sort((a, b) => {
    const av = a[sortField];
    const bv = b[sortField];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const records = filtered.slice(start, start + pageSize);

  // Normalize display fields for the explorer table.
  const table = records.map((r, i) => ({
    key: `${r._source}-${start + i}`,
    ...displayRecord(r, String(r._sourceName)),
  }));

  return ok({
    total,
    page,
    pageSize,
    table,
    sources: db.sources.map((s) => ({ id: s.id, name: s.name })),
    demoEnabled: db.demo.enabled,
  });
}
