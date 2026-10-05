"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ChecklistPanel from "@/components/ChecklistPanel";
import LeadForm from "@/components/LeadForm";
import {
  Lead,
  LeadStatus,
  LeadWithChecklist,
  PROJECT_CATEGORIES,
  SUB_STATUS_DETAILS,
  ProjectCategory,
  ProjectSubStatus,
} from "@/lib/types";

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

interface LinkedProjectInfo {
  id: number;
  name: string;
  category: ProjectCategory;
  sub_status: ProjectSubStatus;
  client_name?: string;
  school_district_name?: string;
  site_name?: string | null;
  key_contacts?: string | null;
  client_address?: string | null;
  estimated_cost?: number | null;
  pge_application_id?: string | null;
  assigned_pm_id?: number | null;
  assigned_pm_name?: string | null;
  is_deleted?: number;
  deleted_at?: string | null;
  updated_at?: string | null;
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
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [salesUsers, setSalesUsers] = useState<UserOption[]>([]);
  const [converting, setConverting] = useState(false);
  const [linkedProject, setLinkedProject] = useState<LinkedProjectInfo | null>(null);
  const [syncingPm, setSyncingPm] = useState(false);

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<"original" | "reassign">("original");
  const [newAssigneeId, setNewAssigneeId] = useState<number | "">("");
  const [restoring, setRestoring] = useState(false);

  const loadLead = useCallback(async (isSilent = false) => {
    if (!isSilent) setSyncingPm(true);
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) {
        router.push("/sales");
        return;
      }
      const data = await res.json();
      setLead(data);
      if (data.linked_project) {
        setLinkedProject(data.linked_project);
      } else {
        setLinkedProject(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setSyncingPm(false);
    }
  }, [id, router]);

  const handlePromoteToProject = async () => {
    setConverting(true);
    try {
      const res = await fetch(`/api/leads/${id}/convert`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.project) {
          setLinkedProject(data.project);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConverting(false);
    }
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((user) => {
        if (user && user.userId) setCurrentUserId(user.userId);
        if (user.dept === "Management" || user.dept === "Super Admin") {
          setIsManagement(true);
          fetch("/api/users")
            .then((r) => r.json())
            .then((users) =>
              setSalesUsers((users as UserOption[]).filter((u) => u.dept === "Sales"))
            );
        }
      });
  }, []);

