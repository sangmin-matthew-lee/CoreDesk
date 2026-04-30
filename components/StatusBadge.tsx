import { LeadStatus } from "@/lib/types";

const config: Record<LeadStatus, { label: string; className: string }> = {
  Cold: {
    label: "Cold",
    className: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  Pos: {
    label: "Positive",
    className: "bg-green-100 text-green-700 border border-green-200",
  },
  Neg: {
    label: "Negative",
    className: "bg-red-100 text-red-700 border border-red-200",
  },
};

export default function StatusBadge({ status }: { status: LeadStatus }) {
  const { label, className } = config[status] ?? config.Cold;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}
