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
  { dx: -220, dy: -80, textY: 28 },   // Top Left
  { dx: 260, dy: -100, textY: 28 },   // Top Right
  { dx: -240, dy: 100, textY: 28 },   // Bottom Far Left
  { dx: 180, dy: 120, textY: 28 },    // Bottom Right Close
  { dx: -120, dy: 150, textY: 28 },   // Bottom Left Close
  { dx: 300, dy: 30, textY: 28 },     // Mid Right Far
  { dx: -80, dy: -140, textY: -20 },  // Top Center Left (label above to avoid core)
  { dx: 120, dy: -130, textY: -20 },  // Top Center Right (label above)
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
    return { ...s, x, y, textY: pos.textY, state: getNodeState(s, demo) };
  });

  const focusedNode = nodes.find(n => n.id === focusedId);
  const demoNode = demo.enabled && demo.sourceId ? nodes.find(n => n.id === demo.sourceId) : null;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#0A0A0A] comic-panel">
      {/* Background Grid */}
      <div className="absolute inset-0 halftone-bg opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80 pointer-events-none" />

      {/* Top Telemetry Overlay */}
      <div className="absolute left-6 md:left-[280px] top-6 z-10 hidden items-start pointer-events-none md:flex">
        <div className="flex gap-8 bg-[#050505]/90 border-[2px] border-[#e21d2f]/20 p-4 comic-shadow backdrop-blur">
          <TelemetryItem label="SOURCES" value={formatNumber(metrics.activeSources)} icon={Radar} />
          <div className="w-[2px] h-10 bg-white/10 mt-1" />
          <TelemetryItem label="HEALTH" value={`${metrics.healthAverage}%`} icon={GaugeCircle} highlight={metrics.healthAverage > 90} />
          <div className="w-[2px] h-10 bg-white/10 mt-1" />
          <TelemetryItem label="RECORDS" value={formatCompact(metrics.totalRecords)} icon={HeartPulse} />
          <div className="w-[2px] h-10 bg-white/10 mt-1" />
          <TelemetryItem label="SELF-HEALS" value={formatNumber(metrics.selfHeals)} icon={Activity} highlight={metrics.openIncidents > 0} />
        </div>
      </div>

      {/* Mobile Telemetry Overlay */}
      <div className="absolute left-4 right-4 top-20 z-10 flex flex-col gap-2 md:hidden pointer-events-none">
         <div className="flex justify-between items-center bg-black/80 px-4 py-2 border-[2px] border-[#e21d2f]/30 comic-shadow">
            <span className="label-micro flex items-center gap-1.5 opacity-70"><GaugeCircle className="h-3 w-3" /> NETWORK HEALTH</span>
            <span className={cn("font-mono font-bold text-sm", metrics.healthAverage > 90 ? "text-[#e21d2f]" : "text-white")}>{metrics.healthAverage}%</span>
         </div>
         <div className="flex justify-between items-center bg-black/80 px-4 py-2 border-[2px] border-[#e21d2f]/30 comic-shadow">
            <span className="label-micro flex items-center gap-1.5 opacity-70"><Activity className="h-3 w-3" /> SELF HEALS</span>
            <span className={cn("font-mono font-bold text-sm", metrics.openIncidents > 0 ? "text-[#e21d2f]" : "text-white")}>{metrics.selfHeals}</span>
         </div>
      </div>

      {/* Interactive SVG Network */}
      <div className="absolute inset-0">
        <svg 
          viewBox="0 0 1000 400" 
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="core-glow-healthy" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="core-glow-failed" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e21d2f" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#e21d2f" stopOpacity="0" />
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
                lineClass = isFocused ? "stroke-[#22c55e]/50" : "stroke-white/[0.15]";
                animClass = "animate-pulse-subtle";
                break;
              case "warning":
                lineClass = "stroke-[#f59e0b]/40";
                animClass = "animate-pulse-alert";
                break;
              case "failed":
                lineClass = "stroke-[#e21d2f]/80 stroke-[2]";
                animClass = "animate-fracture";
                break;
              case "diagnosing":
                lineClass = "stroke-[#8b5cf6]/80 stroke-[2]";
                animClass = "animate-pulse-diagnose";
                break;
              case "healing":
                lineClass = "stroke-[#8b5cf6]";
                animClass = "animate-flow opacity-80 stroke-[2]";
                break;
              case "verifying":
                lineClass = "stroke-[#22c55e]";
                animClass = "animate-reconstruct";
                break;
            }

            return (
              <g key={`link-${n.id}`} className={cn("transition-opacity duration-500 pointer-events-none", isDimmed ? "opacity-20" : "opacity-100")}>
                {n.state === "healing" && (
                  // Healing data particles / flow with red/purple energy
                  <>
                    <line 
                      x1={cx} y1={cy} x2={n.x} y2={n.y}
                      strokeDasharray="15 30"
                      className="stroke-[#e21d2f] animate-flow stroke-[3] opacity-80"
                      strokeLinecap="round"
                    />
                    <line 
                      x1={cx} y1={cy} x2={n.x} y2={n.y}
                      strokeDasharray="5 20"
                      className="stroke-[#8b5cf6] animate-flow stroke-[4] opacity-90"
                      strokeDashoffset="10"
                      strokeLinecap="round"
                    />
                  </>
                )}
                <line 
                  x1={cx} y1={cy} x2={n.x} y2={n.y} 
                  className={cn("transition-all duration-300 stroke-1", lineClass, animClass)}
                  strokeLinecap="round"
                />
                {n.state === "failed" && (
                  <text x={(cx + n.x) / 2} y={(cy + n.y) / 2} className="fill-[#ef233c] font-mono text-[16px] animate-glitch" textAnchor="middle" dominantBaseline="central">
                    ╳
                  </text>
                )}
              </g>
            );
          })}

          {/* Central Sentinel Core */}
          <g className="core-node animate-[pulse-subtle_4s_ease-in-out_infinite] pointer-events-none">
            {/* Outer Pulse Ring */}
            <circle cx={cx} cy={cy} r="90" fill={demo.enabled && demo.phase !== 'recovered' && demo.phase !== 'idle' ? "url(#core-glow-failed)" : "url(#core-glow-healthy)"} />
            {/* Inner Web Ring */}
            <circle cx={cx} cy={cy} r="40" className="fill-transparent stroke-white/20 stroke-[1] stroke-dasharray-[4_4]" />
            <circle cx={cx} cy={cy} r="45" className="fill-transparent stroke-white/10 stroke-[2] stroke-dasharray-[2_10]" />
            {/* Central Energy Point */}
            <circle cx={cx} cy={cy} r="18" className={cn("fill-[#050505] stroke-[3]", demo.enabled && demo.phase !== 'recovered' && demo.phase !== 'idle' ? "stroke-[#e21d2f]" : "stroke-[#8b5cf6]")} />
            <circle cx={cx} cy={cy} r="6" className={demo.enabled && demo.phase !== 'recovered' && demo.phase !== 'idle' ? "fill-[#e21d2f]" : "fill-[#22d3ee]"} />
            
            <g className="comic-offset-text">
              <text x={cx} y={cy + 65} className="font-mono text-[12px] fill-white uppercase tracking-[0.3em] font-bold text-anchor-middle" textAnchor="middle">
                SENTINEL
              </text>
              <text x={cx} y={cy + 80} className={cn("font-mono text-[10px] uppercase tracking-widest text-anchor-middle", demo.enabled && demo.phase !== 'recovered' && demo.phase !== 'idle' ? "fill-[#e21d2f]" : "fill-[#22d3ee]")} textAnchor="middle">
                CORE
              </text>
            </g>
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
                nodeFill = "#050505"; nodeStroke = "#22c55e"; glowColor = "rgba(34,197,94,0.3)"; nodeAnim = "animate-pulse-subtle"; break;
              case "warning":
                nodeFill = "#050505"; nodeStroke = "#f59e0b"; glowColor = "rgba(245,158,11,0.3)"; nodeAnim = "animate-pulse-alert"; break;
              case "failed":
                nodeFill = "#050505"; nodeStroke = "#e21d2f"; glowColor = "rgba(226,29,47,0.6)"; nodeAnim = "animate-glitch"; break;
              case "diagnosing":
                nodeFill = "#050505"; nodeStroke = "#8b5cf6"; glowColor = "rgba(139,92,246,0.6)"; nodeAnim = "animate-pulse-diagnose"; break;
              case "healing":
                nodeFill = "#8b5cf6"; nodeStroke = "#8b5cf6"; glowColor = "rgba(139,92,246,0.8)"; nodeAnim = "animate-pulse-diagnose"; break;
              case "verifying":
              case "recovered":
                nodeFill = "#050505"; nodeStroke = "#22c55e"; glowColor = "rgba(34,197,94,0.5)"; nodeAnim = "animate-reconstruct"; break;
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
                <circle cx={n.x} cy={n.y} r="16" fill={glowColor} filter="url(#blur)" className={nodeAnim} />
                
                {/* Actual node */}
                <polygon 
                  points={`${n.x},${n.y - 8} ${n.x + 8},${n.y} ${n.x},${n.y + 8} ${n.x - 8},${n.y}`}
                  fill={nodeFill} 
                  stroke={nodeStroke}
                  strokeWidth="2"
                  className={cn("transition-all duration-300", nodeAnim, isFocused && "stroke-white stroke-[3]")}
                />
                
                {/* Node Label */}
                <g className={isFocused ? "comic-offset-text" : ""}>
                  <text 
                    x={n.x} 
                    y={n.y + (n.textY || 28)} 
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-[0.15em] text-anchor-middle transition-all duration-300",
                      isFocused ? "fill-white font-bold" : "fill-zinc-400"
                    )} 
                    textAnchor="middle"
                  >
                    {n.name}
                  </text>
                </g>
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
        <div className="absolute inset-x-4 bottom-4 md:inset-x-auto md:right-10 md:top-10 md:bottom-auto md:w-80 bg-[#050505]/95 backdrop-blur-md border-[2px] border-[#e21d2f]/50 p-6 comic-shadow flex flex-col animate-fade-up z-20 pointer-events-auto comic-panel">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="font-mono text-[10px] tracking-widest uppercase text-[#8b5cf6] mb-1 font-bold">╔ Source Focus ╗</p>
              <h3 className="text-xl font-black text-white tracking-tight uppercase truncate max-w-[200px] comic-offset-text">{focusedNode.name}</h3>
              <p className="text-[11px] text-zinc-500 mt-1 truncate max-w-[200px]">{hostnameOf(focusedNode.url)}</p>
            </div>
            <button 
              onClick={() => setFocusedId(null)}
              className="p-1.5 hover:bg-[#e21d2f]/20 text-zinc-400 hover:text-white transition-colors"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6 flex-1">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 block mb-1.5">Network Status</span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-block w-2.5 h-2.5",
                  focusedNode.state === "healthy" || focusedNode.state === "recovered" ? "bg-[#22c55e]" :
                  focusedNode.state === "warning" ? "bg-[#f59e0b]" :
                  focusedNode.state === "failed" ? "bg-[#e21d2f]" : "bg-[#8b5cf6]"
                )} />
                <span className={cn(
                  "font-mono text-[13px] uppercase tracking-wider font-bold",
                  focusedNode.state === "healthy" || focusedNode.state === "recovered" ? "text-[#22c55e]" :
                  focusedNode.state === "warning" ? "text-[#f59e0b]" :
                  focusedNode.state === "failed" ? "text-[#e21d2f]" : "text-[#8b5cf6]"
                )}>
                  {focusedNode.state}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 block mb-1">Records</span>
                <span className="font-mono text-xl font-black text-white">{formatNumber(focusedNode.recordCount)}</span>
              </div>
              <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 block mb-1">Health</span>
                <span className={cn("font-mono text-xl font-black", focusedNode.healthScore > 90 ? "text-[#22c55e]" : focusedNode.healthScore > 60 ? "text-[#f59e0b]" : "text-[#e21d2f]")}>
                  {focusedNode.healthScore}%
                </span>
              </div>
            </div>

            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 block mb-1">Last Scan</span>
              <span className="text-[13px] text-zinc-300 font-mono uppercase">{timeAgo(focusedNode.lastRunAt)}</span>
            </div>
          </div>

          <button 
            className="w-full py-3 mt-8 bg-[#050505] hover:bg-[#e21d2f] border-[2px] border-[#e21d2f] text-[11px] font-black tracking-widest uppercase text-[#e21d2f] hover:text-white transition-all cursor-pointer comic-shadow"
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
  let highlight = "text-[#22c55e]";

  switch (demo.phase) {
    case "failure_injected":
      title = "FRACTURE / CONNECTION LOST";
      subtitle = "SPIDER-SENSE DETECTED: ANOMALY IN DATA STREAM";
      highlight = "text-[#e21d2f] animate-glitch";
      break;
    case "diagnosing":
      title = "DIAGNOSING FAULT";
      subtitle = "ANALYZING TARGET DOMAIN CHANGES";
      highlight = "text-[#8b5cf6] animate-pulse-subtle";
      break;
    case "generating_repair":
    case "awaiting_approval":
    case "repairing":
      title = "REPAIRING CONNECTION";
      subtitle = "GENERATING AND APPLYING FIX...";
      highlight = "text-[#8b5cf6] animate-pulse-subtle";
      break;
    case "verifying":
      title = "VERIFYING DATA FLOW";
      subtitle = "TESTING EXTRACTION SCHEMA";
      highlight = "text-[#f59e0b] animate-pulse-alert";
      break;
    case "recovered":
      title = "CONNECTION RESTORED";
      subtitle = "2,391 RECORDS RECOVERED";
      highlight = "text-[#22c55e] font-bold";
      break;
  }

  return (
    <div className={cn(
      "fixed inset-0 pointer-events-none z-30 transition-all duration-300",
      demo.phase === "failure_injected" ? "animate-spider-sense" : ""
    )}>
      <div className="absolute right-6 bottom-6 md:right-10 md:bottom-10 bg-[#050505]/95 border-[2px] border-[#e21d2f]/40 p-8 comic-shadow flex flex-col items-center animate-fade-up text-center min-w-[380px] comic-panel comic-offset pointer-events-auto">
        <p className="font-mono text-[10px] tracking-widest text-[#8b5cf6] mb-3 font-bold uppercase">TARGET: {demoNode.name}</p>
        <h3 className={cn("font-mono text-2xl font-black tracking-widest uppercase", highlight)}>{title}</h3>
        <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-300 mt-2 font-bold">{subtitle}</p>
        
        {demo.phase === "recovered" && (
          <div className="mt-6 pt-4 border-t-2 border-white/[0.1] w-full flex flex-col items-center gap-1.5">
             <span className="font-mono text-[10px] tracking-widest text-[#8b5cf6] font-bold">SAME COLLECTOR c_mt5ppmv528</span>
          </div>
        )}
      </div>
    </div>
  );
}
