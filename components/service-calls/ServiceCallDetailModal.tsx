"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ServiceCall,
  WarrantyStatus,
  ServiceCallCompletion,
  ServiceCallPriority,
} from "@/lib/types";

interface ServiceCallDetailModalProps {
  isOpen: boolean;
  ticketId: number | null;
  onClose: () => void;
  onUpdated: (updatedTicket: ServiceCall, completedTransition?: boolean) => void;
  onDeleted: (ticketId: number) => void;
  onPrintRequest: (ticket: ServiceCall) => void;
}

interface UserOption {
  id: number;
  first_name: string;
  last_name: string;
  dept?: string;
}

export default function ServiceCallDetailModal({
  isOpen,
  ticketId,
  onClose,
  onUpdated,
  onDeleted,
  onPrintRequest,
}: ServiceCallDetailModalProps) {
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  const [ticket, setTicket] = useState<ServiceCall | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editable fields
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [jobSiteAddress, setJobSiteAddress] = useState("");
  const [requestDate, setRequestDate] = useState("");
  const [appointedDate, setAppointedDate] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | "">("");
  const [serviceTechnician, setServiceTechnician] = useState("");
  const [warrantyLabor, setWarrantyLabor] = useState<WarrantyStatus>("Covered");
  const [warrantyMaterials, setWarrantyMaterials] = useState<WarrantyStatus>("Covered");
  const [priority, setPriority] = useState<ServiceCallPriority>("Normal");
  const [detail, setDetail] = useState("");
  const [materialsNeeded, setMaterialsNeeded] = useState("");
  const [equipmentNeeded, setEquipmentNeeded] = useState("");
  const [technicianNotes, setTechnicianNotes] = useState("");

  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/users")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setUsers(data);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    setShowDeleteConfirm(false);
    if (!isOpen || !ticketId) {
      setTicket(null);
      return;
    }

    setLoading(true);
    fetch(`/api/service-calls/${ticketId}`)
      .then((r) => r.json())
      .then((data: ServiceCall) => {
        setTicket(data);
        setClientName(data.client_name || "");
        setClientPhone(data.client_phone || "");
        setClientEmail(data.client_email || "");
        setJobSiteAddress(data.job_site_address || "");
        setRequestDate(data.request_date ? data.request_date.slice(0, 16) : "");
        setAppointedDate(data.appointed_date ? data.appointed_date.slice(0, 16) : "");
        setAssigneeId(data.assignee_id ?? "");
        setServiceTechnician(data.service_technician || "");
        setWarrantyLabor(data.warranty_labor || "Covered");
        setWarrantyMaterials(data.warranty_materials || "Covered");
        setPriority(data.priority || "Normal");
        setDetail(data.detail || "");
        setMaterialsNeeded(data.materials_needed || "");
        setEquipmentNeeded(data.equipment_needed || "");
        setTechnicianNotes(data.technician_notes || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, ticketId]);

  const handleClose = useCallback(() => {
    setShowDeleteConfirm(false);
    onClose();
  }, [onClose]);

  // Keyboard accessibility: ESC to close (or dismiss delete confirmation), Enter to submit Save Changes (or confirm delete)
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

  if (!isOpen || !ticketId) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Not Scheduled";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? dateStr
        : d.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
    } catch {
      return dateStr;
    }
  };

  const handleToggleCompletion = async () => {
    if (!ticket) return;
    const newStatus: ServiceCallCompletion =
      ticket.completion_status === "Complete" ? "Not yet" : "Complete";
    const isBecomingComplete = newStatus === "Complete";

    setSaving(true);
    try {
      const res = await fetch(`/api/service-calls/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTicket(updated);
        onUpdated(updated, isBecomingComplete);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !clientName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/service-calls/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName.trim(),
          client_phone: clientPhone.trim() || null,
          client_email: clientEmail.trim() || null,
          job_site_address: jobSiteAddress.trim() || null,
          request_date: requestDate ? requestDate.replace("T", " ") : ticket.request_date,
          appointed_date: appointedDate ? appointedDate.replace("T", " ") : null,
          assignee_id: assigneeId ? Number(assigneeId) : null,
          service_technician: serviceTechnician.trim() || null,
          warranty_labor: warrantyLabor,
          warranty_materials: warrantyMaterials,
          priority,
          detail: detail.trim() || null,
          materials_needed: materialsNeeded.trim() || null,
          equipment_needed: equipmentNeeded.trim() || null,
          technician_notes: technicianNotes.trim() || null,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTicket(updated);
        onUpdated(updated);
        handleClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!ticket) return;

    try {
      const res = await fetch(`/api/service-calls/${ticket.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShowDeleteConfirm(false);
        onDeleted(ticket.id);
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showDeleteConfirm) handleClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-amber-50/30">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-md">
              {ticket?.ticket_number || "Ticket"}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 leading-tight">
                  {ticket?.client_name || "Service Call"}
                </h2>
                {ticket?.completion_status === "Complete" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Completed
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                    Active / In Progress
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Requested: {formatDate(ticket?.request_date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Button for Technician */}
            {ticket && (
              <button
                type="button"
                onClick={() => onPrintRequest(ticket)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-2xs"
                title="Print Technician Work Order Sheet"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Tech Sheet
              </button>
            )}

            <button
              onClick={handleClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Body */}
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading ticket details...</div>
        ) : !ticket ? (
          <div className="p-12 text-center text-gray-400">Ticket not found</div>
        ) : (
          <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
            {/* Primary Action Banner: Quick Completion Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3 h-3 rounded-full ${
                    ticket.completion_status === "Complete" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                  }`}
                />
                <div>
                  <span className="font-semibold text-gray-900 block text-xs">
                    Status:{" "}
                    <span className={ticket.completion_status === "Complete" ? "text-emerald-700" : "text-amber-700"}>
                      {ticket.completion_status === "Complete" ? "Complete" : "Active / Pending Resolution"}
                    </span>
                  </span>
                  {ticket.completed_at && (
                    <span className="text-[11px] text-gray-500">
                      Resolved {formatDate(ticket.completed_at)}
                      {ticket.completed_by_name && ` by ${ticket.completed_by_name}`}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleCompletion}
                disabled={saving}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  ticket.completion_status === "Complete"
                    ? "bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {ticket.completion_status === "Complete" ? "Re-open (Set Not Yet)" : "Mark as Complete"}
              </button>
            </div>

            {/* Linked Project Banner */}
            {ticket.linked_project_id && (
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-500 font-medium">Linked Project: </span>
                  <span className="font-bold text-indigo-900">{ticket.linked_project_name || `#${ticket.linked_project_id}`}</span>
                </div>
                <Link
                  href={`/projects?projectId=${ticket.linked_project_id}`}
                  className="px-2.5 py-1 font-semibold text-indigo-700 bg-white border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  View Project →
                </Link>
              </div>
            )}

            {/* Section: Client & Site Information */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Client & Site Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Client / Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Job Site Address
                  </label>
                  <input
                    type="text"
                    value={jobSiteAddress}
                    onChange={(e) => setJobSiteAddress(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Client Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Client Contact Email Address
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Section: Warranties & Urgency */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Warranty Coverage & Priority
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Labor Warranty
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-lg border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setWarrantyLabor("Covered")}
                      className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        warrantyLabor === "Covered"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Covered
                    </button>
                    <button
                      type="button"
                      onClick={() => setWarrantyLabor("Non-covered")}
                      className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        warrantyLabor === "Non-covered"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Non-covered
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Materials Warranty
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-lg border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setWarrantyMaterials("Covered")}
                      className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        warrantyMaterials === "Covered"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Covered
                    </button>
                    <button
                      type="button"
                      onClick={() => setWarrantyMaterials("Non-covered")}
                      className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        warrantyMaterials === "Non-covered"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Non-covered
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Urgency / Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ServiceCallPriority)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Emergency">🚨 Emergency</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section: Schedule & Staff */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Schedule & Dispatch Assignment
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Appointed Service Call Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={appointedDate}
                    onChange={(e) => setAppointedDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Service Technician
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dave Martinez (Lead Electrician)"
                    value={serviceTechnician}
                    onChange={(e) => setServiceTechnician(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Internal Assignee (Manager)
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">— Select Staff —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.dept})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    When Requested
                  </label>
                  <input
                    type="datetime-local"
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Section: Description, Materials & Equipment */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Service Request Detail / Problem Description
                </label>
                <textarea
                  rows={3}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="e.g: 3 fixtures flickering in Gym B, sensor unresponsive..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Materials Needed (Prints on Work Order)
                  </label>
                  <textarea
                    rows={2}
                    value={materialsNeeded}
                    onChange={(e) => setMaterialsNeeded(e.target.value)}
                    placeholder="e.g: 2x 150W LED driver, 1x sensor"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Equipment Needed (Prints on Work Order)
                  </label>
                  <textarea
                    rows={2}
                    value={equipmentNeeded}
                    onChange={(e) => setEquipmentNeeded(e.target.value)}
                    placeholder="e.g: 18ft Scissor lift, multimeter"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Technician / Internal Instructions
                </label>
                <input
                  type="text"
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  placeholder="e.g: Check in with Front Desk receptionist on arrival"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
              >
                Delete Ticket
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  ref={submitButtonRef}
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
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
            <h4 className="font-bold text-gray-900">Delete Service Call?</h4>
            <p className="text-xs text-gray-600">
              Are you sure you want to delete ticket <strong>{ticket?.ticket_number}</strong>? It will be removed from active lists.
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
