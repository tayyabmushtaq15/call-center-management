import { AdminNav } from "@/components/AdminNav";

export const dynamic = "force-dynamic";

export default function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-dot-grid flex min-h-screen text-slate-200">
      <AdminNav />
      <div className="min-h-0 flex-1 overflow-auto p-6 sm:p-8 lg:p-10">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </div>
    </div>
  );
}
