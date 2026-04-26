import { requireRole } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";
import NewContractForm from "./NewContractForm";

export const dynamic = "force-dynamic";

export default async function NewContractPage() {
  const user = await requireRole(["closer"]);
  return (
    <DashboardShell
      user={user}
      nav={[
        { href: "/closer", label: "My Contracts" },
        { href: "/closer/new", label: "New Contract" },
      ]}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Contract</h1>
        <p className="text-sm text-slate-500">
          Fill in the details below. The parent will receive a secure signing link by email.
        </p>
      </div>
      <NewContractForm closerName={user.name} />
    </DashboardShell>
  );
}
