"use client";

import { useRouter } from "next/navigation";
import LeadForm from "@/components/LeadForm";
import { Lead } from "@/lib/types";
import Link from "next/link";

export default function NewLeadPage() {
  const router = useRouter();

  const handleSubmit = async (data: Partial<Lead>) => {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create lead");
    const lead = await res.json();
    router.push(`/sales/${lead.id}`);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <nav className="text-sm text-gray-500 mb-1">
          <Link href="/sales" className="hover:text-indigo-600">Sales CRM</Link>
          <span className="mx-2">›</span>
          <span>New Lead</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Add New Lead</h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <LeadForm submitLabel="Create Lead" onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
