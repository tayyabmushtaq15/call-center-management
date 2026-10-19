import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CreateCallCenterModal } from "./create-call-center-modal";
import { PageHeader } from "@/components/admin-chrome";

export default async function CallCentersPage() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const users = await prisma.user.findMany({
    orderBy: { id: "desc" },
    include: {
      _count: { select: { allowedIps: true } },
    },
  });
  const calls = await prisma.callLog.groupBy({
    by: ["userId"],
    where: { startedAt: { gte: start } },
    _count: { _all: true },
  });
  const cm = new Map(calls.map((c) => [c.userId, c._count._all]));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Call centers"
        description="Each call center has its own API key and whitelisted dialer IPs, and dials from the shared DID pool."
      >
        <CreateCallCenterModal />
      </PageHeader>
      <div className="overflow-hidden rounded-2xl border border-slate-600/40 bg-slate-800/50 shadow-lg ring-1 ring-slate-700/30">
        <div className="border-b border-slate-600/50 bg-slate-800/30 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-100">All call centers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-800/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Allowed IPs</th>
                <th className="px-4 py-3">Calls today</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-700/50">
                <td className="px-4 py-3 font-medium text-slate-200">{u.name}</td>
                <td className="px-4 py-3 text-slate-300">{u.email}</td>
                <td className="px-4 py-3 tabular-nums text-slate-200">{u._count.allowedIps}</td>
                <td className="px-4 py-3 tabular-nums text-slate-200">{cm.get(u.id) ?? 0}</td>
                <td className="px-4 py-3 text-slate-200">{u.status}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/call-centers/${u.id}`}
                    className="text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
