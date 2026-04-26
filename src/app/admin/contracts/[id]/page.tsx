import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";
import ContractDetail from "@/components/ContractDetail";
import type { Contract } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminContractPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole(["admin"]);
  const supabase = createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!contract) notFound();

  const { data: closer } = await supabase
    .from("users")
    .select("name")
    .eq("id", contract.closer_id)
    .single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <DashboardShell
      user={user}
      nav={[
        { href: "/admin", label: "Contracts" },
        { href: "/admin/users", label: "Closers" },
      ]}
    >
      <ContractDetail
        contract={contract as Contract}
        closerName={closer?.name ?? "—"}
        signingUrl={`${appUrl}/sign/${contract.signing_token}`}
      />
    </DashboardShell>
  );
}
