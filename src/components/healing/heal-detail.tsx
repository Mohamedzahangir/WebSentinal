"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertTriangle, Activity, Database, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { SimulatedTag, StageBadge } from "@/components/ui/status";
import { apiGet, apiPost, usePolling } from "@/lib/client";
import { formatNumber, timeAgo, cn } from "@/lib/utils";
import type { Collector, HealEvent, Source, HealStage } from "@/types";

type Payload = { event: HealEvent; source: Source | null; collector: Collector | null };

export function HealDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { data, refresh } = usePolling<Payload | null>(
    () =>
      id
        ? apiGet<Payload>(`/api/healing/${id}`).catch(() => null)
        : Promise.resolve(null),
    2000,
    Boolean(id),
  );

  if (!data?.event) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardBody className="py-20 text-center text-sm text-zinc-500">
            Heal event not found.
          </CardBody>
        </Card>
      </div>
    );
  }

  const e = data.event;
  const awaiting = e.stage === "awaiting_approval";

  const decide = async (approve: boolean) => {
    await apiPost("/api/healing/approve", { eventId: e.id, approve });
    refresh();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 md:pt-2">
      <Link
        href="/healing"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-400 transition-colors hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Network
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="label-micro text-cyan-500">Self-Heal Event</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {e.sourceName}
            </h1>
            <StageBadge stage={e.stage} />
            {e.simulated && <SimulatedTag />}
          </div>
          <p className="text-[14px] text-zinc-400">
            {e.failureType.replace(/_/g, " ")} · Detected {timeAgo(e.detectedAt)}
          </p>
        </div>
      </div>

      {/* Hero Visual Transformation */}
      <div className="relative w-full rounded-2xl border border-white/[0.04] bg-[#0a0a0c] shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] p-8 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <VisualConnection stage={e.stage} sourceName={e.sourceName} />
      </div>

      {/* Dramatic Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricPanel 
          label="BEFORE"
          value={formatNumber(e.beforeCount)}
          sub="records"
          health={e.beforeHealth}
          active={true}
        />
        
        <MetricPanel 
          label="FAILURE"
          value="0"
          sub="records"
          health={0}
          active={e.stage !== "recovered"}
          isDanger
        />

        <MetricPanel 
          label="AFTER"
          value={e.afterCount != null ? formatNumber(e.afterCount) : "---"}
          sub={e.afterCount != null ? "records recovered" : "pending verification"}
          health={e.afterHealth}
          active={e.stage === "recovered"}
          isSuccess
        />
      </div>

      {/* Details & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
           <Card className="h-full bg-[#0a0a0c] border-white/[0.05]">
             <CardBody className="p-6 space-y-6">
                <div>
                  <h3 className="label-micro text-zinc-400 mb-3">DIAGNOSIS</h3>
                  <p className="text-[15px] leading-relaxed text-zinc-200">
                    {e.diagnosis ?? "Analyzing extraction telemetry…"}
                  </p>
                  {e.confidence != null && (
                     <div className="mt-4 flex items-center gap-3">
                        <span className="text-[11px] font-mono text-cyan-400">CONFIDENCE: {e.confidence}%</span>
                        <div className="h-1 flex-1 bg-white/[0.05] rounded-full overflow-hidden">
                           <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${e.confidence}%` }} />
                        </div>
                     </div>
                  )}
                </div>
                
                {e.affectedFields.length > 0 && (
                  <div>
                     <h3 className="label-micro text-zinc-400 mb-2">AFFECTED FIELDS</h3>
                     <div className="flex flex-wrap gap-2">
                       {e.affectedFields.map(f => (
                          <span key={f} className="px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[11px] uppercase tracking-wider">
                             ✗ {f}
                          </span>
                       ))}
                     </div>
                  </div>
                )}
             </CardBody>
           </Card>
        </div>

        <div className="space-y-6">
           <Card className="h-full bg-[#0a0a0c] border-white/[0.05]">
             <CardBody className="p-6 flex flex-col h-full">
                <h3 className="label-micro text-zinc-400 mb-3">REPAIR DETAILS</h3>
                
                <div className="flex-1 space-y-4">
                   <div>
                     <span className="text-[11px] text-zinc-500 block mb-1">COLLECTOR</span>
                     <div className="flex items-center gap-2 font-mono text-[13px] text-cyan-400">
                        <Radar className="w-3.5 h-3.5" />
                        {e.collectorId || (e.simulated ? "Simulated Demo Collector" : "Unknown")}
                     </div>
                   </div>

                   <div>
                     <span className="text-[11px] text-zinc-500 block mb-2">PROPOSAL</span>
                     <pre className="text-[11px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                       {e.repairPreview ?? (
                         e.stage === "generating_repair" ? "Bright Data AI generating repair..." :
                         e.stage === "repairing" ? "Applying repair to collector template..." :
                         e.stage === "verifying" ? "Verifying recovery..." : "Waiting for repair proposal..."
                       )}
                     </pre>
                   </div>
                </div>

                {awaiting && (
                  <div className="mt-6 space-y-3 pt-6 border-t border-white/[0.05]">
                    <p className="text-[13px] font-medium text-amber-400 text-center">
                      Repair proposal ready for review
                    </p>
                    <div className="flex gap-3">
                      <Button variant="danger" className="flex-1" onClick={() => decide(false)}>Reject</Button>
                      <Button variant="primary" className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]" onClick={() => decide(true)}>Approve</Button>
                    </div>
                  </div>
                )}
             </CardBody>
           </Card>
        </div>

      </div>
    </div>
  );
}

function MetricPanel({ label, value, sub, health, active, isDanger, isSuccess }: any) {
  return (
     <div className={cn(
        "p-6 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-500",
        !active && "opacity-40 grayscale",
        isDanger ? "bg-red-500/5 border-red-500/20" :
        isSuccess ? "bg-emerald-500/5 border-emerald-500/20" :
        "bg-white/[0.02] border-white/[0.05]"
     )}>
        <span className="label-micro block mb-3 text-zinc-500">{label}</span>
        <span className={cn(
           "font-mono text-4xl lg:text-5xl font-bold tracking-tighter mb-1",
           isDanger ? "text-red-400" :
           isSuccess ? "text-emerald-400" :
           "text-white"
        )}>{value}</span>
        <span className="text-[13px] text-zinc-400 mb-4">{sub}</span>
        
        <div className="w-full flex items-center justify-center gap-2">
           <Activity className={cn("w-3.5 h-3.5", isDanger ? "text-red-500" : isSuccess ? "text-emerald-500" : "text-zinc-500")} />
           <span className="font-mono text-[11px] text-zinc-400">HEALTH {health ?? 0}%</span>
        </div>
     </div>
  );
}

function VisualConnection({ stage, sourceName }: { stage: HealStage, sourceName: string }) {
  const isHealthy = stage === "recovered";
  const isFailed = stage === "detected" || stage === "failed";
  const isDiagnosing = stage === "diagnosing";
  const isHealing = stage === "generating_repair" || stage === "awaiting_approval" || stage === "repairing";
  const isVerifying = stage === "verifying";

  let lineClass = "stroke-white/20";
  let animClass = "";
  let coreColor = "#06b6d4";
  let sourceColor = "#27272a";
  let glowColor = "transparent";
  let pulseAnim = "";

  if (isHealthy) {
     lineClass = "stroke-emerald-500/50";
     animClass = "animate-pulse-subtle";
     sourceColor = "#0a0a0c";
     glowColor = "rgba(16,185,129,0.3)";
     pulseAnim = "animate-pulse-subtle";
  } else if (isFailed) {
     lineClass = "stroke-red-500/60";
     animClass = "animate-fracture stroke-[2]";
     sourceColor = "#0a0a0c";
     glowColor = "rgba(239,68,68,0.4)";
  } else if (isDiagnosing) {
     lineClass = "stroke-cyan-500/50";
     animClass = "animate-pulse-diagnose stroke-[2]";
     sourceColor = "#0a0a0c";
     glowColor = "rgba(6,182,212,0.4)";
     pulseAnim = "animate-pulse-diagnose";
  } else if (isHealing) {
     lineClass = "stroke-cyan-400";
     animClass = "animate-flow stroke-[2] opacity-80";
     sourceColor = "#06b6d4";
     glowColor = "rgba(6,182,212,0.6)";
     pulseAnim = "animate-[pulse-diagnose_0.8s_infinite]";
  } else if (isVerifying) {
     lineClass = "stroke-emerald-400";
     animClass = "animate-reconstruct stroke-[2]";
     sourceColor = "#0a0a0c";
     glowColor = "rgba(16,185,129,0.5)";
     pulseAnim = "animate-reconstruct";
  }

  return (
    <div className="relative w-full h-40 md:h-56 flex items-center justify-center">
      <svg viewBox="0 0 800 200" className="w-full h-full max-w-3xl">
        <defs>
          <radialGradient id="vcore-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={coreColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={coreColor} stopOpacity="0" />
          </radialGradient>
          <filter id="vblur">
             <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* Connection Line */}
        <g className="transition-all duration-700">
           {isHealing && (
             <line x1="150" y1="100" x2="650" y2="100" strokeDasharray="6 12" className="stroke-cyan-300 animate-flow stroke-[3] opacity-60" />
           )}
           <line x1="150" y1="100" x2="650" y2="100" className={cn("transition-all duration-500", lineClass, animClass)} strokeLinecap="round" />
        </g>

        {/* Sentinel Core */}
        <g className="animate-[pulse-subtle_4s_ease-in-out_infinite]">
          <circle cx="150" cy="100" r="70" fill="url(#vcore-glow)" />
          <circle cx="150" cy="100" r="24" className="fill-[#0a0a0c] stroke-cyan-500 stroke-[2]" />
          <circle cx="150" cy="100" r="8" className="fill-cyan-400" />
          <text x="150" y="150" className="font-mono text-[11px] fill-cyan-400/80 uppercase tracking-widest text-anchor-middle" textAnchor="middle">
            SENTINEL CORE
          </text>
        </g>

        {/* Source Node */}
        <g className="transition-all duration-500">
          <circle cx="650" cy="100" r="18" fill={glowColor} filter="url(#vblur)" className={pulseAnim} />
          <circle 
            cx="650" cy="100" r="10" 
            fill={sourceColor} 
            stroke={isFailed ? "#ef4444" : isHealthy ? "#10b981" : "#06b6d4"}
            strokeWidth="2"
            className={pulseAnim}
          />
          <text x="650" y="145" className="font-mono text-[11px] fill-white font-bold uppercase tracking-widest text-anchor-middle" textAnchor="middle">
            {sourceName}
          </text>
          
          {/* Status Text Above */}
          <text x="650" y="60" className={cn("font-mono text-[10px] uppercase tracking-wider text-anchor-middle font-bold", isFailed ? "fill-red-400" : isHealthy ? "fill-emerald-400" : "fill-cyan-400")} textAnchor="middle">
            {stage.replace(/_/g, " ")}
          </text>
        </g>
      </svg>
    </div>
  );
}
