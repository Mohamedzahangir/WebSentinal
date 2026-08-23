"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResponse } from "@/types";

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  let body: ApiResponse<T> | null = null;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }
  if (!body || !body.ok) {
    throw new Error(
      (body as ApiResponse<never> & { ok: false })?.error ??
        `Request failed (${res.status})`,
    );
  }
  return body.data;
}

export function apiGet<T>(path: string): Promise<T> {
  return api<T>(path);
}

export function apiPost<T>(path: string, payload?: unknown): Promise<T> {
  return api<T>(path, { method: "POST", body: JSON.stringify(payload ?? {}) });
}

/** Poll an async loader until unmounted; keeps latest data + error state. */
export function usePolling<T>(
  loader: () => Promise<T>,
  intervalMs = 3000,
  enabled = true,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const refresh = useCallback(async () => {
    try {
      const result = await loaderRef.current();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const t = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(t);
  }, [refresh, intervalMs, enabled]);

  return { data, error, loading, refresh };
}
