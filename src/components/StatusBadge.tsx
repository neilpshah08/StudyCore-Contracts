import type { ContractStatus } from "@/lib/types";

const styles: Record<ContractStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-50 text-blue-700",
  viewed: "bg-amber-50 text-amber-700",
  signed: "bg-purple-50 text-purple-700",
  completed: "bg-emerald-50 text-emerald-700",
};

export default function StatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span className={`badge capitalize ${styles[status]}`}>{status}</span>
  );
}
