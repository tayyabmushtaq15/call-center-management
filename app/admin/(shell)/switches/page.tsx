import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createSwitchAction } from "./actions";
import { PageHeader, cardClass, inputClass, PrimaryButton } from "@/components/admin-chrome";

export default async function SwitchesPage() {
  const switches = await prisma.switch.findMany({
    orderBy: { id: "desc" },
    include: { _count: { select: { users: true } } },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Switches"
        description="Switches connect call traffic to this app. A switch can be shared by more than one call center."
      />
      <div className="overflow-hidden rounded-2xl border border-slate-600/40 bg-slate-800/50 shadow-lg ring-1 ring-slate-700/30">
        <div className="border-b border-slate-600/50 bg-slate-800/30 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-100">All switches</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-800/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Port</th>
                <th className="px-4 py-3">Call centers</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
            {switches.map((s) => (
              <tr key={s.id} className="border-t border-slate-700/50">
                <td className="px-4 py-3 font-medium text-slate-200">{s.name}</td>
                <td className="px-4 py-3 text-slate-200">{s.switchType}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-300">{s.switchUrl}</td>
                <td className="px-4 py-3 tabular-nums text-slate-200">{s.switchPort}</td>
                <td className="px-4 py-3 tabular-nums text-slate-200">{s._count.users}</td>
                <td className="px-4 py-3 text-slate-200">{s.status}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/switches/${s.id}`}
                    className="text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>

      <form action={createSwitchAction} className={`max-w-lg space-y-3 p-5 ${cardClass}`}>
        <h2 className="text-sm font-semibold text-slate-100">Add switch</h2>
        <input name="name" required placeholder="Name" className={inputClass} />
        <input
          name="switchType"
          required
          placeholder="Asterisk / FreeSWITCH / Other"
          className={inputClass}
        />
        <input name="switchUrl" required placeholder="Host or URL" className={inputClass} />
        <input
          name="switchPort"
          required
          type="number"
          placeholder="Port"
          className={inputClass}
        />
        <input name="authToken" required placeholder="Auth token" className={inputClass} />
        <PrimaryButton type="submit" className="w-full sm:w-auto">
          Create (webhook secret: check dev server logs on create)
        </PrimaryButton>
      </form>
    </div>
  );
}
