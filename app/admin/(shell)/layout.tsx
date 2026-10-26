import { AdminNav } from "@/components/AdminNav";

export const dynamic = "force-dynamic";

export default function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f4f9f5] text-slate-800 [background-image:radial-gradient(rgba(22,163,74,0.10)_1px,transparent_1px)] [background-size:22px_22px]">
      <AdminNav />
      <div className="min-h-0 flex-1 overflow-auto p-6 sm:p-8 lg:p-10">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </div>
    </div>
  );
}
