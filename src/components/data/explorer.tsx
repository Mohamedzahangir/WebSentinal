"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { apiGet, usePolling } from "@/lib/client";
import { cn, formatNumber } from "@/lib/utils";
import { ratingBarWidth } from "@/lib/records";

type Row = {
  key: string;
  product: string;
  price: string;
  availability: string;
  discount: string;
  rating: string;
  url: string | null;
  sourceName: string;
};

type Payload = {
  total: number;
  page: number;
  pageSize: number;
  table: Row[];
  sources: Array<{ id: string; name: string }>;
};

const COLUMNS = [
  { key: "product", label: "Product" },
  { key: "price", label: "Price" },
  { key: "availability", label: "Availability" },
  { key: "discount", label: "Discount" },
  { key: "rating", label: "Rating" },
] as const;

export function ExplorerView({ initialSource }: { initialSource?: string }) {
  const [source, setSource] = useState(initialSource ?? "all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("product");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const query = useMemo(() => {
    const sp = new URLSearchParams({
      source,
      q,
      sort,
      dir,
      page: String(page),
      pageSize: "25",
    });
    return `/api/data?${sp.toString()}`;
  }, [source, q, sort, dir, page]);

  const { data, loading } = usePolling<Payload | null>(
    () => apiGet<Payload>(query),
    source === "all" ? 8000 : 5000,
    Boolean(query),
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mx-auto max-w-6xl space-y-4 md:pt-2 md:pt-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">Data Explorer</h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            Structured extraction results across all monitored sources.
          </p>
        </div>
        {data ? (
          <span className="font-mono text-xs tabular-nums text-zinc-500">
            {formatNumber(data.total)} records
          </span>
        ) : null}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <Input
            className="pl-9"
            placeholder="Search products…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(1);
          }}
          className={cn(
            "h-9 rounded-lg border border-white/[0.09] bg-black/30 px-3 text-[13px] text-zinc-200",
            "focus:border-emerald-500/50 focus:outline-none",
          )}
        >
          <option value="all">All sources</option>
          {(data?.sources ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader title="Extracted records" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-5 py-3">
                    <button
                      onClick={() => {
                        if (sort === c.key) setDir(dir === "asc" ? "desc" : "asc");
                        else {
                          setSort(c.key);
                          setDir("asc");
                        }
                        setPage(1);
                      }}
                      className={cn(
                        "label-micro flex items-center gap-1 transition-colors hover:text-zinc-300",
                        sort === c.key && "!text-emerald-400",
                      )}
                    >
                      {c.label}
                      {sort === c.key ? (
                        dir === "asc" ? (
                          <ArrowUpAZ className="h-3 w-3" />
                        ) : (
                          <ArrowDownAZ className="h-3 w-3" />
                        )
                      ) : null}
                    </button>
                  </th>
                ))}
                <th className="label-micro px-5 py-3">Availability Trend</th>
                <th className="label-micro px-5 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.03]">
                      <td colSpan={7} className="px-5 py-3">
                        <div className="h-4 animate-pulse rounded bg-white/[0.04]" />
                      </td>
                    </tr>
                  ))
                : null}
              {(data?.table ?? []).map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-white/[0.03] transition-colors last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="max-w-[280px] truncate px-5 py-3 font-medium text-zinc-100">
                    {row.url ? (
                      <a href={row.url} target="_blank" rel="noreferrer" className="hover:text-emerald-400">
                        {row.product}
                      </a>
                    ) : (
                      row.product
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono tabular-nums text-zinc-300">{row.price}</td>
                  <td className="px-5 py-3">{availabilityChip(row.availability)}</td>
                  <td className="px-5 py-3 font-mono tabular-nums text-zinc-400">{row.discount}</td>
                  <td className="px-5 py-3 font-mono tabular-nums text-amber-300/90">{row.rating}</td>
                  <td className="w-[130px] px-5 py-3">
                    <MiniBar value={ratingBarWidth(row.rating)} />
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-500">{row.sourceName}</td>
                </tr>
              ))}
              {data && !data.table.length ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-zinc-600">
                    No records match your filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > data.pageSize ? (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
            <span className="font-mono text-xs tabular-nums text-zinc-600">
              Page {data.page} / {totalPages}
            </span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function availabilityChip(v: string) {
  if (!v || v === "—") return <span className="text-zinc-600">—</span>;
  const cls =
    v === "In Stock"
      ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.07]"
      : v === "Low Stock"
        ? "text-amber-400 border-amber-500/20 bg-amber-500/[0.07]"
        : v === "Out of Stock"
          ? "text-red-400 border-red-500/20 bg-red-500/[0.07]"
          : "text-zinc-400 border-white/10 bg-white/[0.04]";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${cls}`}>{v}</span>
  );
}

function MiniBar({ value }: { value: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-500/70 to-amber-300 transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
