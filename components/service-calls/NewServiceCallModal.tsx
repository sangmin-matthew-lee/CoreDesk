"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ServiceCall,
  WarrantyStatus,
  ServiceCallCompletion,
  ServiceCallPriority,
  Project,
} from "@/lib/types";

interface NewServiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newTicket: ServiceCall) => void;
}

interface UserOption {
  id: number;
  first_name: string;
  last_name: string;
  dept?: string;
}

export default function NewServiceCallModal({
  isOpen,
  onClose,
  onCreated,
}: NewServiceCallModalProps) {
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [ticketNumber, setTicketNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [jobSiteAddress, setJobSiteAddress] = useState("");
  const [requestDate, setRequestDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
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
  const [completionStatus, setCompletionStatus] = useState<ServiceCallCompletion>("Not yet");

  // Autocomplete from existing projects
  const [linkedProjectId, setLinkedProjectId] = useState<number | "">("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(false);

  // Keyboard accessibility: ESC to close, Enter to submit
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

  // Fetch users and projects on mount
  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data);
          const currentMng = data.find(
            (u) => u.dept === "Management" || u.dept === "Super Admin"
          );
          if (currentMng && assigneeId === "") {
            setAssigneeId(currentMng.id);
          }
        }
      })
      .catch(console.error);

    fetch("/api/projects?category=all")
      .then((r) => r.json())
      .then((data) => {
        if (data?.projects && Array.isArray(data.projects)) {
          setProjects(data.projects);
        }
      })
      .catch(console.error);

    // Fetch next ticket number
    setLoadingTicket(true);
    fetch("/api/service-calls/next-ticket")
      .then((r) => r.json())
      .then((data) => {
        if (data.ticket_number) {
          setTicketNumber(data.ticket_number);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingTicket(false));
  }, [isOpen]);

  // When a project is selected, auto-populate client and address
  const handleSelectProject = (projectIdStr: string) => {
    if (!projectIdStr) {
      setLinkedProjectId("");
      return;
    }
    const pid = Number(projectIdStr);
    setLinkedProjectId(pid);
    const proj = projects.find((p) => p.id === pid);
    if (proj) {
      if (!clientName || clientName === "New Client") {
        setClientName(proj.client_name);
      }
      if (proj.client_address && !jobSiteAddress) {
        setJobSiteAddress(proj.client_address);
      }
      // If project has key contacts, parse email/phone if possible
      if (proj.key_contacts && !clientPhone && !clientEmail) {
        try {
          const contacts = JSON.parse(proj.key_contacts);
          if (Array.isArray(contacts) && contacts.length > 0) {
            if (contacts[0].phone) setClientPhone(contacts[0].phone);
            if (contacts[0].email) setClientEmail(contacts[0].email);
          }
        } catch {
          // not json, leave as is
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/service-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_number: ticketNumber || undefined,
          client_name: clientName.trim(),
          client_phone: clientPhone.trim() || null,
          client_email: clientEmail.trim() || null,
          job_site_address: jobSiteAddress.trim() || null,
          request_date: requestDate ? requestDate.replace("T", " ") : undefined,
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
          completion_status: completionStatus,
          linked_project_id: linkedProjectId ? Number(linkedProjectId) : null,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        // Fetch created record details
        const getRes = await fetch(`/api/service-calls/${created.id}`);
        if (getRes.ok) {
          const fullTicket = await getRes.json();
          onCreated(fullTicket);
        }
        onClose();
        // Reset form
        setClientName("");
        setClientPhone("");
        setClientEmail("");
        setJobSiteAddress("");
        setDetail("");
        setMaterialsNeeded("");
        setEquipmentNeeded("");
        setTechnicianNotes("");
        setServiceTechnician("");
        setCompletionStatus("Not yet");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create service call ticket");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving service call ticket");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 via-white to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Customer Service Dispatch
              </span>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                New Service Call Ticket
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-100 text-amber-900 font-mono font-bold px-2.5 py-1 rounded-md border border-amber-200">
              {loadingTicket ? "Generating..." : ticketNumber || "sc26_001"}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Link to existing Project (Fast Auto-fill) */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5">
            <label className="block text-xs font-semibold text-indigo-900 mb-1">
              Link to Existing Project (Optional - Auto-fills Client Info)
            </label>
            <select
              value={linkedProjectId}
              onChange={(e) => handleSelectProject(e.target.value)}
              className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Select an Active Project (or enter client manually) —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.client_name} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section: Client & Job Site Details */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
              Client & Site Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Client / Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oak Valley School District"
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
                  placeholder="e.g. 1200 Campus Dr, Bldg B"
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
                  placeholder="e.g. (555) 234-5678"
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
                  placeholder="e.g. facility@district.edu"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Warranties & Urgency */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
              Warranty Coverage & Priority
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Labor Warranty */}
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

              {/* Materials Warranty */}
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

              {/* Priority */}
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

          {/* Section: Dates, Dispatch & Assignee */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
              Schedule & Dispatch Assignment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  When Requested *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

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
                  placeholder="e.g. Mike Evans (Field Electrician)"
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
            </div>
          </div>

          {/* Section: Details, Materials & Equipment */}
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Service Call Detail / Problem Description
              </label>
              <textarea
                rows={2}
                placeholder="e.g: 3 fixtures flickering in Gym B, sensor unresponsive..."
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
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
                  placeholder="e.g: 2x 40W LED driver, 4x T8 replacement tubes"
                  value={materialsNeeded}
                  onChange={(e) => setMaterialsNeeded(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Equipment Needed (Prints on Work Order)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g: 14ft ladder, voltmeter, wire strippers"
                  value={equipmentNeeded}
                  onChange={(e) => setEquipmentNeeded(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Internal / Technician Notes
              </label>
              <input
                type="text"
                placeholder="e.g: Check in with Front Desk receptionist on arrival"
                value={technicianNotes}
                onChange={(e) => setTechnicianNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Section: Initial Completion Status */}
          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Initial Status</span>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="completionStatus"
                  value="Not yet"
                  checked={completionStatus === "Not yet"}
                  onChange={() => setCompletionStatus("Not yet")}
                  className="text-amber-600 focus:ring-amber-500"
                />
                Active (Not yet)
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="completionStatus"
                  value="Complete"
                  checked={completionStatus === "Complete"}
                  onChange={() => setCompletionStatus("Complete")}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                Complete
              </label>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              ref={submitButtonRef}
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg shadow-sm hover:shadow transition-all"
            >
              {submitting ? "Creating Ticket..." : "Generate Service Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
