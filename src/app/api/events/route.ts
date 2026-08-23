import { readDb } from "@/lib/store";
import { tickDemo } from "@/lib/demo/engine";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await tickDemo();
  const db = await readDb();
  const limit = Number(
    new URL(request.url).searchParams.get("limit") ?? "30",
  );
  return ok({
    activities: db.activities.slice(0, Math.min(Math.max(limit, 1), 100)),
    demo: db.demo,
  });
}
