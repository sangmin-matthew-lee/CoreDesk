"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Project,
  ProjectCategory,
  ProjectSubStatus,
  PROJECT_CATEGORIES,
  SUB_STATUS_DETAILS,
} from "@/lib/types";

interface ProjectDetailModalProps {
  projectId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

interface UserOption {
  id: number;
  first_name: string;
  last_name: string;
  dept?: string;
}

export default function ProjectDetailModal({
  projectId,
  isOpen,
  onClose,
  onUpdated,
}: ProjectDetailModalProps) {
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const [project, setProject] = useState<
    (Project & {
      lead_name?: string;
      lead_company?: string;
      lead_email?: string;
      lead_phone?: string;
    }) | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [siteName, setSiteName] = useState("");
  const [keyContacts, setKeyContacts] = useState("");
  const [category, setCategory] = useState<ProjectCategory>("DEVELOPMENT");
  const [subStatus, setSubStatus] = useState<ProjectSubStatus>("AUDIT_SCHEDULED");
  const [projectType, setProjectType] = useState("PG&E OBF");
  const [pgeAppId, setPgeAppId] = useState("");
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [assignedPmId, setAssignedPmId] = useState<number | "">("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [currentUser, setCurrentUser] = useState<{ id: number; dept: string } | null>(null);
  const isManagement = currentUser?.dept === "Management" || currentUser?.dept === "Super Admin";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.dept) setCurrentUser(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setShowDeleteConfirm(false);
    if (!projectId || !isOpen) return;
    let ignore = false;
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          setProject(data);
          setName(data.name || "");
          setClientName(data.school_district_name || data.client_name || "");
          setClientAddress(data.client_address || "");
          setSiteName(data.site_name || "");
          const rawContacts = data.key_contacts;
          let parsedContacts = "";
          if (typeof rawContacts === "string") {
            try {
              const parsed = JSON.parse(rawContacts);
              if (Array.isArray(parsed)) {
                parsedContacts = parsed
                  .map((c: { name?: string; role?: string; email?: string; phone?: string; office_address?: string }) =>
                    [
                      c.name,
                      c.role ? `(${c.role})` : "",
                      c.email,
                      c.phone,
                      c.office_address,
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  )
                  .join("\n");
              } else {
                parsedContacts = rawContacts;
              }
            } catch {
              parsedContacts = rawContacts;
            }
          } else if (Array.isArray(rawContacts)) {
            parsedContacts = (rawContacts as Array<{ name?: string; role?: string; email?: string; phone?: string; office_address?: string }>)
              .map((c) =>
                [
                  c.name,
                  c.role ? `(${c.role})` : "",
                  c.email,
                  c.phone,
                  c.office_address,
                ]
                  .filter(Boolean)
                  .join(" • ")
              )
              .join("\n");
          }
          setKeyContacts(parsedContacts || "");
          const loadedCat = (data.category as ProjectCategory) || "DEVELOPMENT";
          setCategory(loadedCat);
          const catConfig = PROJECT_CATEGORIES.find((c) => c.key === loadedCat);
          if (data.sub_status && catConfig?.subStatuses.includes(data.sub_status)) {
            setSubStatus(data.sub_status);
          } else if (catConfig && catConfig.subStatuses.length > 0) {
            setSubStatus(catConfig.subStatuses[0]);
          } else {
            setSubStatus("AUDIT_SCHEDULED");
          }
          const validTypes = ["PG&E OBF", "Other OBF", "Cash"];
          const loadedType = data.project_type && validTypes.includes(data.project_type)
            ? data.project_type
            : "PG&E OBF";
          setProjectType(loadedType);
          setPgeAppId(data.pge_application_id || "");
          setEstimatedCost(data.estimated_cost || 0);
          setAssignedPmId(data.assigned_pm_id ?? "");
          setTargetDate(data.target_completion_date || "");
          setNotes(data.notes || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchDetails();
    return () => {
      ignore = true;
    };
  }, [projectId, isOpen]);

  // When category changes, auto-select the first sub-status for that category
  const handleCategoryChange = (newCat: ProjectCategory) => {
    if (!isManagement) return;
    setCategory(newCat);
    const catConfig = PROJECT_CATEGORIES.find((c) => c.key === newCat);
    if (catConfig && catConfig.subStatuses.length > 0) {
      setSubStatus(catConfig.subStatuses[0]);
    }
  };

  const handleClose = useCallback(() => {
    setShowDeleteConfirm(false);
    onClose();
  }, [onClose]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !isManagement) return;

    setSaving(true);
    try {
      const catConfig = PROJECT_CATEGORIES.find((c) => c.key === category);
      const validSubStatus = catConfig?.subStatuses.includes(subStatus)
        ? subStatus
        : (catConfig && catConfig.subStatuses.length > 0 ? catConfig.subStatuses[0] : subStatus);

      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          client_name: clientName,
          school_district_name: clientName,
          client_address: clientAddress.trim() || null,
          site_name: siteName.trim() || null,
          key_contacts: keyContacts.trim() || null,
          category,
          sub_status: validSubStatus,
          project_type: projectType,
          pge_application_id: pgeAppId.trim() || null,
          estimated_cost: Number(estimatedCost) || 0,
          assigned_pm_id: assignedPmId === "" ? null : Number(assignedPmId),
          target_completion_date: targetDate || null,
          notes,
        }),
      });

      if (res.ok) {
        setShowDeleteConfirm(false);
        onUpdated();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(async () => {
    if (!projectId || !isManagement) return;
    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      setShowDeleteConfirm(false);
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      setShowDeleteConfirm(false);
    }
  }, [projectId, isManagement, onUpdated, onClose]);

  // Keyboard accessibility: ESC to close (or dismiss delete confirmation), Enter to submit Save Project (or confirm delete)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          handleClose();
        }
        return;
      }

      if (e.key === "Enter") {
        if (showDeleteConfirm) {
          e.preventDefault();
          deleteButtonRef.current?.click();
          return;
        }

        const isTextarea = document.activeElement instanceof HTMLTextAreaElement;
        if (isTextarea && !e.ctrlKey && !e.metaKey) {
          return;
        }

        if (
          document.activeElement instanceof HTMLButtonElement &&
          document.activeElement.type !== "submit"
        ) {
          return;
        }

        e.preventDefault();
        submitButtonRef.current?.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showDeleteConfirm, handleClose]);

  if (!isOpen) return null;

  const currentCategoryConfig = PROJECT_CATEGORIES.find((c) => c.key === category);
  const availableSubStatuses = currentCategoryConfig?.subStatuses || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showDeleteConfirm) handleClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-start justify-between bg-gray-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Project Details
              </span>
              {!isManagement && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  View Only (1099 Sales Contractor)
                </span>
              )}
              {project?.lead_id && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                  </svg>
                  Sales CRM Connected
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              {loading ? "Loading project..." : name || "Project Overview"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="p-12 flex items-center justify-center text-sm text-gray-500">
            Loading project information...
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
            {/* Connected Sales Lead Banner */}
            {(project?.source_crm_deal_id || project?.lead_id) && (
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-indigo-950">
                    Linked Sales CRM Deal #{project.source_crm_deal_id || project.lead_id}: {project.lead_name} {project.lead_company ? `(${project.lead_company})` : ""}
                  </p>
                </div>
                <Link
                  href={`/sales/${project.source_crm_deal_id || project.lead_id}`}
                  className="px-3 py-1 text-xs font-semibold text-indigo-700 bg-white border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors shrink-0"
                >
                  View CRM Deal →
                </Link>
              </div>
            )}

            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isManagement}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100/70 disabled:text-gray-700 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Client Address
                </label>
                <input
                  type="text"
                  disabled={!isManagement}
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100/70 disabled:text-gray-700 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isManagement}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100/70 disabled:text-gray-700 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Project Type
                </label>
                <select
                  disabled={!isManagement}
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100/70 disabled:text-gray-700 disabled:cursor-not-allowed"
                >
                  <option value="PG&E OBF">PG&E OBF</option>
                  <option value="Other OBF">Other OBF</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            {/* Lifecycle Stage Controls */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Lifecycle & Stage Controls
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Category Stage
                  </label>
                  <select
                    disabled={!isManagement}
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as ProjectCategory)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100/70 disabled:text-gray-700 disabled:cursor-not-allowed"
                  >
                    {PROJECT_CATEGORIES.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Sub-Status
                  </label>
                  <select
                    disabled={!isManagement}
                    value={subStatus}
                    onChange={(e) => setSubStatus(e.target.value as ProjectSubStatus)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100/70 disabled:text-gray-700 disabled:cursor-not-allowed"
                  >
                    {availableSubStatuses.map((sub) => {
                      const details = SUB_STATUS_DETAILS[sub];
                      return (
                        <option key={sub} value={sub}>
                          {details?.label || sub}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Estimated Project Cost ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  disabled={!isManagement}
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100/70 disabled:text-gray-700 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  PG&E Application ID
                </label>
                <input
                  type="text"
                  disabled={!isManagement}
                  value={pgeAppId}
                  onChange={(e) => setPgeAppId(e.target.value)}
                  placeholder="PGE-OBF-2026-XXXX"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100/70 disabled:text-gray-700 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assigned PM
                </label>
                <select
                  disabled={!isManagement}
                  value={assignedPmId}
                  onChange={(e) => setAssignedPmId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100/70 disabled:text-gray-700 disabled:cursor-not-allowed"
                >
                  <option value="">Select PM...</option>
                  {users
                    .filter((u) => u.dept === "Management" || u.dept === "Super Admin")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.dept})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Completion Date
                </label>
                <input
                  type="date"
                  disabled={!isManagement}
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100/70 disabled:text-gray-700 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Key Contacts
              </label>
              <textarea
                rows={2}
                disabled={!isManagement}
                value={keyContacts}
                onChange={(e) => setKeyContacts(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100/70 disabled:text-gray-700 disabled:cursor-not-allowed"
                placeholder="Stakeholder names, titles, emails, phones..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Project Notes
              </label>
              <textarea
                rows={3}
                disabled={!isManagement}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Utility contact, school board timeline, site notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100/70 disabled:text-gray-700 disabled:cursor-not-allowed"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
              {isManagement ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                >
                  Delete Project
                </button>
              ) : (
                <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-medium">
                  🔒 View-only mode for 1099 Sales Contractor
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {isManagement ? "Cancel" : "Close"}
                </button>
                {isManagement && (
                  <button
                    ref={submitButtonRef}
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {saving ? "Saving Changes..." : "Save Project"}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteConfirm(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full space-y-3">
            <h4 className="font-bold text-gray-900">Delete Project?</h4>
            <p className="text-xs text-gray-600">
              Are you sure you want to delete <strong>{name}</strong>? It will be removed from active pipelines and moved to <strong>Deleted Projects</strong>, where it can be reviewed and restored by Management.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                ref={deleteButtonRef}
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
