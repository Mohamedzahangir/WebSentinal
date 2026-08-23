import { readDb } from "@/lib/store";
import {
  approveDemoRepair,
  disableDemo,
  enableDemo,
  tickDemo,
  triggerDemoFailure,
} from "@/lib/demo/engine";
import { ok, err, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  await tickDemo();
  const db = await readDb();
  return ok({ demo: db.demo });
}

/**
 * POST /api/demo
 * body: { action: "enable" | "disable" | "trigger-failure" | "approve" | "reject" }
 * Demo Mode is always labeled as simulated in the UI and data model.
 */
export async function POST(request: Request) {
  const body = await readJson<{
    action?:
      | "enable"
      | "disable"
      | "trigger-failure"
      | "approve"
      | "reject";
  }>(request);
  if (!body?.action) return err("`action` is required.");

  switch (body.action) {
    case "enable":
      await enableDemo();
      break;
    case "disable":
      await disableDemo();
      break;
    case "trigger-failure": {
      await enableDemo().catch(() => {});
      const result = await triggerDemoFailure();
      if (!result.ok) return err(result.error, 400);
      return ok({ eventId: result.eventId });
    }
    case "approve": {
      const result = await approveDemoRepair(true);
      if (!result.ok) return err(result.error ?? "Failed", 400);
      break;
    }
    case "reject": {
      const result = await approveDemoRepair(false);
      if (!result.ok) return err(result.error ?? "Failed", 400);
      break;
    }
    default:
      return err(`Unknown action: ${String(body.action)}`);
  }

  const db = await readDb();
  return ok({ demo: db.demo });
}
