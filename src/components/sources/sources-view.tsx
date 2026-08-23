"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Database,
  Loader2,
  Play,
  Plus,
  Radar,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Modal, Textarea } from "@/components/ui/form";
import { SimulatedTag, SourceBadge } from "@/components/ui/status";
import { apiGet, apiPost, usePolling } from "@/lib/client";
import { formatNumber, timeAgo } from "@/lib/utils";
import type { Collector, Source } from "@/types";
import { cn } from "@/lib/utils";

type SourcesPayload = { sources: Source[]; collectors: Collector[] };

const FIELD_OPTIONS = ["product", "price", "availability", "discount", "rating", "url"];

export function SourcesView() {
  const { data, refresh } = usePolling<SourcesPayload>(
    () => apiGet<SourcesPayload>("/api/sources"),
    5000,
  );
  const [wizardOpen, setWizardOpen] = useState(false);

  const sources = data?.sources ?? [];
  const collectors = data?.collectors ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:pt-2 md:pt-0">
        <div className="md:pt-2">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">Sources</h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            Websites you monitor. Each source maps to one Bright Data Collector.
          </p>
        </div>
        <Button variant="primary" onClick={() => setWizardOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Source
        </Button>
      </div>

      <div className="rounded-2xl border border-white/[0.05] bg-[#0a0a0c] shadow-[inset_0_0_80px_rgba(0,0,0,0.5)]">
        {sources.map((source) => (
          <SourceRow
            key={source.id}
            source={source}
            collector={collectors.find((c) => c.sourceId === source.id) ?? null}
            onChanged={refresh}
          />
        ))}
        {!sources.length ? (
          <div className="py-16 text-center text-sm text-zinc-600">
            No sources yet. Add your first website to start monitoring.
          </div>
        ) : null}
      </div>

      <AddSourceWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onDone={refresh}
      />
    </div>
  );
}

