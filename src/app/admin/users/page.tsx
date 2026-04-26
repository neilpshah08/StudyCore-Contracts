import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";
import { formatDate } from "@/lib/format";
import CreateCloserForm from "./CreateCloserForm";
import ToggleActiveButton from "./ToggleActiveButton";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await requireRole(["admin"]);
  const supabase = createClient();
  const { data: closers } = await supabase
    .from("users")
    .select("id,email,name,role,active,created_at")
    .eq("role", "closer")
    .order("created_at", { ascending: false });

  return (
    <DashboardShell
      user={user}
      nav={[
        { href: "/admin", label: "Contracts" },
        { href: "/admin/users", label: "Closers" },
      ]}
    >
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Closers</h1>
      <p className="mb-6 text-sm text-slate-500">
        Create new closer accounts and activate or deactivate existing ones.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <div className="card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Create closer
            </h2>
            <CreateCloserForm />
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(closers ?? []).map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.email}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          c.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ToggleActiveButton id={c.id} active={c.active} />
                    </td>
                  </tr>
                ))}
                {(!closers || closers.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      No closers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
