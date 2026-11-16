import { SavedInvestigationsView } from "@/components/investigation/saved-investigations-view";

export default async function InvestigationsPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <SavedInvestigationsView initialDemo={mode === "demo"} />;
}
