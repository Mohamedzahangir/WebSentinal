"use client";

import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint } from "@/types";
import { formatCompact } from "@/lib/utils";

export function RecordsChart({ data }: { data: ChartPoint[] }) {
  if (!data.length) return null;
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="recordsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#52525b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tick={{ fill: "#52525b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatCompact(v)}
          />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.1)" }}
            contentStyle={{
              background: "#101013",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              fontSize: 12,
              padding: "8px 10px",
            }}
            labelStyle={{ color: "#71717a", fontSize: 10, marginBottom: 2 }}
            itemStyle={{ color: "#e4e4e7" }}
          />
          <Area
            type="monotone"
            dataKey="records"
            name="Records"
            stroke="#10b981"
            strokeWidth={1.8}
            fill="url(#recordsFill)"
          />
          <Bar dataKey="incidents" name="Incidents" barSize={5} fill="#ef4444" opacity={0.75} radius={[2, 2, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
