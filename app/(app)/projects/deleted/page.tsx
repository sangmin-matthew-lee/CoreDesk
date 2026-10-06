"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeletedProject, PROJECT_CATEGORIES, SUB_STATUS_DETAILS } from "@/lib/types";

export default function DeletedProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<DeletedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<DeletedProject | null>(null);
  const [projectToPurge, setProjectToPurge] = useState<DeletedProject | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [purging, setPurging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/projects/deleted");
        if (res.status === 403 || res.status === 401) {
          router.push("/projects");
          return;
        }
        const data = await res.json();
        if (!ignore) {
          setProjects(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Failed to load deleted projects:", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [router, refreshKey]);

  // Handle ESC key to dismiss modals
  useEffect(() => {
    if (!selectedProject && !projectToPurge) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedProject(null);
        setProjectToPurge(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedProject, projectToPurge]);

  const handleConfirmRestore = async () => {
    if (!selectedProject) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/restore`, {
        method: "POST",
      });

      if (res.ok) {
        setToastMessage(`Project "${selectedProject.name}" has been restored to active pipelines.`);
        setSelectedProject(null);
        setRefreshKey((k) => k + 1);
        setTimeout(() => setToastMessage(null), 4500);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to restore project");
      }
    } catch (e) {
      console.error(e);
      alert("Error restoring project");
    } finally {
      setRestoring(false);
    }
  };

  const handleConfirmPurge = async () => {
    if (!projectToPurge) return;
    setPurging(true);
    try {
      const res = await fetch(`/api/projects/deleted?id=${projectToPurge.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setToastMessage(`Project "${projectToPurge.name}" has been permanently purged.`);
        setProjectToPurge(null);
        setRefreshKey((k) => k + 1);
        setTimeout(() => setToastMessage(null), 4500);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to purge project");
      }
    } catch (e) {
      console.error(e);
      alert("Error purging project");
    } finally {
      setPurging(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.client_name?.toLowerCase().includes(q) ||
      p.school_district_name?.toLowerCase().includes(q) ||
      p.pge_application_id?.toLowerCase().includes(q) ||
      p.deleted_by_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-white/80 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/projects"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Active Projects
              </Link>
              <span className="text-gray-300">•</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                Management Trash Archive
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-950 tracking-tight">
              Deleted Projects Management
            </h1>
            <p className="text-xs text-gray-500 mt-1 max-w-2xl">
              Inspect soft-deleted school district energy retrofit projects, audit who deleted them and when, and restore them back to their exact previous lifecycle stages.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">
              {projects.length} {projects.length === 1 ? "Deleted Project" : "Deleted Projects"}
            </span>
          </div>
        </div>

        {/* Search Row */}
        <div className="mt-5 pt-4 border-t border-gray-100">
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
              placeholder="Search by school district, project title, or PG&E application #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Projects Table */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center text-sm text-gray-400 flex flex-col items-center justify-center gap-2 shadow-xs">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading deleted projects archive...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto text-2xl font-bold">
            🗑️
          </div>
          <h3 className="text-base font-bold text-gray-900">No Deleted Projects</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {search
              ? `No deleted projects matched your search "${search}".`
              : "The deleted projects trash is clean. Any projects removed by team members will appear here for audit and restoration."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">School District / Project</th>
                  <th className="px-5 py-3.5">Stage When Deleted</th>
                  <th className="px-5 py-3.5">OBF Value</th>
                  <th className="px-5 py-3.5">Assigned PM</th>
                  <th className="px-5 py-3.5">Deleted By & Date</th>
                  <th className="px-5 py-3.5">Linked CRM Deal</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProjects.map((p) => {
                  const catConfig = PROJECT_CATEGORIES.find((c) => c.key === p.category);
                  const subDetail = SUB_STATUS_DETAILS[p.sub_status];
                  const formattedDate = p.deleted_at
                    ? new Date(p.deleted_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Unknown date";

                  return (
                    <tr key={p.id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900">{p.client_name || p.school_district_name}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{p.name}</div>
                        {p.site_name && (
                          <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                            <span>🏫</span> {p.site_name}
                          </div>
                        )}
                        {p.pge_application_id && (
                          <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                            ID: {p.pge_application_id}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {catConfig?.label || p.category}
                          </span>
                          <div className="text-xs text-gray-600 font-medium">
                            {subDetail?.label || p.sub_status}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-xs font-semibold text-gray-900">
                        ${(p.estimated_cost || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      <td className="px-5 py-4 text-xs text-gray-600">
                        {p.assigned_pm_name || <span className="text-gray-400 italic">Unassigned</span>}
                      </td>

                      <td className="px-5 py-4 text-xs">
                        <div className="font-medium text-gray-800">
                          {p.deleted_by_name || "Management Account"}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{formattedDate}</div>
                      </td>

                      <td className="px-5 py-4 text-xs">
                        {p.source_crm_deal_id || p.lead_id ? (
                          <Link
                            href={`/sales/${p.source_crm_deal_id || p.lead_id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            <span>CRM Deal #{p.source_crm_deal_id || p.lead_id}</span>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedProject(p)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors inline-flex items-center gap-1"
                            title="Restore project to active pipeline"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Restore
                          </button>

                          <button
                            onClick={() => setProjectToPurge(p)}
                            className="p-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                            title="Permanently Purge"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {selectedProject && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProject(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4 border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900">Restore Project to Active Pipeline</h3>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="text-sm text-gray-600">
              Are you sure you want to restore <strong className="text-gray-900">{selectedProject.name}</strong>?
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5 text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-400">School District:</span>
                <span className="font-semibold text-gray-800">{selectedProject.client_name || selectedProject.school_district_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Restored Stage:</span>
                <span className="font-semibold text-indigo-700">
                  {PROJECT_CATEGORIES.find((c) => c.key === selectedProject.category)?.label || selectedProject.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Restored Sub-Status:</span>
                <span className="font-semibold text-gray-800">
                  {SUB_STATUS_DETAILS[selectedProject.sub_status]?.label || selectedProject.sub_status}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoring}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {restoring ? "Restoring..." : "Confirm Restore"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Purge Confirmation Modal */}
      {projectToPurge && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProjectToPurge(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Permanently Delete?</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              Are you sure you want to permanently remove <strong>{projectToPurge.name}</strong> from the database?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProjectToPurge(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPurge}
                disabled={purging}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {purging ? "Purging..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