  useEffect(() => {
    loadLead(true);

    // Re-sync PM and lead changes automatically whenever user switches back to this window/tab
    const handleFocus = () => {
      loadLead(true);
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadLead]);

  useEffect(() => {
    if (!showDeleteConfirm && !showRestoreModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDeleteConfirm) setShowDeleteConfirm(false);
        if (showRestoreModal) setShowRestoreModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDeleteConfirm, showRestoreModal]);

  const updateStatus = async (status: LeadStatus) => {
    if (!lead) return;
    setSaving(true);
    const res = await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, status }),
    });
    if (res.ok) {
      const data = await res.json();
      setLead(data);
      if (data.linked_project) setLinkedProject(data.linked_project);
    }
    setSaving(false);
  };

  const updateChecklist = async (key: string, value: boolean) => {
    if (!lead) return;
    const newChecklist = { ...lead.checklist, [key]: value };
    setLead((prev) => prev ? { ...prev, checklist: newChecklist } : prev);
    const res = await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, checklist: newChecklist }),
    });
    if (res.ok) {
      const data = await res.json();
      setLead(data);
      if (data.linked_project) {
        setLinkedProject(data.linked_project);
      }
    }
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

  const handleRestore = async () => {
    if (!lead) return;
    setRestoring(true);
    try {
      const payload: { assigned_to?: number } = {};
      if (restoreTarget === "reassign" && newAssigneeId !== "") {
        payload.assigned_to = Number(newAssigneeId);
      } else if (restoreTarget === "original") {
        if (lead.original_assigned_to) {
          payload.assigned_to = lead.original_assigned_to;
        }
      }
      const res = await fetch(`/api/leads/${id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowRestoreModal(false);
        const refreshed = await fetch(`/api/leads/${id}`).then((r) => r.json());
        setLead(refreshed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRestoring(false);
    }
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
            {!linkedProject && lead.is_deleted !== 1 && (isManagement || (currentUserId !== null && lead.assigned_to === currentUserId)) && (
              <button
                onClick={handlePromoteToProject}
                disabled={converting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shadow-xs"
                title="Promote this qualified opportunity into an active project"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {converting ? "Promoting..." : "Promote to active project"}
              </button>
            )}
            <button
              onClick={() => setTab(tab === "edit" ? "overview" : "edit")}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {tab === "edit" ? "Cancel" : "Edit"}
            </button>
            {lead.is_deleted === 1 ? (
              isManagement && (
                <button
                  onClick={() => {
                    setRestoreTarget("original");
                    setNewAssigneeId(lead.original_assigned_to || lead.assigned_to || "");
                    setShowRestoreModal(true);
                  }}
                  className="px-3 py-1.5 border border-emerald-300 bg-emerald-50 rounded-lg text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  Restore Lead
                </button>
              )
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            )}
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
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${lead.status === opt.value
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

      {/* Soft-Deleted Alert Banner */}
      {lead.is_deleted === 1 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Archived / Deleted Lead
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Hidden from Sales Reps
                </span>
              </div>
              <p className="text-sm text-amber-900 mt-0.5">
                Deleted {lead.deleted_at ? `on ${new Date(lead.deleted_at).toLocaleString()}` : ""}{" "}
                {lead.deleted_by_name ? `by ${lead.deleted_by_name}` : ""}.
                {linkedProject && " Connected Project Management project remains active."}
              </p>
            </div>
          </div>
          {isManagement && (
            <button
              onClick={() => {
                setRestoreTarget("original");
                setNewAssigneeId(lead.original_assigned_to || lead.assigned_to || "");
                setShowRestoreModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0 shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Restore Lead to Pipeline</span>
            </button>
          )}
        </div>
      )}

      {/* Connected Project Banner */}
      {linkedProject ? (() => {
        const categoryMeta = PROJECT_CATEGORIES.find((c) => c.key === linkedProject.category);
        const categoryLabel = categoryMeta?.label || linkedProject.category;
        const subStatusDetail = linkedProject.sub_status
          ? (SUB_STATUS_DETAILS as Record<string, { label: string }>)[linkedProject.sub_status]
          : null;
        const subStatusLabel = subStatusDetail?.label || linkedProject.sub_status;

        if (linkedProject.is_deleted === 1) {
          return (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                      Project Archived / Deleted
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      PM Trash Archive
                    </span>
                    {linkedProject.deleted_at && (
                      <span className="text-xs text-rose-600">
                        Deleted {new Date(linkedProject.deleted_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-rose-950 mt-0.5 line-through opacity-75">
                    {linkedProject.name}
                  </p>
                  <p className="text-xs text-rose-700 mt-0.5">
                    This project was moved to PM Trash. It can be viewed or restored from the Deleted Projects page.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => loadLead(false)}
                  title="Check for Project Management updates"
                  disabled={syncingPm}
                  className="p-2 text-rose-700 hover:text-rose-900 hover:bg-rose-100/60 rounded-lg transition-colors border border-rose-200 bg-white"
                >
                  <svg className={`w-4 h-4 ${syncingPm ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                {isManagement && (
                  <Link
                    href="/projects/deleted"
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0 shadow-xs"
                  >
                    <span>View in PM Trash</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          );
        }

        if (linkedProject.category === "ON_HOLD") {
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                      Project On Hold / Canceled
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      {categoryLabel}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-amber-900 border border-amber-200">
                      {subStatusLabel}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-amber-950 mt-0.5">
                    {linkedProject.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-amber-800 mt-0.5">
                    {linkedProject.site_name && (
                      <span>Campus Site: <strong>{linkedProject.site_name}</strong></span>
                    )}
                    {linkedProject.assigned_pm_name && (
                      <span>Assigned PM: <strong>{linkedProject.assigned_pm_name}</strong></span>
                    )}
                    <span className="text-amber-700 italic">
                      (Operational activity paused; project record preserved for future revival)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => loadLead(false)}
                  title="Check for Project Management updates"
                  disabled={syncingPm}
                  className="p-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100/60 rounded-lg transition-colors border border-amber-200 bg-white"
                >
                  <svg className={`w-4 h-4 ${syncingPm ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                {isManagement && (
                  <Link
                    href={`/projects?category=on_hold&projectId=${linkedProject.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0 shadow-xs"
                  >
                    <span>Open in PM Module</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          );
        }

        if (linkedProject.category === "COMPLETED") {
          return (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                      Project Completed & Archived
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      {categoryLabel}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-blue-800 border border-blue-200">
                      {subStatusLabel}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-blue-950 mt-0.5">
                    {linkedProject.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-blue-700 mt-0.5">
                    {linkedProject.site_name && (
                      <span>Campus Site: <strong>{linkedProject.site_name}</strong></span>
                    )}
                    {linkedProject.assigned_pm_name && (
                      <span>Assigned PM: <strong>{linkedProject.assigned_pm_name}</strong></span>
                    )}
                    {typeof linkedProject.estimated_cost === "number" && linkedProject.estimated_cost > 0 && (
                      <span>Total Executed Value: <strong>${linkedProject.estimated_cost.toLocaleString()}</strong></span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => loadLead(false)}
                  title="Check for Project Management updates"
                  disabled={syncingPm}
                  className="p-2 text-blue-700 hover:text-blue-900 hover:bg-blue-100/60 rounded-lg transition-colors border border-blue-200 bg-white"
                >
                  <svg className={`w-4 h-4 ${syncingPm ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                {isManagement && (
                  <Link
                    href={`/projects?category=completed&projectId=${linkedProject.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0 shadow-xs"
                  >
                    <span>Open in PM Module</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          );
        }

        return (
          /* ACTIVE LIFECYCLE STAGE BANNER */
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Project Management Connected
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {categoryLabel}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-gray-700 border border-emerald-200 shadow-2xs">
                    {subStatusLabel}
                  </span>
                </div>
                <p className="text-sm font-semibold text-emerald-950 mt-0.5">
                  {linkedProject.name}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-emerald-700 mt-0.5">
                  {linkedProject.site_name && (
                    <span>Campus Site: <strong>{linkedProject.site_name}</strong></span>
                  )}
                  {linkedProject.assigned_pm_name && (
                    <span>PM: <strong>{linkedProject.assigned_pm_name}</strong></span>
                  )}
                  {typeof linkedProject.estimated_cost === "number" && linkedProject.estimated_cost > 0 && (
                    <span>Value: <strong>${linkedProject.estimated_cost.toLocaleString()}</strong></span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => loadLead(false)}
                title="Check for Project Management updates"
                disabled={syncingPm}
                className="p-2 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/60 rounded-lg transition-colors border border-emerald-200 bg-white"
              >
                <svg className={`w-4 h-4 ${syncingPm ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              {isManagement && (
                <Link
                  href={`/projects?category=${linkedProject.category.toLowerCase()}&projectId=${linkedProject.id}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0 shadow-xs"
                >
                  <span>Open in PM Module</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        );
      })() : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 px-4 text-xs text-gray-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            💡 <strong>Qualified PM Integration:</strong> Projects are automatically created when the opportunity reaches <strong>Audit Scheduled</strong>, or click <strong>&quot;Promote to active project&quot;</strong> above.
          </span>
          {isManagement || (currentUserId !== null && lead.assigned_to === currentUserId) ? (
            <button
              onClick={handlePromoteToProject}
              disabled={converting}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline shrink-0 text-left"
            >
              {converting ? "Promoting..." : "Promote to active project now →"}
            </button>
          ) : (
            <span className="text-xs text-gray-400 italic">
              Assigned representatives can promote once qualified.
            </span>
          )}
        </div>
      )}

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
              <InfoRow label="Number of Sites" value={lead.number_of_sites !== null && lead.number_of_sites !== undefined ? lead.number_of_sites.toString() : null} />
              {isManagement && (
                <InfoRow label="Assigned To" value={lead.assigned_to_name || "Unassigned"} />
              )}
            </dl>
            {lead.sites && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sites & Costs</p>
                <div className="space-y-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  {(() => {
                    try {
                      let parsed = typeof lead.sites === "string" ? JSON.parse(lead.sites) : lead.sites;
                      while (typeof parsed === "string") {
                        parsed = JSON.parse(parsed);
                      }
                      if (!Array.isArray(parsed)) return <p className="text-xs text-gray-400 italic">No sites listed</p>;
                      const list = parsed as { name: string; cost: number }[];
                      if (list.length === 0) return <p className="text-xs text-gray-400 italic">No sites listed</p>;
                      return (
                        <>
                          {list.map((site, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                              <span className="text-gray-700 font-medium">
                                <span className="text-gray-400 font-semibold mr-1">{i + 1}.</span> {site.name}
                              </span>
                              <span className="text-gray-600 font-mono font-semibold">${site.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center text-xs font-bold pt-1.5 border-t border-dashed border-gray-200">
                            <span className="text-gray-800">Total Cost ({list.length} sites)</span>
                            <span className="text-indigo-600 font-bold">${list.reduce((sum, s) => sum + s.cost, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      );
                    } catch {
                      return <p className="text-xs text-red-500 italic">Invalid site data</p>;
                    }
                  })()}
                </div>
              </div>
            )}
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
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteConfirm(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Delete Lead?</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong>{lead.name}</strong>?
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 space-y-1">
              <p>• The lead will be removed from pipeline.</p>
              {linkedProject && (
                <p className={linkedProject.is_deleted === 1 ? "text-rose-700 font-medium" : "text-emerald-700 font-medium"}>
                  • {linkedProject.is_deleted === 1
                    ? "Connected Project Management project is currently archived in PM trash."
                    : "Connected Project Management project will remain active in PM."}
                </p>
              )}
            </div>
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
                {deleting ? "Deleting..." : "Delete Lead"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestoreModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRestoreModal(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900">Restore Lead to Pipeline</h3>
              </div>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="text-sm text-gray-600">
              Restoring <strong className="text-gray-900">{lead.name}</strong> will return it to active Sales CRM pipelines.
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block">
                Assignment Option
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="restoreTarget"
                  checked={restoreTarget === "original"}
                  onChange={() => setRestoreTarget("original")}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-gray-900 block">
                    Restore to Original Lead Owner
                  </span>
                  <span className="text-gray-500">
                    {lead.original_assigned_to_name
                      ? `Assign back to ${lead.original_assigned_to_name}`
                      : lead.assigned_to_name
                        ? `Assign back to ${lead.assigned_to_name}`
                        : "Lead was unassigned"}
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="restoreTarget"
                  checked={restoreTarget === "reassign"}
                  onChange={() => setRestoreTarget("reassign")}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs flex-1">
                  <span className="font-semibold text-gray-900 block mb-1.5">
                    Reassign to Another Sales Rep
                  </span>
                  {restoreTarget === "reassign" && (
                    <select
                      value={newAssigneeId}
                      onChange={(e) => setNewAssigneeId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">-- Select Sales Representative --</option>
                      {salesUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} ({u.dept})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestore}
                disabled={restoring || (restoreTarget === "reassign" && newAssigneeId === "")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
              >
                {restoring ? "Restoring..." : "Confirm & Restore Lead"}
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
