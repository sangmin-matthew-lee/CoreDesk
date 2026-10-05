"use client";

import React, { useEffect } from "react";
import { ServiceCall } from "@/lib/types";

interface ServiceCallPrintSheetProps {
  call: ServiceCall;
  onClose?: () => void;
}

export default function ServiceCallPrintSheet({
  call,
  onClose,
}: ServiceCallPrintSheetProps) {
  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

  const formatShortDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      {/* Screen action bar (hidden during print) */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex items-center gap-3">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Work Order
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2.5 bg-white/90 hover:bg-white text-gray-700 rounded-lg shadow-lg transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Printable Sheet Container */}
      <div className="bg-white text-gray-900 rounded-xl shadow-2xl max-w-3xl w-full p-8 md:p-10 my-8 print:m-0 print:p-6 print:shadow-none print:max-w-none print:w-full print:rounded-none">
        {/* Printable Header */}
        <div className="border-b-2 border-gray-900 pb-5 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-gray-900">
                  GEI SERVICES
                </span>
                <span className="text-xs bg-gray-900 text-white font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                  Field Dispatch
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Customer Service & Technician Dispatch Order
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">
                Ticket Number
              </span>
              <span className="text-2xl font-black text-indigo-700 font-mono tracking-tight">
                {call.ticket_number}
              </span>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Printed: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Top Key Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3.5 mb-6 text-xs">
          <div>
            <span className="text-gray-400 font-medium uppercase text-[10px] block">
              Appointed Service Date
            </span>
            <span className="font-bold text-gray-900 text-sm block mt-0.5">
              {formatDate(call.appointed_date)}
            </span>
          </div>
          <div>
            <span className="text-gray-400 font-medium uppercase text-[10px] block">
              Assigned Technician
            </span>
            <span className="font-bold text-gray-900 text-sm block mt-0.5">
              {call.service_technician || "Unassigned"}
            </span>
          </div>
          <div>
            <span className="text-gray-400 font-medium uppercase text-[10px] block">
              Priority
            </span>
            <span
              className={`inline-block font-bold text-xs uppercase px-2 py-0.5 rounded mt-0.5 ${
                call.priority === "Emergency"
                  ? "bg-red-100 text-red-800"
                  : call.priority === "High"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {call.priority}
            </span>
          </div>
          <div>
            <span className="text-gray-400 font-medium uppercase text-[10px] block">
              Ticket Status
            </span>
            <span className="font-bold text-gray-900 text-sm block mt-0.5">
              {call.completion_status === "Complete" ? "Completed" : "Active / In Progress"}
            </span>
          </div>
        </div>

        {/* Client & Job Site Information */}
        <div className="border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Customer & Site Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-400 block text-[11px]">Client / Organization Name</span>
              <span className="font-bold text-sm text-gray-900">{call.client_name}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Contact Phone Number</span>
              <span className="font-bold text-sm text-gray-900">{call.client_phone || "—"}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Job Site Address</span>
              <span className="font-medium text-gray-800">{call.job_site_address || "—"}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Client Email Address</span>
              <span className="font-medium text-gray-800">{call.client_email || "—"}</span>
            </div>
          </div>
        </div>

        {/* Warranty Status Box */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Labor Warranty</span>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`font-bold text-xs px-2 py-0.5 rounded ${
                  call.warranty_labor === "Covered"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {call.warranty_labor}
              </span>
              <span className="text-[11px] text-gray-500">
                {call.warranty_labor === "Covered" ? "Under warranty contract" : "Billable to client"}
              </span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Materials Warranty</span>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`font-bold text-xs px-2 py-0.5 rounded ${
                  call.warranty_materials === "Covered"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {call.warranty_materials}
              </span>
              <span className="text-[11px] text-gray-500">
                {call.warranty_materials === "Covered" ? "Under warranty contract" : "Billable to client"}
              </span>
            </div>
          </div>
        </div>

        {/* Service Call Detail / Scope */}
        <div className="border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Service Request Description & Issue Detail
          </h3>
          <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
            {call.detail || "No details provided."}
          </p>
        </div>

        {/* Materials & Equipments Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Required Materials
            </h3>
            <div className="text-xs text-gray-800 min-h-[60px] whitespace-pre-wrap">
              {call.materials_needed || "Standard service kit / check on-site"}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Required Equipment / Tools
            </h3>
            <div className="text-xs text-gray-800 min-h-[60px] whitespace-pre-wrap">
              {call.equipment_needed || "Standard technician tools, ladder / lift as needed"}
            </div>
          </div>
        </div>

        {/* Instructions & Notes */}
        {call.technician_notes && (
          <div className="border border-amber-200 bg-amber-50/40 rounded-lg p-3.5 mb-6 text-xs text-amber-900">
            <span className="font-bold uppercase text-[10px] tracking-wider block text-amber-800 mb-1">
              Dispatch Instructions / Internal Note:
            </span>
            <p className="whitespace-pre-wrap">{call.technician_notes}</p>
          </div>
        )}

        {/* Technician Field Log Section (for physical sign-off and on-site notes) */}
        <div className="border border-gray-300 rounded-lg p-4 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">
            Technician Field Work Notes & Parts Used (On-Site Log)
          </h3>
          <div className="border-b border-gray-200 border-dashed pb-4 mb-4 min-h-[50px] text-xs text-gray-400">
            {call.completion_status === "Complete" ? (
              <span className="text-gray-800">
                Service call marked complete on {formatShortDate(call.completed_at)} by {call.completed_by_name || "Manager"}
              </span>
            ) : (
              <span>Write notes, part serial numbers, or actions taken here...</span>
            )}
          </div>
          <div className="border-b border-gray-200 border-dashed pb-4 mb-4 min-h-[25px]"></div>
        </div>

        {/* Signatures Block */}
        <div className="grid grid-cols-2 gap-8 pt-4 border-t border-gray-200 text-xs">
          <div>
            <div className="border-b border-gray-400 pb-1 mb-1">
              <span className="text-gray-400 text-[10px] block">Technician Signature</span>
              <div className="h-7"></div>
            </div>
            <div className="flex justify-between text-[11px] text-gray-500">
              <span>Print Name: {call.service_technician || "_________________"}</span>
              <span>Date: ____________</span>
            </div>
          </div>

          <div>
            <div className="border-b border-gray-400 pb-1 mb-1">
              <span className="text-gray-400 text-[10px] block">Customer / Site Representative Signature</span>
              <div className="h-7"></div>
            </div>
            <div className="flex justify-between text-[11px] text-gray-500">
              <span>Print Name: _________________</span>
              <span>Date: ____________</span>
            </div>
          </div>
        </div>

        {/* Print Footer */}
        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400">
          <span>Ticket: {call.ticket_number} • Request Date: {formatShortDate(call.request_date)}</span>
          <span>GEI CRM Service Operations System</span>
        </div>
      </div>
    </div>
  );
}
