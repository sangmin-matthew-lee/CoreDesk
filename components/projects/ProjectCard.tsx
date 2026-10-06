"use client";

import React from "react";
import { Project, SUB_STATUS_DETAILS } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  compact?: boolean;
}

export default function ProjectCard({ project, onClick, compact = false }: ProjectCardProps) {
  const subStatusInfo = SUB_STATUS_DETAILS[project.sub_status] || {
    label: project.sub_status,
    isInspectionOrReview: false,
  };

  const getSubStatusBadgeColor = () => {
    switch (project.category) {
      case "DEVELOPMENT":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "PGE_APPROVAL":
        return subStatusInfo.isInspectionOrReview
          ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
          : "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "CONSTRUCTION":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "CLOSEOUT":
        return subStatusInfo.isInspectionOrReview
          ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
          : "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "COMPLETED":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "ON_HOLD":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer p-4 flex flex-col justify-between gap-3 ${
        compact ? "p-3.5" : "p-4.5"
      }`}
    >
      <div>
        {/* Top meta row: District & Status badge */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 truncate block">
                {project.client_name}
              </span>
              {(project.source_crm_deal_id || project.lead_id) && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full shrink-0">
                  CRM
                </span>
              )}
            </div>
            {(project.client_address || project.site_name) && (
              <span className="text-xs text-gray-500 font-medium truncate block mt-0.5">
                📍 {project.client_address || project.site_name}
              </span>
            )}
            <h3 className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug mt-1">
              {project.name}
            </h3>
          </div>
        </div>

        {/* Retrofit Scope & Sub Status */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${getSubStatusBadgeColor()}`}
          >
            {subStatusInfo.isInspectionOrReview && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
            {subStatusInfo.label}
          </span>

          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700">
            {project.project_type}
          </span>
        </div>
      </div>

      {/* Bottom info section */}
      <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <div>
          <span className="text-[10px] text-gray-400 block leading-tight">OBF Loan</span>
          <span className="font-mono font-bold text-gray-900 text-xs">
            ${project.estimated_cost.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {project.pge_application_id ? (
          <div className="text-right">
            <span className="text-[10px] text-gray-400 block leading-tight">PG&E Ref</span>
            <span className="font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
              {project.pge_application_id}
            </span>
          </div>
        ) : (
          <div className="text-right">
            <span className="text-[10px] text-gray-400 block leading-tight">PM</span>
            <span className="text-[11px] text-gray-700 font-medium">
              {project.assigned_pm_name || "Unassigned"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
