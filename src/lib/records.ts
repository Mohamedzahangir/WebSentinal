import type { ProductRecord } from "@/types";

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
};

/** Flatten any value into a displayable scalar. */
function scalarize(v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t || t === "[object Object]") return null;
    const word = t.toLowerCase();
    return WORD_NUMBERS[word] ?? (t as string);
  }
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") {
    // Bright Data often returns structured money like {value, currency, symbol}.
    const obj = v as Record<string, unknown>;
    for (const key of ["value", "amount", "price", "text", "raw"]) {
      if (obj[key] !== undefined && obj[key] !== null) {
        const inner = scalarize(obj[key]);
        if (inner !== null) return inner;
      }
    }
    return null;
  }
  return String(v);
}

export interface DisplayRecord {
  product: string;
  price: string;
  availability: string;
  discount: string;
  rating: string;
  url: string | null;
  sourceName?: string;
}

/** Turn an arbitrary extracted record into clean explorer-table fields. */
export function displayRecord(
  raw: ProductRecord,
  sourceName?: string,
): DisplayRecord {
  const product = String(
    raw.product ?? raw.title ?? raw.name ?? "(untitled)",
  );

  let price = "—";
  const priceVal = scalarize(raw.price);
  if (typeof priceVal === "number") price = `$${priceVal.toFixed(2)}`;
  else if (typeof priceVal === "string" && priceVal) {
    const symbol =
      typeof raw.price === "object" && raw.price !== null
        ? String((raw.price as Record<string, unknown>).symbol ?? "")
        : "";
    price = symbol && !priceVal.includes(symbol)
      ? `${symbol}${priceVal}`
      : priceVal;
  }

  let rating = "—";
  const ratingVal = scalarize(raw.rating);
  if (ratingVal !== null) {
    rating =
      typeof ratingVal === "number"
        ? `${ratingVal} / 5`
        : /\d/.test(ratingVal)
          ? ratingVal
          : `${ratingVal} / 5`;
  }

  const discountRaw = scalarize(raw.discount);
  const discount =
    discountRaw === null
      ? "—"
      : /^\d+(\.\d+)?$/.test(String(discountRaw))
        ? `${discountRaw}%`
        : String(discountRaw);

  const availability = scalarize(raw.availability) ?? "—";
  const url =
    [raw.url, (raw as ProductRecord).url, (raw as Record<string, unknown>)["product_page_url"]]
      .map((u) => (typeof u === "string" ? u : null))
      .find(Boolean) ?? null;

  return {
    product,
    price,
    availability: String(availability),
    discount,
    rating,
    url,
    sourceName,
  };
}

/** Rating as a 0-100 bar width when parseable. */
export function ratingBarWidth(rating: string): number {
  const n = parseFloat(rating);
  if (!Number.isFinite(n)) return 0;
  const perFive = rating.includes("/5") ? n : Math.min(5, n);
  return Math.min(100, (perFive / 5) * 100);
}
