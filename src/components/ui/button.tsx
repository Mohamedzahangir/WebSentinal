"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

const variants = {
  primary:
    "bg-cyan-500 text-zinc-950 font-semibold hover:bg-cyan-400 active:bg-cyan-500 shadow-[0_0_0_1px_rgba(6,182,212,0.35)]",
  secondary:
    "bg-white/[0.06] text-zinc-100 hover:bg-white/[0.1] border border-white/[0.08]",
  ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]",
  danger:
    "bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20",
  outline:
    "border border-white/[0.12] text-zinc-200 hover:border-white/25 hover:bg-white/[0.04]",
};

const sizes = {
  sm: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-lg",
  lg: "h-11 px-6 text-sm gap-2 rounded-lg",
  icon: "h-8 w-8 rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50",
        "disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
