"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { Lead } from "@/lib/types";

interface DeletedLead extends Lead {
  deleted_by_name?: string | null;
  original_assigned_to_name?: string | null;
  linked_project_id?: number | null;
  linked_project_name?: string | null;
}

interface UserOption {
  id: number;
  first_name: string;
  last_name: string;
  dept: string;
}

export default function DeletedLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<DeletedLead[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<DeletedLead | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<"original" | "reassign">("original");
  const [newAssigneeId, setNewAssigneeId] = useState<number | "">("");
  const [restoring, setRestoring] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/leads/deleted");
        if (res.status === 403 || res.status === 401) {
          router.push("/sales");
          return;
        }
        const data = await res.json();
        if (!ignore) {
          setLeads(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (!ignore && Array.isArray(data)) setUsers(data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [router, refreshKey]);

  const handleOpenRestoreModal = (lead: DeletedLead) => {
    setSelectedLead(lead);
    setRestoreTarget("original");
    setNewAssigneeId(lead.original_assigned_to || lead.assigned_to || "");
  };

  const handleConfirmRestore = async () => {
    if (!selectedLead) return;
    setRestoring(true);
    try {
      const payload: { assigned_to?: number } = {};
      if (restoreTarget === "reassign" && newAssigneeId !== "") {
        payload.assigned_to = Number(newAssigneeId);
      } else if (restoreTarget === "original") {
        if (selectedLead.original_assigned_to) {
          payload.assigned_to = selectedLead.original_assigned_to;
        }
      }

      const res = await fetch(`/api/leads/${selectedLead.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setToastMessage(`Lead "${selectedLead.name}" has been restored to active pipeline.`);
        setSelectedLead(null);
        setRefreshKey((k) => k + 1);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRestoring(false);
    }
  };

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      l.name.toLowerCase().includes(q) ||
      (l.company && l.company.toLowerCase().includes(q)) ||
      (l.title && l.title.toLowerCase().includes(q)) ||
      (l.original_assigned_to_name && l.original_assigned_to_name.toLowerCase().includes(q)) ||
      (l.deleted_by_name && l.deleted_by_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-sm font-medium flex items-center justify-between shadow-xs animate-in fade-in">
          <span>✓ {toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/sales"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sales CRM
        </Link>
        <nav className="text-sm text-gray-400 flex items-center gap-1.5">
          <Link href="/sales" className="hover:text-indigo-600">Sales CRM</Link>
          <span>›</span>
          <span className="text-gray-900 font-semibold">Deleted Leads Archive</span>
        </nav>
      </div>

      {/* Header Banner */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
              Management Portal
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500 font-medium">
              {leads.length} {leads.length === 1 ? "Deleted Lead" : "Deleted Leads"}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-950 mt-1">
            Deleted Leads Archive
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Audit and recovery console for leads removed by sales accounts. All converted Project Management projects remain safely preserved. Management can inspect lead history and restore them with optional re-assignment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search deleted leads by name, company, title, or sales rep..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
        />
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center text-sm text-gray-400 flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading deleted leads...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto text-xl font-bold">
            🗑️
          </div>
          <h3 className="text-base font-bold text-gray-900">No Deleted Leads</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {search ? `No deleted leads matched "${search}".` : "There are currently no deleted leads in the system."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Lead & Contact</th>
                  <th className="px-5 py-3.5">Company / District</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">PM Project</th>
                  <th className="px-5 py-3.5">Original Rep</th>
                  <th className="px-5 py-3.5">Deleted By & Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900">
                        <Link href={`/sales/${lead.id}`} className="hover:text-indigo-600 hover:underline">
                          {lead.name}
                        </Link>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {[lead.email, lead.phone].filter(Boolean).join(" • ") || "—"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-medium text-gray-800 block">{lead.company || "—"}</span>
                      {lead.title && <span className="text-xs text-gray-400">{lead.title}</span>}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={lead.status} />
                    </td>

                    <td className="px-5 py-4">
                      {lead.linked_project_id ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-lg">
                          <span>📁</span>
                          <span className="truncate max-w-[140px]" title={lead.linked_project_name || "Project Active"}>
                            {lead.linked_project_name || `Project #${lead.linked_project_id}`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">None</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs font-medium text-gray-700">
                      {lead.original_assigned_to_name || lead.assigned_to_name || "Unassigned"}
                    </td>

                    <td className="px-5 py-4 text-xs text-gray-500">
                      <div>
                        {lead.deleted_at
                          ? new Date(lead.deleted_at).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        By: {lead.deleted_by_name || "System"}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/sales/${lead.id}`}
                          className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleOpenRestoreModal(lead)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                        >
                          Restore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restore Lead Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Restore Sales Lead
              </span>
              <h2 className="text-lg font-bold text-gray-900 mt-1">
                Restore &quot;{selectedLead.name}&quot;
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                This lead will be reactivated and returned to the live Sales CRM pipeline.
              </p>
            </div>

            {/* Restore Target Selection */}
            <div className="space-y-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-sm">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="restoreTarget"
                  checked={restoreTarget === "original"}
                  onChange={() => setRestoreTarget("original")}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-semibold text-gray-900 text-xs">
                    Restore to original sales rep
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {selectedLead.original_assigned_to_name || selectedLead.assigned_to_name
                      ? `Reassign to ${selectedLead.original_assigned_to_name || selectedLead.assigned_to_name}`
                      : "No original owner recorded"}
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-gray-200">
                <input
                  type="radio"
                  name="restoreTarget"
                  checked={restoreTarget === "reassign"}
                  onChange={() => setRestoreTarget("reassign")}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-xs">
                    Assign to a different sales rep
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 mb-2">
                    Select a team member to take ownership of this lead.
                  </div>
                  {restoreTarget === "reassign" && (
                    <select
                      value={newAssigneeId}
                      onChange={(e) => setNewAssigneeId(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">Select sales rep...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} ({u.dept})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                disabled={restoring}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoring || (restoreTarget === "reassign" && !newAssigneeId)}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                {restoring ? "Restoring..." : "Restore Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
