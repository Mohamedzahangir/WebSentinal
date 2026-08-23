import { ExplorerView } from "@/components/data/explorer";

export const metadata = { title: "Data Explorer · WebSentinel" };

export default async function DataPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const sp = await searchParams;
  const source = typeof sp.source === "string" ? sp.source : undefined;
  return <ExplorerView initialSource={source} />;
}
