import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";
import ContractDetail from "@/components/ContractDetail";
import type { Contract } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CloserContractPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole(["closer"]);
  const supabase = createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!contract) notFound();
  if (contract.closer_id !== user.id) redirect("/closer");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <DashboardShell
      user={user}
      nav={[
        { href: "/closer", label: "My Contracts" },
        { href: "/closer/new", label: "New Contract" },
      ]}
    >
      <ContractDetail
        contract={contract as Contract}
        closerName={user.name}
        signingUrl={`${appUrl}/sign/${contract.signing_token}`}
      />
    </DashboardShell>
  );
}
