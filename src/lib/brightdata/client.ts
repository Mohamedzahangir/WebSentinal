import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface CliResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

/**
 * Resolve the installed Bright Data CLI binary.
 * Prefers the local node_modules install, falls back to a global install.
 */
export function resolveBdataBin(): string {
  const local = path.join(process.cwd(), "node_modules", ".bin");
  for (const name of process.platform === "win32"
    ? ["bdata.cmd", "bdata.ps1", "bdata"]
    : ["bdata"]) {
    const p = path.join(local, name);
    if (fs.existsSync(p)) return p;
  }
  return "bdata";
}

function quote(arg: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(arg)) return arg;
  return `"${arg.replace(/(["$`\\])/g, "\\$1")}"`;
}

/**
 * Execute the Bright Data CLI and capture stdout/stderr/exit code.
 * The CLI prints human progress lines before JSON payloads, so consumers
 * should use extractJson() to pull structured data out of stdout.
 */
export function runBdata(
  args: string[],
  opts: { timeoutMs?: number } = {},
): Promise<CliResult> {
  const bin = resolveBdataBin();
  const fullArgs = [...args];
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  if (apiKey) fullArgs.unshift("--api-key", apiKey);
  // Never let the shell interpolate user-controlled content.
  const command = [quote(bin), ...fullArgs.map(quote)].join(" ");

  return new Promise((resolve) => {
    exec(
      command,
      {
        timeout: opts.timeoutMs ?? 15 * 60_000,
        windowsHide: true,
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env },
      },
      (error, stdout, stderr) => {
        const exitCode = error && typeof (error as NodeJS.ErrnoException & { code?: number }).code === "number"
          ? (error as unknown as { code: number }).code
          : error
            ? 1
            : 0;
        resolve({
          command,
          stdout: stdout?.toString() ?? "",
          stderr: stderr?.toString() ?? "",
          exitCode,
          timedOut: Boolean(error && (error as { killed?: boolean }).killed),
        });
      },
    );
  });
}

/** Pull the first parseable JSON value out of mixed CLI output. */
export function extractJson(stdout: string): unknown | null {
  const trimmed = stdout.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through to scanning */
  }
  const candidates: string[] = [];
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "{" || ch === "[") candidates.push(trimmed.slice(i));
  }
  // Try longest-to-shortest slices starting at each brace.
  for (const start of candidates.sort((a, b) => b.length - a.length).slice(0, 40)) {
    for (let end = start.length; end > 1; end--) {
      const slice = start.slice(0, end);
      const last = slice[slice.length - 1];
      if (last !== "}" && last !== "]") continue;
      try {
        return JSON.parse(slice);
      } catch {
        continue;
      }
    }
  }
  return null;
}

/** Deep-search parsed CLI JSON for a Bright Data collector id (c_xxx). */
export function findCollectorId(parsed: unknown): string | null {
  if (!parsed) return null;
  if (typeof parsed === "string" && /^c_[A-Za-z0-9]+$/.test(parsed)) return parsed;
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const found = findCollectorId(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof parsed === "object" && parsed !== null) {
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        (key === "collector_id" || key === "collectorId" || key === "id") &&
        typeof value === "string" &&
        /^c_[A-Za-z0-9]+$/.test(value)
      ) {
        return value;
      }
      const found = findCollectorId(value);
      if (found) return found;
    }
  }
  return null;
}
