import { DidManager } from "./did-manager";
import { PageHeader } from "@/components/admin-chrome";

export default async function DidsPage({
  searchParams,
}: {
  searchParams: Promise<{ stateId?: string; free?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="space-y-6">
      <PageHeader
        title="DIDs"
        description="Add numbers, import in bulk, and see which numbers are free or on a call right now. Every call center draws from this one pool, matched by area code, and a number is never on two calls at once."
      />
      <DidManager initialStateId={sp.stateId ?? ""} initialFree={sp.free === "1"} />
    </div>
  );
}
