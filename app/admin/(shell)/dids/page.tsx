import { DidManager } from "./did-manager";
import { PageHeader } from "@/components/admin-chrome";

export default function DidsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="DIDs"
        description="Add numbers, import in bulk, and see which numbers are free or on a call right now. Every call center draws from this one pool."
      />
      <DidManager />
    </div>
  );
}
