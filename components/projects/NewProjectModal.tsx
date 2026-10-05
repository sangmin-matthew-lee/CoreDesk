"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ProjectCategory,
  ProjectSubStatus,
  PROJECT_CATEGORIES,
  SUB_STATUS_DETAILS,
} from "@/lib/types";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newProjectId?: number) => void;
  initialCategory?: ProjectCategory;
  initialSubStatus?: ProjectSubStatus;
}

interface UserOption {
  id: number;
  first_name: string;
  last_name: string;
  dept?: string;
}

export default function NewProjectModal({
  isOpen,
  onClose,
  onCreated,
  initialCategory = "DEVELOPMENT",
  initialSubStatus,
}: NewProjectModalProps) {
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [keyContacts, setKeyContacts] = useState("");
  const [category, setCategory] = useState<ProjectCategory>(initialCategory);
  const [subStatus, setSubStatus] = useState<ProjectSubStatus>(() => {
    const catConfig = PROJECT_CATEGORIES.find((c) => c.key === initialCategory);
    return catConfig && catConfig.subStatuses.length > 0
      ? catConfig.subStatuses[0]
      : "AUDIT_SCHEDULED";
  });
  const [projectType, setProjectType] = useState("PG&E OBF");
  const [pgeAppId, setPgeAppId] = useState("");
  const [estimatedCost, setEstimatedCost] = useState<number>();
  const [assignedPmId, setAssignedPmId] = useState<number | "">("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      const catConfig = PROJECT_CATEGORIES.find((c) => c.key === initialCategory);
      if (initialSubStatus && catConfig?.subStatuses.includes(initialSubStatus)) {
        setSubStatus(initialSubStatus);
      } else if (catConfig && catConfig.subStatuses.length > 0) {
        setSubStatus(catConfig.subStatuses[0]);
      }
      setName("");
      setClientName("");
      setClientAddress("");
      setKeyContacts("");
      setProjectType("PG&E OBF");
      setPgeAppId("");
      setEstimatedCost(undefined);
      setAssignedPmId("");
      setTargetDate("");
      setNotes("");
    }
  }, [isOpen, initialCategory, initialSubStatus]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(() => { });
  }, []);

  // Keyboard accessibility: ESC to close, Enter to submit Create Project
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Enter") {
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
  }, [isOpen, onClose]);

  const handleCategoryChange = (newCat: ProjectCategory) => {
    setCategory(newCat);
    const catConfig = PROJECT_CATEGORIES.find((c) => c.key === newCat);
    if (catConfig && catConfig.subStatuses.length > 0) {
      setSubStatus(catConfig.subStatuses[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          client_name: clientName.trim(),
          school_district_name: clientName.trim(),
          client_address: clientAddress.trim() || null,
          key_contacts: keyContacts.trim() || null,
          category,
          sub_status: subStatus,
          project_type: projectType,
          utility_provider: "PG&E",
          pge_application_id: pgeAppId.trim() || null,
          estimated_cost: Number(estimatedCost) || 0,
          assigned_pm_id: assignedPmId === "" ? null : Number(assignedPmId),
          target_completion_date: targetDate || null,
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        // Reset form
        setName("");
        setClientName("");
        setClientAddress("");
        setProjectType("PG&E OBF");
        setKeyContacts("");
        setPgeAppId("");
        setNotes("");
        onCreated(created.id);
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentCategoryConfig = PROJECT_CATEGORIES.find((c) => c.key === category);
  const availableSubStatuses = currentCategoryConfig?.subStatuses || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              New Project
            </span>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">
              Create New Project
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  if (!name || name.includes("Energy Efficiency Retrofit")) {
                    setName(`${e.target.value} - Energy Efficiency Retrofit`);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Client Address
              </label>
              <input
                type="text"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Project Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Project Type
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="PG&E OBF">PG&E OBF</option>
                <option value="Other OBF">Other OBF</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Category Stage
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as ProjectCategory)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                value={subStatus}
                onChange={(e) => setSubStatus(e.target.value as ProjectSubStatus)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {availableSubStatuses.map((sub) => (
                  <option key={sub} value={sub}>
                    {SUB_STATUS_DETAILS[sub]?.label || sub}
                  </option>
                ))}
              </select>
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
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                PG&E Application ID
              </label>
              <input
                type="text"
                value={pgeAppId}
                onChange={(e) => setPgeAppId(e.target.value)}
                placeholder="PGE-OBF-2026-XXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Assigned PM
              </label>
              <select
                value={assignedPmId}
                onChange={(e) => setAssignedPmId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Project Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Utility contact, school board timeline, site notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              ref={submitButtonRef}
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