function SourceRow({
  source,
  collector,
  onChanged,
}: {
  source: Source;
  collector: Collector | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createCollector = async () => {
    setBusy("create");
    setError(null);
    try {
      await apiPost("/api/collectors/create", { sourceId: source.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      onChanged();
    }
  };

  const runNow = async () => {
    setBusy("run");
    setError(null);
    try {
      await apiPost("/api/collectors/run", { sourceId: source.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      onChanged();
    }
  };

  return (
    <div className="group border-b border-white/[0.04] last:border-0 transition-colors hover:bg-cyan-500/[0.02] hover:border-cyan-500/20">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-zinc-100">{source.name}</span>
            <SourceBadge status={source.status} />
            {source.sample ? <SimulatedTag /> : null}
          </div>
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate font-mono text-xs text-zinc-500 transition-colors hover:text-emerald-400"
          >
            {source.url}
          </a>
          <p className="text-xs text-zinc-600">
            Fields: {source.expectedFields.join(" · ")}
          </p>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </div>

        <div className="grid grid-cols-3 gap-5 lg:w-[300px]">
          <MiniStat label="Records" value={formatNumber(source.recordCount)} />
          <MiniStat label="Health" value={`${source.healthScore}%`} highlight={source.healthScore > 90} />
          <MiniStat label="Last run" value={timeAgo(source.lastRunAt)} />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:w-auto">
          {/* Collector chip */}
          {collector?.status === "creating" ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/25 bg-sky-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-sky-300">
              <Loader2 className="h-3 w-3 animate-spin" /> Creating collector...
            </span>
          ) : collector?.status === "failed" ? (
            <span className="rounded-md border border-red-500/25 bg-red-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-red-400">
              Collector failed
            </span>
          ) : collector?.collectorId ? (
            <Link
              href={`/collectors/${collector.id}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-zinc-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
              title="Open collector"
            >
              <Radar className="h-3 w-3 text-emerald-500" />
              {collector.collectorId.slice(0, 12)}
            </Link>
          ) : (
            <Button size="sm" variant="outline" loading={busy === "create"} onClick={createCollector}>
              <Wrench className="h-3 w-3" /> Create Collector
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            disabled={!collector?.collectorId || collector.status === "creating"}
            loading={busy === "run"}
            onClick={runNow}
          >
            <Play className="h-3 w-3" /> Run
          </Button>

          <Link href={`/data?source=${source.id}`}>
            <Button size="sm" variant="ghost" title="View data">
              <Database className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, highlight = false }: { label: string; value: string, highlight?: boolean }) {
  return (
    <div>
      <p className="label-micro text-zinc-500">{label}</p>
      <p className={cn("mt-1 font-mono text-[14px] tabular-nums", highlight ? "text-cyan-400 font-bold" : "text-zinc-200")}>{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add Source wizard                                                   */
/* ------------------------------------------------------------------ */

function AddSourceWizard({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collectorNote, setCollectorNote] = useState("");

  const reset = () => {
    setStep(1);
    setUrl("");
    setDescription("");
    setFields([]);
    setError(null);
    setCollectorNote("");
  };

  const closeAndReset = () => {
    onClose();
    setTimeout(reset, 250);
  };

  const toggleField = (f: string) =>
    setFields((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const detectFields = () => {
    const t = `${description}`.toLowerCase();
    const detected = FIELD_OPTIONS.filter((f) => {
      if (f === "product") return t.includes("product") || t.includes("name");
      if (f === "price") return t.includes("price");
      if (f === "availability") return t.includes("availab") || t.includes("stock");
      if (f === "discount") return t.includes("discount") || t.includes("sale");
      if (f === "rating") return t.includes("rating") || t.includes("review");
      if (f === "url") return t.includes("url") || t.includes("link");
      return false;
    });
    setFields(detected.length ? detected : FIELD_OPTIONS.slice(0, 5));
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ source: Source }>("/api/sources", {
        url,
        description,
        expectedFields: fields,
      });
      const sourceId = res.source.id;
      setStep(3);
      // Kick off real Bright Data collector creation right away.
      try {
        await apiPost<{ note?: string }>("/api/collectors/create", { sourceId });
        setCollectorNote(
          "Bright Data is AI-generating your collector. It typically takes 5-10 minutes; the source page shows live status.",
        );
      } catch {
        setCollectorNote(
          "Source created. You can attach a Bright Data collector from the Sources list.",
        );
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeAndReset}
      wide
      title="Add Source"
      subtitle="Create a monitored website and its Bright Data Collector."
    >
      {/* Stepper */}
      <div className="mb-5 flex items-center gap-2">
        {["Website URL", "Extraction goal", "Collector"].map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div
              className={`h-0.5 rounded-full transition-colors duration-500 ${
                step > i ? "bg-emerald-500" : "bg-white/10"
              }`}
            />
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300 ${
                step > i ? "text-emerald-400" : "text-zinc-600"
              }`}
            >
              {i + 1}. {label}
            </span>
          </div>
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <Field label="Website URL" hint="Public product listing or catalog page.">
            <Input
              autoFocus
              placeholder="https://competitor-x.example.com/catalog"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
          <Field
            label="What do you want to extract?"
            hint="Natural language works — WebSentinel turns it into collector fields."
          >
            <Textarea
              rows={3}
              placeholder="Track product name, price, availability, discount and rating."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <div className="flex justify-end">
            <Button
              variant="primary"
              disabled={!/^https?:\/\//i.test(url)}
              onClick={() => {
                detectFields();
                setStep(2);
              }}
            >
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/[0.07] bg-black/30 px-4 py-3">
            <p className="font-mono text-xs text-zinc-400">{url}</p>
          </div>
          <Field label="Confirm extraction fields">
            <div className="flex flex-wrap gap-2 pt-1">
              {FIELD_OPTIONS.map((f) => {
                const active = fields.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleField(f)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                      active
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-white/[0.03] text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {active ? <Check className="h-3 w-3" /> : null}
                    {f}
                  </button>
                );
              })}
            </div>
          </Field>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" disabled={!fields.length} loading={busy} onClick={submit}>
              Create Collector <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5 py-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <Check className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">Collector Ready</h4>
            <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-zinc-500">
              {collectorNote ||
                "Bright Data is generating your collector in the background."}
            </p>
          </div>
          <Button variant="secondary" onClick={closeAndReset}>
            Done
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
