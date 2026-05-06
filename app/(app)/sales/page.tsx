"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { Lead, LeadStatus, CHECKLIST_ITEMS } from "@/lib/types";

type SearchField = "name" | "company" | "title" | "assigned_to_name";

const BASE_SEARCH_FIELDS: { value: SearchField; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "company", label: "Company" },
  { value: "title", label: "Title" },
];

const MGMT_SEARCH_FIELD: { value: SearchField; label: string } = {
  value: "assigned_to_name",
  label: "SR",
};

const STATUS_FILTERS: { value: LeadStatus | "All"; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Cold", label: "Cold" },
  { value: "Positive", label: "Positive" },
  { value: "Negative", label: "Negative" },
  { value: "Closed", label: "Closed" },
];

const CHECKLIST_TOTAL = CHECKLIST_ITEMS.length;

function getStageLabel(key: string | null | undefined): string {
  if (!key) return "Not started";
  const item = CHECKLIST_ITEMS.find((i) => i.key === key);
  return item ? item.label : "Not started";
}

export default function SalesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [exporting, setExporting] = useState(false);
  const [isManagement, setIsManagement] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((u) => setIsManagement(u.dept === "Management"));
  }, []);

  const searchFields = isManagement
    ? [...BASE_SEARCH_FIELDS, MGMT_SEARCH_FIELD]
    : BASE_SEARCH_FIELDS;

  const filtered = leads.filter((l) => {
    const matchStatus = statusFilter === "All" || l.status === statusFilter;
    const q = search.toLowerCase().trim();
    if (!q) return matchStatus;
    const fieldValue = (l[searchField] as string | undefined)?.toLowerCase() ?? "";
    return matchStatus && fieldValue.includes(q);
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales CRM</h1>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} total leads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
            </svg>
            {exporting ? "Exporting..." : "Export Excel"}
          </button>
          <Link
            href="/sales/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Lead
          </Link>
        </div>
      </div>

      {/* Search row: field selector + input */}
      <div className="flex gap-2">
        {/* Field toggle buttons */}
        <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shrink-0">
          {searchFields.map((f) => (
            <button
              key={f.value}
              onClick={() => setSearchField(f.value)}
              className={`px-3 py-2 text-sm font-medium transition-colors border-r border-gray-200 last:border-r-0 ${
                searchField === f.value
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder={`Search by ${searchField === "assigned_to_name" ? "sales rep" : searchField}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Status filter row */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              statusFilter === f.value
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Leads table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="text-5xl text-gray-200">📋</div>
          <p className="text-gray-500 text-sm">No leads found.</p>
          <Link href="/sales/new" className="text-indigo-600 text-sm font-medium hover:underline">
            Add your first lead →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Lead Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Title</th>
                {isManagement && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Sales Rep</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Pipeline Stage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap w-40">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((lead) => {
                const completed = lead.checklist_completed ?? 0;
                const pct = Math.round((completed / CHECKLIST_TOTAL) * 100);
                const stageLabel = getStageLabel(lead.latest_stage_key);

                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                    onClick={() => (window.location.href = `/sales/${lead.id}`)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{lead.name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.company || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.title || "—"}</td>
                    {isManagement && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {lead.assigned_to_name ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {lead.assigned_to_name.charAt(0).toUpperCase()}
                            </span>
                            {lead.assigned_to_name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium ${
                        completed === 0
                          ? "text-gray-400"
                          : completed === CHECKLIST_TOTAL
                          ? "text-emerald-600"
                          : "text-indigo-600"
                      }`}>
                        {completed === CHECKLIST_TOTAL ? "✓ Complete" : stageLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              pct === 100
                                ? "bg-emerald-500"
                                : pct > 50
                                ? "bg-indigo-500"
                                : "bg-indigo-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 shrink-0 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
