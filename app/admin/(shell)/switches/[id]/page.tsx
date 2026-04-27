import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin-chrome";
import Link from "next/link";

export default async function SwitchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sw = await prisma.switch.findUnique({
    where: { id: Number(id) },
    include: { users: true },
  });
  if (!sw) notFound();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const logsToday = await prisma.callLog.count({
    where: { switchId: sw.id, startedAt: { gte: start } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={sw.name}
        description={`${sw.switchType} · ${sw.switchUrl}:${sw.switchPort} · ${sw.status}`}
      />
      <div className="rounded-2xl border border-slate-600/40 bg-gradient-to-br from-slate-800/60 to-slate-900/40 p-5 shadow-lg ring-1 ring-slate-700/30">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Calls today</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">{logsToday}</div>
      </div>
      <p className="text-xs text-slate-500">
        Webhook header{" "}
        <code className="rounded-md border border-slate-600/50 bg-slate-900/50 px-1.5 py-0.5 font-mono text-slate-200">
          X-Webhook-Secret
        </code>{" "}
        — secret is only echoed at create in dev; store it securely in production.
      </p>
      <div className="overflow-hidden rounded-2xl border border-slate-600/40 bg-slate-800/50 shadow-lg ring-1 ring-slate-700/30">
        <div className="border-b border-slate-600/50 bg-slate-800/30 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Assigned call centers</h2>
        </div>
        <ul className="divide-y divide-slate-700/50 text-sm">
          {sw.users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <span className="text-slate-200">
                {u.name} <span className="text-slate-500">({u.email})</span>
              </span>
              <Link
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
                href={`/admin/call-centers/${u.id}`}
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
        {sw.users.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No call centers use this switch yet.</p>
        ) : null}
      </div>
    </div>
  );
}
