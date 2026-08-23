import { buildDashboard } from "@/lib/dashboard";
import { ok, err } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await buildDashboard());
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to load dashboard", 500);
  }
}
