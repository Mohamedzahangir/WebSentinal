"use client";

import { useState } from "react";
import { formatNumber, formatCompact, timeAgo, hostnameOf } from "@/lib/utils";
import type { DashboardPayload, DemoState, DemoPhase } from "@/types";
import { Activity, GaugeCircle, HeartPulse, Radar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// Types mapping for local use
type NetworkSource = DashboardPayload["sources"][0];

const ORGANIC_POSITIONS = [
  { dx: -280, dy: -60 }, // Top Left
  { dx: 300, dy: -80 },  // Top Right
  { dx: -350, dy: 90 },  // Bottom Far Left
  { dx: 180, dy: 130 },  // Bottom Right Close
  { dx: -120, dy: 150 }, // Bottom Left Close
  { dx: 380, dy: 40 },   // Mid Right Far
  { dx: -150, dy: -120 },// Top Center Left
  { dx: 100, dy: -140 }, // Top Center Right
];

function TelemetryItem({ label, value, icon: Icon, highlight = false }: { label: string; value: string | number; icon?: any; highlight?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1")}>
      <span className="label-micro flex items-center gap-1.5 opacity-60">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      <span className={cn("font-mono text-2xl font-bold tracking-tight", highlight ? "text-cyan-400" : "text-zinc-100")}>{value}</span>
    </div>
  );
}

function getNodeState(s: NetworkSource, demo: DemoState) {
  if (demo.enabled && demo.sourceId === s.id) {
    switch (demo.phase) {
      case "failure_injected": return "failed";
      case "diagnosing": return "diagnosing";
      case "generating_repair":
      case "awaiting_approval":
      case "repairing": return "healing";
      case "verifying": return "verifying";
      case "recovered": return "recovered";
      case "rejected": return "failed";
      case "idle": return s.status;
    }
  }
  if (s.status === "failing" || s.status === "error") return "failed";
  if (s.status === "warning") return "warning";
  if (s.status === "healed") return "recovered";
  return "healthy";
}

export function SentinelNetwork({ 
  data, 
  demo
}: { 
  data: DashboardPayload;
  demo: DemoState;
}) {
  const { metrics, sources } = data;
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const router = useRouter();

  const cx = 500;
  const cy = 200;

  const nodes = sources.map((s, i) => {
    const pos = ORGANIC_POSITIONS[i % ORGANIC_POSITIONS.length];
    const x = cx + pos.dx;
    const y = cy + pos.dy;
    return { ...s, x, y, state: getNodeState(s, demo) };
  });

  const focusedNode = nodes.find(n => n.id === focusedId);
  const demoNode = demo.enabled && demo.sourceId ? nodes.find(n => n.id === demo.sourceId) : null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/[0.04] bg-[#0a0a0c] shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
      {/* Background Grid */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

      {/* Top Telemetry Overlay */}
      <div className="absolute left-6 top-6 right-6 z-10 hidden items-start justify-between pointer-events-none md:flex">
        <div className="flex gap-12">
          <TelemetryItem label="SOURCES" value={formatNumber(metrics.activeSources)} icon={Radar} />
          <div className="w-px h-10 bg-white/[0.08] mt-1" />
          <TelemetryItem label="HEALTH" value={`${metrics.healthAverage}%`} icon={GaugeCircle} highlight={metrics.healthAverage > 90} />
          <div className="w-px h-10 bg-white/[0.08] mt-1" />
          <TelemetryItem label="RECORDS" value={formatCompact(metrics.totalRecords)} icon={HeartPulse} />
          <div className="w-px h-10 bg-white/[0.08] mt-1" />
          <TelemetryItem label="SELF-HEALS" value={formatNumber(metrics.selfHeals)} icon={Activity} highlight={metrics.openIncidents > 0} />
        </div>
        <div className="flex flex-col items-end">
          <div className="font-mono text-[10px] tracking-widest text-cyan-400 uppercase">
            Sentinel Core
          </div>
          <div className="font-mono text-[9px] tracking-widest text-zinc-500 uppercase mt-1">
            Status: Online
          </div>
        </div>
      </div>

      {/* Mobile Telemetry Overlay */}
      <div className="absolute left-4 right-4 top-4 z-10 flex flex-col gap-2 md:hidden pointer-events-none">
         <div className="flex justify-between items-center bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/[0.05]">
            <span className="label-micro flex items-center gap-1.5 opacity-70"><GaugeCircle className="h-3 w-3" /> NETWORK HEALTH</span>
            <span className={cn("font-mono font-bold text-sm", metrics.healthAverage > 90 ? "text-cyan-400" : "text-white")}>{metrics.healthAverage}%</span>
         </div>
         <div className="flex justify-between items-center bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/[0.05]">
            <span className="label-micro flex items-center gap-1.5 opacity-70"><Activity className="h-3 w-3" /> SELF HEALS</span>
            <span className={cn("font-mono font-bold text-sm", metrics.openIncidents > 0 ? "text-cyan-400" : "text-white")}>{metrics.selfHeals}</span>
         </div>
      </div>


      {/* Interactive SVG Network */}
      <div className="relative w-full pb-[100%] md:pb-[40%] mt-24 md:mt-0">
        <svg 
          viewBox="0 0 1000 400" 
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>
            <filter id="blur">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* Connections */}
          {nodes.map(n => {
            const isDimmed = focusedId && focusedId !== n.id;
            const isFocused = focusedId === n.id;

            let lineClass = "stroke-white/10";
            let animClass = "";

            switch (n.state) {
              case "healthy":
              case "recovered":
                lineClass = isFocused ? "stroke-cyan-500/50" : "stroke-white/[0.15]";
                animClass = "animate-pulse-subtle";
                break;
              case "warning":
                lineClass = "stroke-amber-500/40";
                animClass = "animate-pulse-alert";
                break;
              case "failed":
                lineClass = "stroke-red-500/60";
                animClass = "animate-fracture";
                break;
              case "diagnosing":
                lineClass = "stroke-cyan-500/70";
                animClass = "animate-pulse-diagnose";
                break;
              case "healing":
                lineClass = "stroke-cyan-400";
                animClass = "animate-flow opacity-80 stroke-[1.5]";
                break;
              case "verifying":
                lineClass = "stroke-emerald-400";
                animClass = "animate-reconstruct";
                break;
            }

            return (
              <g key={`link-${n.id}`} className={cn("transition-opacity duration-500 pointer-events-none", isDimmed ? "opacity-20" : "opacity-100")}>
                {n.state === "healing" && (
                  // Healing data particles / flow
                  <line 
                    x1={cx} y1={cy} x2={n.x} y2={n.y}
                    strokeDasharray="4 8"
                    className="stroke-cyan-300 animate-flow stroke-[2.5] opacity-50"
                  />
                )}
                <line 
                  x1={cx} y1={cy} x2={n.x} y2={n.y} 
                  className={cn("transition-all duration-300 stroke-1", lineClass, animClass)}
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Central Sentinel Core */}
          <g className="core-node animate-[pulse-subtle_4s_ease-in-out_infinite] pointer-events-none">
            <circle cx={cx} cy={cy} r="60" fill="url(#core-glow)" />
            <circle cx={cx} cy={cy} r="20" className="fill-black stroke-cyan-500 stroke-[1.5]" />
            <circle cx={cx} cy={cy} r="6" className="fill-cyan-400" />
            <text x={cx} y={cy + 35} className="font-mono text-[10px] fill-cyan-400/70 uppercase tracking-widest text-anchor-middle" textAnchor="middle">
              Core
            </text>
          </g>

          {/* Nodes */}
          {nodes.map(n => {
            const isDimmed = focusedId && focusedId !== n.id;
            const isFocused = focusedId === n.id;
            
            let nodeFill = "#27272a";
            let nodeStroke = "rgba(255,255,255,0.2)";
            let glowColor = "transparent";
            let nodeAnim = "";

            switch (n.state) {
              case "healthy": 
                nodeFill = "#0a0a0c"; nodeStroke = "#10b981"; glowColor = "rgba(16,185,129,0.3)"; nodeAnim = "animate-pulse-subtle"; break;
              case "warning":
                nodeFill = "#0a0a0c"; nodeStroke = "#f59e0b"; glowColor = "rgba(245,158,11,0.3)"; nodeAnim = "animate-pulse-alert"; break;
              case "failed":
                nodeFill = "#0a0a0c"; nodeStroke = "#ef4444"; glowColor = "rgba(239,68,68,0.4)"; break;
              case "diagnosing":
                nodeFill = "#0a0a0c"; nodeStroke = "#06b6d4"; glowColor = "rgba(6,182,212,0.4)"; nodeAnim = "animate-pulse-diagnose"; break;
              case "healing":
                nodeFill = "#06b6d4"; nodeStroke = "#06b6d4"; glowColor = "rgba(6,182,212,0.6)"; nodeAnim = "animate-pulse-diagnose"; break;
              case "verifying":
              case "recovered":
                nodeFill = "#0a0a0c"; nodeStroke = "#10b981"; glowColor = "rgba(16,185,129,0.5)"; nodeAnim = "animate-reconstruct"; break;
            }

            return (
              <g 
                key={`node-${n.id}`} 
                className={cn("cursor-pointer outline-none transition-opacity duration-300", isDimmed ? "opacity-30" : "opacity-100 hover:opacity-100")}
                onClick={() => setFocusedId(isFocused ? null : n.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFocusedId(isFocused ? null : n.id);
                  }
                }}
                role="button"
                aria-label={`Source ${n.name}, status ${n.state}`}
              >
                {/* Interaction target area */}
                <circle cx={n.x} cy={n.y} r="35" fill="transparent" />
                
                {/* Glow */}
                <circle cx={n.x} cy={n.y} r="14" fill={glowColor} filter="url(#blur)" className={nodeAnim} />
                
                {/* Actual node */}
                <circle 
                  cx={n.x} cy={n.y} r={isFocused ? "7" : "5"} 
                  fill={nodeFill} 
                  stroke={nodeStroke}
                  strokeWidth="1.5"
                  className={cn("transition-all duration-300", nodeAnim, isFocused && "stroke-white stroke-2")}
                />
                
                {/* Node Label */}
                <text 
                  x={n.x} 
                  y={n.y + 24} 
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-widest text-anchor-middle transition-all duration-300",
                    isFocused ? "fill-white font-bold" : "fill-zinc-400"
                  )} 
                  textAnchor="middle"
                >
                  {n.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Demo State Overlay */}
      {demoNode && (
        <DemoSequenceOverlay demoNode={demoNode} demo={demo} />
      )}

      {/* Focus Panel (Only show if not in demo mode) */}
      {focusedNode && !demo.enabled && (
        <div className="absolute inset-x-4 bottom-4 md:inset-x-auto md:right-6 md:top-6 md:bottom-6 md:w-80 bg-black/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-5 shadow-2xl flex flex-col animate-fade-up z-20">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="label-micro text-cyan-400 mb-1">Source Focus</p>
              <h3 className="text-lg font-semibold text-white tracking-tight truncate max-w-[200px]">{focusedNode.name}</h3>
              <p className="text-[11px] text-zinc-500 mt-1 truncate max-w-[200px]">{hostnameOf(focusedNode.url)}</p>
            </div>
            <button 
              onClick={() => setFocusedId(null)}
              className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-5 flex-1">
            <div>
              <span className="label-micro block mb-1.5">Network Status</span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-block w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]",
                  focusedNode.state === "healthy" || focusedNode.state === "recovered" ? "bg-emerald-500 text-emerald-500" :
                  focusedNode.state === "warning" ? "bg-amber-500 text-amber-500" :
                  focusedNode.state === "failed" ? "bg-red-500 text-red-500" : "bg-cyan-500 text-cyan-500"
                )} />
                <span className="font-mono text-[13px] uppercase tracking-wider font-semibold text-zinc-100">
                  {focusedNode.state}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="label-micro block mb-1">Records</span>
                <span className="font-mono text-lg font-bold text-white">{formatNumber(focusedNode.recordCount)}</span>
              </div>
              <div>
                <span className="label-micro block mb-1">Health</span>
                <span className={cn("font-mono text-lg font-bold", focusedNode.healthScore > 90 ? "text-emerald-400" : focusedNode.healthScore > 60 ? "text-amber-400" : "text-red-400")}>
                  {focusedNode.healthScore}%
                </span>
              </div>
            </div>

            <div>
              <span className="label-micro block mb-1">Last Scan</span>
              <span className="text-[13px] text-zinc-300">{timeAgo(focusedNode.lastRunAt)}</span>
            </div>
          </div>

          <button 
            className="w-full py-2.5 mt-5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-white transition-all cursor-pointer"
            onClick={() => router.push(`/sources`)}
          >
            Manage Sources →
          </button>
        </div>
      )}
    </div>
  );
}

function DemoSequenceOverlay({ demoNode, demo }: { demoNode: NetworkSource & { state: string }; demo: DemoState }) {
  let title = "SYSTEM NOMINAL";
  let subtitle = "";
  let highlight = "text-emerald-400";

  switch (demo.phase) {
    case "failure_injected":
      title = "FRACTURE / CONNECTION LOST";
      subtitle = "ANOMALY DETECTED IN DATA STREAM";
      highlight = "text-red-500 animate-pulse-alert";
      break;
    case "diagnosing":
      title = "DIAGNOSING FAULT";
      subtitle = "ANALYZING TARGET DOMAIN CHANGES";
      highlight = "text-cyan-400 animate-pulse-subtle";
      break;
    case "generating_repair":
    case "awaiting_approval":
    case "repairing":
      title = "REPAIRING CONNECTION";
      subtitle = "GENERATING AND APPLYING FIX...";
      highlight = "text-cyan-400 animate-pulse-subtle";
      break;
    case "verifying":
      title = "VERIFYING DATA FLOW";
      subtitle = "TESTING EXTRACTION SCHEMA";
      highlight = "text-amber-400 animate-pulse-alert";
      break;
    case "recovered":
      title = "CONNECTION RESTORED";
      subtitle = "2,391 RECORDS RECOVERED";
      highlight = "text-emerald-400 font-bold";
      break;
  }

  return (
    <div className="absolute inset-x-4 bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-10 bg-black/90 backdrop-blur-xl border border-white/[0.06] rounded-xl px-8 py-5 shadow-2xl flex flex-col items-center animate-fade-up z-30 text-center min-w-[320px]">
      <p className="label-micro text-zinc-500 mb-2">TARGET: {demoNode.name.toUpperCase()}</p>
      <h3 className={cn("font-mono text-lg tracking-widest", highlight)}>{title}</h3>
      <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-400 mt-2">{subtitle}</p>
      
      {demo.phase === "recovered" && (
        <div className="mt-4 pt-3 border-t border-white/[0.1] w-full flex flex-col items-center gap-1.5">
           <span className="font-mono text-[10px] tracking-widest text-cyan-400">SAME COLLECTOR c_mt5ppmv528</span>
        </div>
      )}
    </div>
  );
}
