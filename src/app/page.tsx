import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Radar,
  ScanSearch,
  ShieldCheck,
  Stethoscope,
  Wrench,
} from "lucide-react";

export const metadata = { title: "WebSentinel · Web intelligence that never goes blind" };

const STEPS = [
  {
    icon: ScanSearch,
    key: "DETECT",
    title: "Detect",
    body: "Extraction health is evaluated on every run. Record drops, missing fields and schema drift trigger instantly.",
  },
  {
    icon: Stethoscope,
    key: "DIAGNOSE",
    title: "Diagnose",
    body: "AI pinpoints why extraction broke — which fields, what changed on the page, how confident we are.",
  },
  {
    icon: Wrench,
    key: "HEAL",
    title: "Heal",
    body: "Bright Data's self-healing repairs the Collector's selectors. You review and approve every fix.",
  },
  {
    icon: ShieldCheck,
    key: "VERIFY",
    title: "Verify",
    body: "A fresh run through the repaired collector proves recovery before your pipeline resumes.",
  },
];

export default function Landing() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      {/* Backdrop */}
      <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[560px]" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(16,185,129,0.09), transparent 70%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
            <Radar className="h-4 w-4 text-emerald-400" />
          </span>
          <span className="font-mono text-sm font-bold tracking-[0.18em]">
            WEB<span className="text-emerald-400">SENTINEL</span>
          </span>
        </div>
        <Link
          href="/dashboard"
          className="text-[13px] font-medium text-zinc-400 transition-colors hover:text-zinc-100"
        >
          Open Dashboard →
        </Link>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-6xl px-6">
        <section className="pb-16 pt-16 text-center md:pt-24">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium tracking-wide text-zinc-400">
            <Activity className="h-3 w-3 text-emerald-500" />
            Autonomous web intelligence platform
          </p>
          <h1 className="mx-auto max-w-4xl font-mono text-[38px] font-bold leading-[1.06] tracking-tight sm:text-6xl md:text-[68px]">
            WEB INTELLIGENCE
            <br />
            <span className="bg-gradient-to-b from-emerald-200 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              THAT NEVER GOES BLIND.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            WebSentinel detects website changes, repairs broken extraction pipelines
            with Bright Data&apos;s self-healing Collectors, and keeps your intelligence flowing.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500 px-7 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-400 hover:shadow-[0_0_32px_rgba(16,185,129,0.35)]"
            >
              Start Monitoring <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/healing"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/[0.12] px-7 text-sm font-medium text-zinc-200 transition-colors hover:border-white/25 hover:bg-white/[0.04]"
            >
              View Self-Heal Demo
            </Link>
          </div>
        </section>

        {/* Pipeline */}
        <section className="border-t border-white/[0.06] py-14">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {STEPS.map((s) => (
              <div
                key={s.key}
                className="card group p-5 transition-colors duration-300 hover:border-emerald-500/25"
              >
                <s.icon className="h-[18px] w-[18px] text-emerald-500" />
                <p className="mt-4 font-mono text-[10px] font-semibold tracking-[0.18em] text-zinc-500 transition-colors group-hover:text-emerald-400">
                  {s.key}
                </p>
                <h3 className="mt-1 text-sm font-semibold text-zinc-100">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live recovery visual */}
        <section className="pb-20 pt-6">
          <div className="card relative mx-auto max-w-3xl overflow-hidden p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            <p className="label-micro">Live self-heal event</p>

            <div className="mt-6 space-y-0">
              <TimelineRow
                label="BEFORE"
                value={<>2,391 <span className="text-xs font-normal text-zinc-500">records</span></>}
                tone="neutral"
              />
              <TimelineRow
                label="FAILURE"
                value={<>0 <span className="text-xs font-normal text-red-400/80">records · health 0%</span></>}
                tone="danger"
              />
              <TimelineRow
                label="DIAGNOSIS"
                value={<span className="text-sm font-normal text-zinc-300">DOM structure changed</span>}
                tone="info"
              />
              <TimelineRow
                label="REPAIR"
                value={
                  <span className="font-mono text-xs text-zinc-300">
                    Bright Data Collector <span className="text-emerald-400">c_xxxxxxxx</span> repaired
                  </span>
                }
                tone="warn"
              />
              <TimelineRow
                label="AFTER"
                value={
                  <>
                    2,391 <span className="text-xs font-normal text-zinc-500">records</span>{" "}
                    <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> VERIFIED
                    </span>
                  </>
                }
                tone="success"
              />
            </div>

            <Link
              href="/healing"
              className="mt-7 inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-400 transition-colors hover:text-emerald-300"
            >
              See it live in the dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <p className="mt-12 text-center text-xs leading-relaxed text-zinc-600">
            Built on Bright Data Scraper Studio · Next.js · Real collectors, real healing, labeled simulations.
          </p>
        </section>
      </main>
    </div>
  );
}

const TONES = {
  neutral: "border-white/[0.07]",
  danger: "border-red-500/25 shadow-[inset_2px_0_0_0_rgba(239,68,68,0.55)]",
  info: "border-sky-500/20 shadow-[inset_2px_0_0_0_rgba(56,189,248,0.5)]",
  warn: "border-amber-500/20 shadow-[inset_2px_0_0_0_rgba(245,158,11,0.5)]",
  success: "border-emerald-500/30 shadow-[inset_2px_0_0_0_rgba(16,185,129,0.6)]",
} as const;

function TimelineRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone: keyof typeof TONES;
}) {
  return (
    <div className={`mb-2 flex items-center justify-between rounded-lg border bg-black/20 px-4 py-3 ${TONES[tone]}`}>
      <span className="label-micro">{label}</span>
      <span className="font-mono text-lg font-bold tabular-nums text-zinc-100">{value}</span>
    </div>
  );
}
