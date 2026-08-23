"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Database,
  LayoutDashboard,
  Menu,
  Radar,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoBadge } from "@/components/ui/status";
import type { DemoState } from "@/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sources", label: "Sources", icon: Radar },
  { href: "/healing", label: "Self-Heal", icon: ShieldCheck, badgeKey: "incidents" },
  { href: "/data", label: "Data Explorer", icon: Database },
] as const;

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [demo, setDemo] = useState<DemoState | null>(null);
  const [openIncidents, setOpenIncidents] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        const body = await res.json();
        if (!cancelled && body?.ok) {
          setDemo(body.data.demo);
          setOpenIncidents(body.data.metrics.openIncidents ?? 0);
        }
      } catch {
        /* sidebar badge is non-critical */
      }
    };
    void load();
    const t = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [pathname]);

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-white/[0.06] bg-zinc-950/80 backdrop-blur md:flex">
        <Logo />
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={pathname === item.href || pathname.startsWith(item.href + "/")}
              incidents={openIncidents}
            />
          ))}
        </nav>
        <SidebarFooter />
      </aside>

      {/* Mobile topbar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.06] bg-zinc-950/90 px-4 backdrop-blur md:hidden">
        <Link href="/" className="font-mono text-sm font-bold tracking-[0.18em] text-zinc-100">
          WEB<span className="text-emerald-400">SENTINEL</span>
        </Link>
        <div className="flex items-center gap-2">
          {demo?.enabled ? <DemoBadge small /> : null}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-2 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-30 bg-black/60 pt-14 backdrop-blur-sm md:hidden" onClick={() => setMenuOpen(false)}>
          <nav
            className="space-y-1 border-b border-white/[0.06] bg-zinc-950 p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={pathname === item.href || pathname.startsWith(item.href + "/")}
                incidents={openIncidents}
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
            <SidebarFooter stacked />
          </nav>
        </div>
      ) : null}

      <main className="min-w-0 flex-1 px-4 pb-16 pt-20 md:pl-[248px] md:pr-8 md:pt-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badgeKey,
  incidents,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  badgeKey?: string;
  incidents?: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-white/[0.07] text-zinc-100"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 transition-colors",
          active ? "text-emerald-400" : "text-zinc-600 group-hover:text-zinc-400",
        )}
      />
      {label}
      {badgeKey === "incidents" && (incidents ?? 0) > 0 ? (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/15 px-1.5 text-[10px] font-semibold text-red-400">
          {incidents}
        </span>
      ) : null}
    </Link>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-[18px]">
      <span className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
        <Radar className="h-3.5 w-3.5 text-emerald-400" />
      </span>
      <span className="font-mono text-[13px] font-bold tracking-[0.18em] text-zinc-100">
        WEB<span className="text-emerald-400">SENTINEL</span>
      </span>
    </Link>
  );
}

function SidebarFooter({ stacked }: { stacked?: boolean }) {
  return (
    <div className={cn("border-t border-white/[0.06] p-4", stacked && "w-full")}>
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
        <Activity className="h-3.5 w-3.5 text-emerald-500" />
        <p className="text-[11px] leading-tight text-zinc-500">
          Bright Data CLI connected
        </p>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        {subtitle ? <p className="mt-1 text-[13px] text-zinc-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
