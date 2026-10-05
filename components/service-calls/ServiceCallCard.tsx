"use client";

import React from "react";
import { ServiceCall } from "@/lib/types";

interface ServiceCallCardProps {
  call: ServiceCall;
  onClick: () => void;
  onToggleComplete?: (call: ServiceCall, e: React.MouseEvent) => void;
  onPrint?: (call: ServiceCall, e: React.MouseEvent) => void;
}

export default function ServiceCallCard({
  call,
  onClick,
  onToggleComplete,
  onPrint,
}: ServiceCallCardProps) {
  const isCompleted = call.completion_status === "Complete";

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Not Scheduled";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? dateStr
        : d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "Not Scheduled";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? dateStr
        : d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-xl border transition-all cursor-pointer p-4 hover:shadow-md ${
        isCompleted
          ? "border-gray-200 hover:border-emerald-300 opacity-90"
          : "border-gray-200 hover:border-amber-400"
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
            {call.ticket_number}
          </span>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              call.priority === "Emergency"
                ? "bg-red-100 text-red-800 border border-red-200"
                : call.priority === "High"
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : "bg-blue-50 text-blue-700 border border-blue-100"
            }`}
          >
            {call.priority}
          </span>
          {call.linked_project_name && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
              Project Linked
            </span>
          )}
        </div>

        {/* Quick Actions (Print & Complete) */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {onPrint && (
            <button
              type="button"
              onClick={(e) => onPrint(call, e)}
              title="Print Technician Work Order"
              className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
          )}

          {onToggleComplete && (
            <button
              type="button"
              onClick={(e) => onToggleComplete(call, e)}
              title={isCompleted ? "Mark as Active (Not Yet)" : "Mark as Complete"}
              className={`p-1.5 rounded-lg transition-colors ${
                isCompleted
                  ? "text-emerald-600 hover:bg-emerald-50"
                  : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              {isCompleted ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Client Name & Address */}
      <div className="mb-2.5">
        <h3 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
          {call.client_name}
        </h3>
        {call.job_site_address && (
          <p className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-1">
            <span>📍</span> {call.job_site_address}
          </p>
        )}
        {call.client_phone && (
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <span>📞</span> {call.client_phone}
          </p>
        )}
      </div>

      {/* Detail / Description Snippet */}
      {call.detail && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-3 bg-gray-50/70 rounded-md p-2">
          {call.detail}
        </p>
      )}

      {/* Warranties & Technician badges */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
        <span
          className={`px-2 py-0.5 rounded font-semibold ${
            call.warranty_labor === "Covered"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          Labor: {call.warranty_labor}
        </span>
        <span
          className={`px-2 py-0.5 rounded font-semibold ${
            call.warranty_materials === "Covered"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          Materials: {call.warranty_materials}
        </span>
      </div>

      {/* Card Footer: Dates & Staff */}
      <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
        <div>
          <span className="text-gray-400">Appointed: </span>
          <span className="font-medium text-gray-800">
            {formatDateTime(call.appointed_date)}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Tech: </span>
          <span className="font-medium text-gray-800">
            {call.service_technician || "Unassigned"}
          </span>
        </div>
      </div>
    </div>
  );
}
