"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProjectSidebar from "@/components/projects/ProjectSidebar";
import ProjectCard from "@/components/projects/ProjectCard";
import ProjectDetailModal from "@/components/projects/ProjectDetailModal";
import NewProjectModal from "@/components/projects/NewProjectModal";
import {
  Project,
  ProjectCategorySlug,
  PROJECT_CATEGORIES,
  SUB_STATUS_DETAILS,
  ProjectCategory,
} from "@/lib/types";

function ProjectsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawCat = searchParams.get("category") as ProjectCategorySlug | "all" | null;
  const activeCategory: ProjectCategorySlug | "all" =
    rawCat && (rawCat === "all" || PROJECT_CATEGORIES.some((c) => c.slug === rawCat))
      ? rawCat
      : "all";

  const [projects, setProjects] = useState<Project[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [attentionCounts, setAttentionCounts] = useState<Record<string, number>>({});
  const [totalPortfolioValue, setTotalPortfolioValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  // Modals state
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isManagement, setIsManagement] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((user) => {
        if (user && (user.dept === "Management" || user.dept === "Super Admin")) {
          setIsManagement(true);
        } else {
          router.replace("/sales");
        }
      })
      .catch(() => {
        router.replace("/sales");
      });
  }, [router]);

  const rawProjectId = searchParams.get("projectId");
  useEffect(() => {
    if (rawProjectId) {
      const pid = parseInt(rawProjectId, 10);
      if (!isNaN(pid) && pid > 0) {
        setSelectedProjectId(pid);
        setIsDetailOpen(true);
      }
    }
  }, [rawProjectId]);

  const fetchProjects = useCallback(async () => {
    try {
      const url = new URL("/api/projects", window.location.origin);
      if (activeCategory !== "all") {
        url.searchParams.set("category", activeCategory);
      }
      if (search.trim()) {
        url.searchParams.set("search", search.trim());
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setCounts(data.counts || {});
        setAttentionCounts(data.attentionCounts || {});
        setTotalPortfolioValue(data.totalPortfolioValue || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const url = new URL("/api/projects", window.location.origin);
        if (activeCategory !== "all") {
          url.searchParams.set("category", activeCategory);
        }
        if (search.trim()) {
          url.searchParams.set("search", search.trim());
        }

        const res = await fetch(url.toString());
        if (res.ok && !ignore) {
          const data = await res.json();
          setProjects(data.projects || []);
          setCounts(data.counts || {});
          setAttentionCounts(data.attentionCounts || {});
          setTotalPortfolioValue(data.totalPortfolioValue || 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [activeCategory, search]);

  const handleSelectCategory = (cat: ProjectCategorySlug | "all") => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === "all") {
      params.delete("category");
    } else {
      params.set("category", cat);
    }
    router.push(`/projects?${params.toString()}`);
  };

  const currentCategoryConfig = PROJECT_CATEGORIES.find((c) => c.slug === activeCategory);

  // Group projects by sub-status for Board View
  const getSubStatusColumns = () => {
    if (activeCategory === "all") {
      // Group by active categories (Development, PG&E Review, Construction, Closeout)
      return PROJECT_CATEGORIES.filter((c) => !c.isSecondary && c.key !== "COMPLETED").map((cat) => ({
        id: cat.key,
        title: cat.label,
        subTitle: cat.description,
        projects: projects.filter((p) => p.category === cat.key),
      }));
    } else if (currentCategoryConfig) {
      // Group by subStatuses within this category
      return currentCategoryConfig.subStatuses.map((subStatus, idx) => {
        const detail = SUB_STATUS_DETAILS[subStatus];
        return {
          id: subStatus,
          title: detail?.label || subStatus,
          isInspection: detail?.isInspectionOrReview || false,
          projects: projects.filter((p) => {
            if (p.sub_status === subStatus) return true;
            // Fallback: if project's sub_status is not found in any of this category's columns, place in first column
            if (idx === 0 && !currentCategoryConfig.subStatuses.includes(p.sub_status)) {
              return true;
            }
            return false;
          }),
        };
      });
    }
    return [];
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
      {/* Left Sidebar Navigation */}
      <ProjectSidebar
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        counts={counts}
        attentionCounts={attentionCounts}
        totalPortfolioValue={totalPortfolioValue}
        deletedCount={counts.deleted ?? 0}
        onOpenNewModal={() => setIsNewOpen(true)}
        isManagement={isManagement}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 w-full space-y-5">
        {/* Top Header Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  {activeCategory === "all"
                    ? "Portfolio Overview"
                    : currentCategoryConfig?.shortLabel || "Category"}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500 font-medium">
                  {projects.length} {projects.length === 1 ? "Project" : "Projects"}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-950 tracking-tight mt-0.5">
                {activeCategory === "all"
                  ? "All Active Projects"
                  : currentCategoryConfig?.label}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {activeCategory === "all"
                  ? ""
                  : currentCategoryConfig?.description}
              </p>
            </div>

            {/* View Mode Switcher & Add Button */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => setViewMode("board")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === "board"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  Board View
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === "list"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  List View
                </button>
              </div>

              {isManagement && (
                <button
                  onClick={() => setIsNewOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  New Project
                </button>
              )}
            </div>
          </div>

          {/* Search bar row */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
            <div className="relative flex-1">
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
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Views: Board or List */}
        {loading ? (
          <div className="p-16 text-center text-sm text-gray-400 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading projects...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl font-bold">
              📂
            </div>
            <h3 className="text-base font-bold text-gray-900">No Projects Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {search
                ? `No projects matched your search "${search}".`
                : `There are currently no projects in ${currentCategoryConfig?.label || "this category"
                }.`}
            </p>
            {isManagement && (
              <div className="pt-2">
                <button
                  onClick={() => setIsNewOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                >
                  + Add Project to This Category
                </button>
              </div>
            )}
          </div>
        ) : viewMode === "board" ? (
          /* Kanban Board View */
          <div className="flex gap-5 items-start overflow-x-auto pb-6 pt-1 w-full min-w-0">
            {getSubStatusColumns().map((col) => (
              <div
                key={col.id}
                className="w-[300px] sm:w-[325px] shrink-0 bg-gray-50/90 border border-gray-200/90 rounded-2xl p-4 flex flex-col gap-3 shadow-xs"
              >
                {/* Column header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-gray-200/70">
                  <div className="flex items-center gap-2 min-w-0">
                    {"isInspection" in col && col.isInspection && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-ping" />
                    )}
                    <h3 className="text-xs font-bold text-gray-800 truncate" title={col.title}>
                      {col.title}
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 shrink-0">
                    {col.projects.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-3.5">
                  {col.projects.length === 0 ? (
                    <div className="py-10 text-center text-xs text-gray-400 italic border border-dashed border-gray-200 rounded-xl bg-white/60">
                      Empty stage
                    </div>
                  ) : (
                    col.projects.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setIsDetailOpen(true);
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View / Data Table */
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">School District / Project</th>
                    <th className="px-5 py-3.5">Lifecycle Stage</th>
                    <th className="px-5 py-3.5">Sub-Status</th>
                    <th className="px-5 py-3.5">Scope</th>
                    <th className="px-5 py-3.5">OBF Loan Amount</th>
                    <th className="px-5 py-3.5">PG&E App ID</th>
                    <th className="px-5 py-3.5">Assigned PM</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projects.map((p) => {
                    const subInfo = SUB_STATUS_DETAILS[p.sub_status];
                    return (
                      <tr
                        key={p.id}
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setIsDetailOpen(true);
                        }}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-indigo-600">
                              {p.client_name}
                            </span>
                            {(p.source_crm_deal_id || p.lead_id) && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                CRM
                              </span>
                            )}
                          </div>
                          {p.site_name && (
                            <span className="text-xs text-gray-500 block truncate mt-0.5">
                              🏫 {p.site_name}
                            </span>
                          )}
                          <span className="font-semibold text-gray-900 text-sm block mt-0.5">{p.name}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="text-xs font-semibold px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                            {p.category}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${subInfo?.isInspectionOrReview
                                ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                          >
                            {subInfo?.isInspectionOrReview && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            )}
                            {subInfo?.label || p.sub_status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                          {p.project_type}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-gray-900">
                          ${p.estimated_cost.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {p.pge_application_id ? (
                            <span className="font-mono text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {p.pge_application_id}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Pending</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-600">
                          {p.assigned_pm_name || "Unassigned"}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProjectId(p.id);
                              setIsDetailOpen(true);
                            }}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            Manage →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Project Detail Modal */}
      <ProjectDetailModal
        key={selectedProjectId ?? "none"}
        projectId={selectedProjectId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedProjectId(null);
          if (searchParams.has("projectId")) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("projectId");
            const newQuery = params.toString();
            router.replace(`/projects${newQuery ? `?${newQuery}` : ""}`);
          }
        }}
        onUpdated={fetchProjects}
      />

      {/* New Project Modal */}
      <NewProjectModal
        key={activeCategory}
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        onCreated={() => fetchProjects()}
        initialCategory={
          activeCategory !== "all"
            ? (PROJECT_CATEGORIES.find((c) => c.slug === activeCategory)?.key as ProjectCategory)
            : "DEVELOPMENT"
        }
      />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Loading Project Management...</div>}>
      <ProjectsContent />
    </Suspense>
  );
}
