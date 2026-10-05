"use client";

import React from "react";
import Link from "next/link";
import {
  ProjectCategorySlug,
  PROJECT_CATEGORIES,
} from "@/lib/types";

interface ProjectSidebarProps {
  activeCategory: ProjectCategorySlug | "all";
  onSelectCategory: (category: ProjectCategorySlug | "all") => void;
  counts: Record<string, number>;
  attentionCounts: Record<string, number>;
  totalPortfolioValue: number;
  deletedCount?: number;
  onOpenNewModal: () => void;
  isManagement?: boolean;
}

export default function ProjectSidebar({
  activeCategory,
  onSelectCategory,
  counts,
  attentionCounts,
  totalPortfolioValue,
  deletedCount,
  onOpenNewModal,
  isManagement = false,
}: ProjectSidebarProps) {
  const primaryCategories = PROJECT_CATEGORIES.filter((c) => !c.isSecondary);
  const secondaryCategories = PROJECT_CATEGORIES.filter((c) => c.isSecondary);

  const getCategoryIcon = (slug: ProjectCategorySlug | "all") => {
    switch (slug) {
      case "all":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        );
      case "development":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case "pge_approval":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case "construction":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case "closeout":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case "completed":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        );
      case "on_hold":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <aside className="w-full lg:w-72 shrink-0 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-5 shadow-xs">
      {/* Header section */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">
              GEI Project
            </h2>
          </div>
        </div>
        {isManagement && (
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
            title="Create new project"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
        )}
      </div>

      {/* Main navigation categories */}
      <nav className="space-y-1.5" aria-label="Project Categories">
        {/* All Projects tab */}
        <button
          onClick={() => onSelectCategory("all")}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${activeCategory === "all"
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
            : "text-gray-700 hover:bg-gray-50"
            }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={activeCategory === "all" ? "text-white" : "text-gray-400"}>
              {getCategoryIcon("all")}
            </span>
            <span className="truncate">All Active Projects</span>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeCategory === "all"
              ? "bg-white/20 text-white"
              : "bg-gray-100 text-gray-600"
              }`}
          >
            {counts.all ?? 0}
          </span>
        </button>

        <div className="pt-2 pb-1">
          <p className="px-3 text-[11px] font-bold tracking-wider uppercase text-gray-400">
            Lifecycle Stages
          </p>
        </div>

        {primaryCategories.map((cat, idx) => {
          const isActive = activeCategory === cat.slug;
          const count = counts[cat.slug] ?? 0;
          const attention = attentionCounts[cat.slug] ?? 0;

          return (
            <button
              key={cat.slug}
              onClick={() => onSelectCategory(cat.slug)}
              className={`w-full group flex flex-col p-2.5 rounded-xl text-left transition-all ${isActive
                ? "bg-indigo-50 border border-indigo-200 shadow-xs"
                : "hover:bg-gray-50 border border-transparent"
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 transition-colors ${isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                      }`}
                  >
                    <span className="text-[11px] font-bold">{idx + 1}</span>
                  </span>
                  <span
                    className={`text-sm font-semibold truncate ${isActive ? "text-indigo-950" : "text-gray-800"
                      }`}
                  >
                    {cat.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {attention > 0 && (
                    <span
                      title={`${attention} project(s) pending review / inspection`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      {attention}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                      }`}
                  >
                    {count}
                  </span>
                </div>
              </div>

              <p
                className={`text-[11px] mt-1 pl-8 line-clamp-1 ${isActive ? "text-indigo-700/80" : "text-gray-500"
                  }`}
              >
                {cat.description}
              </p>
            </button>
          );
        })}
      </nav>

      {/* Secondary filter divider */}
      <div className="pt-2 border-t border-gray-100 space-y-1.5">
        <p className="px-3 text-[11px] font-bold tracking-wider uppercase text-gray-400">
          Secondary Status
        </p>

        {secondaryCategories.map((cat) => {
          const isActive = activeCategory === cat.slug;
          const count = counts[cat.slug] ?? 0;

          return (
            <button
              key={cat.slug}
              onClick={() => onSelectCategory(cat.slug)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-medium transition-all ${isActive
                ? "bg-gray-100 text-gray-900 font-semibold border border-gray-300"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 border border-transparent"
                }`}
            >
              <div className="flex items-center gap-2">
                <span className={isActive ? "text-gray-700" : "text-gray-400"}>
                  {getCategoryIcon(cat.slug)}
                </span>
                <span>{cat.label}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Management / Deleted Projects */}
      {isManagement && (
        <div className="pt-2 border-t border-gray-100 space-y-1">
          <p className="px-3 text-[11px] font-bold tracking-wider uppercase text-gray-400">
            Management
          </p>

          <Link
            href="/projects/deleted"
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-medium text-gray-600 hover:bg-rose-50 hover:text-rose-700 transition-all border border-transparent hover:border-rose-200 group"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-rose-600 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>Deleted Projects</span>
            </div>
            {(deletedCount ?? (counts.deleted ?? 0)) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[11px]">
                {deletedCount ?? counts.deleted}
              </span>
            )}
          </Link>
        </div>
      )}

      {/* Portfolio overview stats card */}
      <div className="mt-auto pt-3 border-t border-gray-100">
        <div className="p-3 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl text-white">
          <div className="flex items-center justify-between text-xs text-indigo-200 mb-1">
            <span>Active OBF Financing</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-white">
            ${totalPortfolioValue.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-indigo-300/80 mt-2 pt-2 border-t border-white/10">
            <span>Utility Partner:</span>
            <span className="font-semibold text-white">PG&E 0% Interest</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
