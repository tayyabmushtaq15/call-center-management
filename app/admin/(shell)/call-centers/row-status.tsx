"use client";

import { useRouter } from "next/navigation";
import { StatusToggle } from "@/components/StatusToggle";

/** Active / Inactive switch for one row of the call centers list. */
export function RowStatus({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  return (
    <StatusToggle
      status={status}
      confirmOff="Its dialers will get their own caller ID back until you switch it on again."
      onToggle={async (next) => {
        const res = await fetch(`/api/admin/call-centers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        if (res.ok) router.refresh();
        return res.ok;
      }}
    />
  );
}
