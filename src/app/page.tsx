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
import { cn } from "@/lib/utils";

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
    <div className="relative min-h-dvh overflow-x-clip bg-[#0A0A0A]">
      {/* Backdrop */}
      <div className="absolute inset-0 halftone-bg opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A] pointer-events-none" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center border-[2px] border-[#e21d2f] bg-[#e21d2f]/10 comic-shadow">
            <Radar className="h-5 w-5 text-[#e21d2f]" />
          </span>
          <span className="font-mono text-lg font-black tracking-[0.2em] comic-offset-text uppercase text-white">
            WEB<span className="text-[#e21d2f]">SENTINEL</span>
          </span>
        </div>
        <Link
          href="/dashboard"
          className="font-mono text-[11px] font-bold tracking-widest text-[#8b5cf6] transition-colors hover:text-[#e21d2f] uppercase"
        >
          Open Dashboard →
        </Link>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-6xl px-6">
        <section className="pb-16 pt-16 text-center md:pt-24 relative">
          <p className="mx-auto mb-6 inline-flex items-center gap-2 border-[2px] border-[#8b5cf6]/40 bg-[#050505]/80 px-4 py-1.5 font-mono text-[10px] font-bold tracking-[0.2em] text-[#8b5cf6] uppercase comic-shadow">
            <Activity className="h-3.5 w-3.5 text-[#e21d2f]" />
            Autonomous web intelligence platform
          </p>
          <h1 className="mx-auto max-w-5xl font-mono text-[42px] font-black leading-[1.05] tracking-tight sm:text-6xl md:text-[76px] comic-offset-text uppercase text-white">
            WEB INTELLIGENCE
            <br />
            <span className="text-[#e21d2f]">
              THAT NEVER GOES BLIND.
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-[16px] leading-relaxed text-zinc-300 font-medium">
            WebSentinel detects website changes, repairs broken extraction pipelines
            with Bright Data&apos;s self-healing Collectors, and keeps your intelligence flowing.
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-14 items-center gap-3 bg-[#e21d2f] px-8 font-mono text-[13px] font-black tracking-[0.15em] text-[#050505] transition-all hover:bg-white hover:text-[#e21d2f] uppercase comic-offset border-[2px] border-[#050505]"
            >
              Start Monitoring <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/healing"
              className="inline-flex h-14 items-center gap-3 border-[2px] border-[#e21d2f] bg-[#050505] px-8 font-mono text-[13px] font-black tracking-[0.15em] text-[#e21d2f] transition-all hover:bg-[#e21d2f] hover:text-[#050505] uppercase comic-shadow"
            >
              View Self-Heal Demo
            </Link>
          </div>
        </section>

        {/* Pipeline */}
        <section className="border-t-[3px] border-white/10 py-20 relative">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4 relative z-10">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className="bg-[#050505]/95 border-[2px] border-[#8b5cf6]/30 p-6 comic-shadow transition-all duration-300 hover:border-[#e21d2f] comic-panel relative group"
              >
                <div className="absolute -top-3 -right-3 font-mono text-4xl font-black text-white/5 group-hover:text-[#e21d2f]/10 transition-colors pointer-events-none">
                  0{i + 1}
                </div>
                <s.icon className="h-6 w-6 text-[#e21d2f]" />
                <p className="mt-5 font-mono text-[11px] font-black tracking-[0.2em] text-[#8b5cf6] transition-colors group-hover:text-[#e21d2f] uppercase">
                  {s.key}
                </p>
                <h3 className="mt-2 text-base font-bold text-white uppercase tracking-wider">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400 font-medium">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live recovery visual */}
        <section className="pb-24 pt-10">
          <div className="bg-[#050505]/95 border-[2px] border-[#e21d2f]/40 relative mx-auto max-w-3xl overflow-hidden p-8 sm:p-10 comic-panel comic-shadow">
            <p className="font-mono text-[10px] font-black tracking-[0.2em] text-[#e21d2f] uppercase mb-8 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full bg-[#e21d2f] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 bg-[#e21d2f]"></span>
              </span>
              Live self-heal event
            </p>

            <div className="space-y-4 relative z-10">
              <TimelineRow
                label="BEFORE"
                value={<>2,391 <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">records</span></>}
                tone="neutral"
              />
              <TimelineRow
                label="FAILURE"
                value={<>0 <span className="text-xs font-bold text-[#e21d2f] uppercase tracking-widest">records · health 0%</span></>}
                tone="danger"
              />
              <TimelineRow
                label="DIAGNOSIS"
                value={<span className="text-[13px] font-bold text-zinc-300 uppercase tracking-widest">DOM structure changed</span>}
                tone="info"
              />
              <TimelineRow
                label="REPAIR"
                value={
                  <span className="font-mono text-[11px] font-bold text-zinc-300 uppercase tracking-widest">
                    Bright Data Collector <span className="text-[#8b5cf6]">c_xxxxxxxx</span> repaired
                  </span>
                }
                tone="warn"
              />
              <TimelineRow
                label="AFTER"
                value={
                  <>
                    2,391 <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">records</span>{" "}
                    <span className="ml-3 inline-flex items-center gap-1.5 text-[11px] font-black tracking-widest text-[#22c55e]">
                      <CheckCircle2 className="h-4 w-4" /> VERIFIED
                    </span>
                  </>
                }
                tone="success"
              />
            </div>

            <div className="mt-10 flex justify-center">
              <Link
                href="/healing"
                className="inline-flex items-center gap-2 font-mono text-[11px] font-black tracking-[0.15em] text-[#e21d2f] transition-colors hover:text-white uppercase"
              >
                See it live in the dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <p className="mt-16 text-center font-mono text-[10px] font-bold uppercase tracking-[0.15em] leading-relaxed text-zinc-600">
            Built on Bright Data Scraper Studio · Next.js · Real collectors, real healing, labeled simulations.
          </p>
        </section>
      </main>
    </div>
  );
}

const TONES = {
  neutral: "border-white/10",
  danger: "border-[#e21d2f]/40 bg-[#e21d2f]/5 shadow-[inset_4px_0_0_0_#e21d2f]",
  info: "border-[#8b5cf6]/40 bg-[#8b5cf6]/5 shadow-[inset_4px_0_0_0_#8b5cf6]",
  warn: "border-[#f59e0b]/40 bg-[#f59e0b]/5 shadow-[inset_4px_0_0_0_#f59e0b]",
  success: "border-[#22c55e]/40 bg-[#22c55e]/5 shadow-[inset_4px_0_0_0_#22c55e]",
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
    <div className={cn("flex items-center justify-between border-[2px] bg-[#050505] px-5 py-4 transition-all comic-shadow", TONES[tone])}>
      <span className="font-mono text-[10px] font-black tracking-[0.2em] uppercase text-zinc-400">{label}</span>
      <span className="font-mono text-xl font-black text-white">{value}</span>
    </div>
  );
}

