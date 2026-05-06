"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ChecklistPanel from "@/components/ChecklistPanel";
import LeadForm from "@/components/LeadForm";
import { Lead, LeadStatus, LeadWithChecklist } from "@/lib/types";

type Tab = "overview" | "edit";

const STATUS_OPTIONS: { value: LeadStatus; label: string; desc: string }[] = [
  { value: "Cold", label: "Cold", desc: "Cold calling" },
  { value: "Positive", label: "Positive", desc: "Interested" },
  { value: "Negative", label: "Negative", desc: "Not interested" },
  { value: "Closed", label: "Closed", desc: "Deal closed" },
];

interface UserOption {
  id: number;
  first_name: string;
  last_name: string;
  dept: string;
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<LeadWithChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isManagement, setIsManagement] = useState(false);
  const [salesUsers, setSalesUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((user) => {
        if (user.dept === "Management") {
          setIsManagement(true);
          fetch("/api/users")
            .then((r) => r.json())
            .then((users) =>
              setSalesUsers((users as UserOption[]).filter((u) => u.dept === "Sales"))
            );
        }
      });
  }, []);

  const fetchLead = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) { router.push("/sales"); return; }
      setLead(await res.json());
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  const updateStatus = async (status: LeadStatus) => {
    if (!lead) return;
    setSaving(true);
    const res = await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, status }),
    });
    if (res.ok) setLead(await res.json());
    setSaving(false);
  };

  const updateChecklist = async (key: string, value: boolean) => {
    if (!lead) return;
    const newChecklist = { ...lead.checklist, [key]: value };
    setLead((prev) => prev ? { ...prev, checklist: newChecklist } : prev);
    await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, checklist: newChecklist }),
    });
  };

  const handleEdit = async (data: Partial<Lead>) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, checklist: lead?.checklist }),
    });
    if (!res.ok) throw new Error("Failed to update");
    setLead(await res.json());
    setTab("overview");
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    router.push("/sales");
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading...</div>;
  }
  if (!lead) return null;

  const completedCount = Object.values(lead.checklist).filter(Boolean).length;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link
          href="/sales"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <nav className="text-sm text-gray-400 flex items-center gap-1.5">
          <Link href="/sales" className="hover:text-indigo-600">Sales CRM</Link>
          <span>›</span>
          <span className="text-gray-700 font-medium">{lead.name}</span>
        </nav>
      </div>

      {/* Top status card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {[lead.title, lead.company].filter(Boolean).join(" @ ")}
            </p>
            {lead.assigned_to_name && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Assigned to {lead.assigned_to_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab(tab === "edit" ? "overview" : "edit")}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {tab === "edit" ? "Cancel" : "Edit"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</span>
            <div className="flex gap-1">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  disabled={saving}
                  onClick={() => updateStatus(opt.value)}
                  title={opt.desc}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                    lead.status === opt.value
                      ? opt.value === "Cold"
                        ? "bg-blue-600 text-white border-blue-600"
                        : opt.value === "Positive"
                        ? "bg-green-600 text-white border-green-600"
                        : opt.value === "Negative"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-gray-600 text-white border-gray-600"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Pipeline:</span>
            <span className="font-semibold text-indigo-600">{completedCount}/16</span>
            <div className="w-32 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all"
                style={{ width: `${(completedCount / 16) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {tab === "overview" ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact Info</h2>
            <dl className="space-y-3">
              <InfoRow label="Email" value={lead.email} href={`mailto:${lead.email}`} />
              <InfoRow label="Phone" value={lead.phone} href={`tel:${lead.phone}`} />
              <InfoRow label="Company" value={lead.company} />
              <InfoRow label="Title" value={lead.title} />
              <InfoRow label="Office" value={lead.office_address} />
              <InfoRow
                label="Last Contact"
                value={lead.last_contact_date ? new Date(lead.last_contact_date).toLocaleDateString() : null}
              />
              {isManagement && (
                <InfoRow label="Assigned To" value={lead.assigned_to_name || "Unassigned"} />
              )}
            </dl>
            {lead.notes && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Pipeline Checklist</h2>
            <ChecklistPanel checklist={lead.checklist} onChange={updateChecklist} />
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Edit Lead</h2>
          <LeadForm
            initial={lead}
            onSubmit={handleEdit}
            onCancel={() => setTab("overview")}
            submitLabel="Save Changes"
            isManagement={isManagement}
            salesUsers={salesUsers}
          />
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Delete Lead?</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong>{lead.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">{label}</dt>
      <dd className="text-sm text-gray-900 break-all">
        {href ? <a href={href} className="text-indigo-600 hover:underline">{value}</a> : value}
      </dd>
    </div>
  );
}
