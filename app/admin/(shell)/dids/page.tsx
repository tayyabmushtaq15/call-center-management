import { DidManager } from "./did-manager";
import { PageHeader } from "@/components/admin-chrome";

export default function DidsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="DIDs"
        description="Add numbers, import in bulk, and see what is in the pool or assigned to call centers."
      />
      <DidManager />
    </div>
  );
}
