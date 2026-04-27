import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createCallCenterAction } from "./actions";
import { PageHeader, cardClass, inputClass, PrimaryButton } from "@/components/admin-chrome";

export default async function CallCentersPage() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const users = await prisma.user.findMany({
    orderBy: { id: "desc" },
    include: {
      switch: { select: { name: true } },
      _count: { select: { dids: true } },
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
        description="Each tenant has its own API key, switch assignment, and per-state DID allocation."
      />
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
                <th className="px-4 py-3">Switch</th>
                <th className="px-4 py-3">DIDs</th>
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
                <td className="px-4 py-3 text-slate-200">{u.switch?.name ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-slate-200">{u._count.dids}</td>
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
      <CreateCallCenterForm />
    </div>
  );
}

function CreateCallCenterForm() {
  return (
    <form
      action={createCallCenterAction}
      className={`max-w-md space-y-3 p-5 ${cardClass}`}
    >
      <h2 className="text-sm font-semibold text-slate-100">New call center</h2>
      <p className="text-xs text-slate-400">An API key is created automatically. Open the detail page to view or rotate it.</p>
      <input
        name="name"
        required
        placeholder="Company name"
        className={inputClass}
      />
      <input
        name="email"
        required
        type="email"
        placeholder="Email"
        className={inputClass}
      />
      <input
        name="password"
        type="password"
        placeholder="Password (optional)"
        className={inputClass}
        autoComplete="new-password"
      />
      <PrimaryButton type="submit" className="w-full sm:w-auto">
        Create
      </PrimaryButton>
    </form>
  );
}
