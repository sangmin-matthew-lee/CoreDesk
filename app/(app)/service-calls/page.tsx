"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ServiceCall,
  ServiceCallSortField,
  ServiceCallSortDirection,
  ServiceCallPriority,
} from "@/lib/types";
import ServiceCallCard from "@/components/service-calls/ServiceCallCard";
import NewServiceCallModal from "@/components/service-calls/NewServiceCallModal";
import ServiceCallDetailModal from "@/components/service-calls/ServiceCallDetailModal";
import ServiceCallPrintSheet from "@/components/service-calls/ServiceCallPrintSheet";

export default function ServiceCallsPage() {
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "scheduled_soon">("active");

  // Organization & View state
  const [viewMode, setViewMode] = useState<"list" | "by_customer">("list");
  const [sortField, setSortField] = useState<ServiceCallSortField>("time");
  const [sortDirection, setSortDirection] = useState<ServiceCallSortDirection>("desc");
  const [search, setSearch] = useState("");
  const [warrantyFilter, setWarrantyFilter] = useState<"all" | "Covered" | "Non-covered">("all");
  const [priorityFilter, setPriorityFilter] = useState<ServiceCallPriority | "all">("all");

  // Data & counts
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const [counts, setCounts] = useState({
    active: 0,
    completed: 0,
    all: 0,
    scheduledSoon: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [printingTicket, setPrintingTicket] = useState<ServiceCall | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Auth verification
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((user) => {
        if (!user || (user.dept !== "Management" && user.dept !== "Super Admin")) {
          router.replace("/sales");
        }
      })
      .catch(() => {
        router.replace("/sales");
      });
  }, [router]);

  // Fetch service calls
  const fetchServiceCalls = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/service-calls", window.location.origin);
      url.searchParams.set("tab", activeTab);
      url.searchParams.set("sortField", sortField);
      url.searchParams.set("sortDirection", sortDirection);
      if (search.trim()) url.searchParams.set("search", search.trim());
      if (warrantyFilter !== "all") url.searchParams.set("warranty", warrantyFilter);
      if (priorityFilter !== "all") url.searchParams.set("priority", priorityFilter);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setServiceCalls(data.serviceCalls || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, sortField, sortDirection, search, warrantyFilter, priorityFilter]);

  useEffect(() => {
    fetchServiceCalls();
  }, [fetchServiceCalls]);

  const showToast = (message: string) => {
    setFeedbackToast(message);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4500);
  };

  // Handle Quick Toggle Completion
  const handleToggleComplete = async (call: ServiceCall, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = call.completion_status === "Complete" ? "Not yet" : "Complete";
    const isBecomingComplete = newStatus === "Complete";

    try {
      const res = await fetch(`/api/service-calls/${call.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_status: newStatus }),
      });

      if (res.ok) {
        const updated = await res.json();
        if (isBecomingComplete) {
          showToast(`Ticket ${call.ticket_number} marked Complete and moved to Completed tab!`);
          // Automatically go to Completed tab!
          setActiveTab("completed");
        } else {
          showToast(`Ticket ${call.ticket_number} re-opened to Active tab!`);
          setActiveTab("active");
        }
        fetchServiceCalls();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Group service calls by customer (for "By Customer" view)
  const groupedByCustomer = useMemo(() => {
    const map = new Map<string, ServiceCall[]>();
    for (const call of serviceCalls) {
      const client = call.client_name.trim();
      const existing = map.get(client) || [];
      existing.push(call);
      map.set(client, existing);
    }
    return Array.from(map.entries()).map(([clientName, calls]) => ({
      clientName,
      calls,
      activeCount: calls.filter((c) => c.completion_status !== "Complete").length,
      completedCount: calls.filter((c) => c.completion_status === "Complete").length,
      address: calls[0]?.job_site_address,
      phone: calls[0]?.client_phone,
    }));
  }, [serviceCalls]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-slide-up">
          <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{feedbackToast}</span>
          <button
            onClick={() => setFeedbackToast(null)}
            className="text-gray-400 hover:text-white ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Calls & Field Dispatch</h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Service Call Ticket
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => setActiveTab("active")}
          className={`bg-white border rounded-xl p-4 transition-all cursor-pointer ${
            activeTab === "active"
              ? "border-amber-400 ring-2 ring-amber-100 shadow-sm"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <span className="text-xs font-semibold text-gray-500 block">Active Service Calls</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-600">{counts.active}</span>
            <span className="text-xs text-gray-400">pending resolution</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("scheduled_soon")}
          className={`bg-white border rounded-xl p-4 transition-all cursor-pointer ${
            activeTab === "scheduled_soon"
              ? "border-indigo-400 ring-2 ring-indigo-100 shadow-sm"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <span className="text-xs font-semibold text-gray-500 block">Scheduled Next 7 Days</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-indigo-600">{counts.scheduledSoon}</span>
            <span className="text-xs text-gray-400">dispatches upcoming</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("completed")}
          className={`bg-white border rounded-xl p-4 transition-all cursor-pointer ${
            activeTab === "completed"
              ? "border-emerald-400 ring-2 ring-emerald-100 shadow-sm"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <span className="text-xs font-semibold text-gray-500 block">Completed Tickets</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-600">{counts.completed}</span>
            <span className="text-xs text-gray-400">resolved</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <span className="text-xs font-semibold text-gray-500 block">Total Tickets Logged</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-gray-800">{counts.all}</span>
            <span className="text-xs text-gray-400">all time</span>
          </div>
        </div>
      </div>

      {/* Tabs & Controls Container */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Tab Selection Row */}
        <div className="px-5 pt-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`pb-3 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "active"
                  ? "border-amber-600 text-amber-700"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <span>Active Calls</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === "active"
                    ? "bg-amber-100 text-amber-900"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {counts.active}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("scheduled_soon")}
              className={`pb-3 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "scheduled_soon"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <span>Scheduled Next 7 Days</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === "scheduled_soon"
                    ? "bg-indigo-100 text-indigo-900"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {counts.scheduledSoon}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`pb-3 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "completed"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <span>Completed</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === "completed"
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {counts.completed}
              </span>
            </button>
          </div>

          {/* View Mode Toggle: Time Order / List vs By Customer Grouping */}
          <div className="flex items-center gap-2 pb-2">
            <span className="text-xs text-gray-400 font-medium">Layout:</span>
            <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Time / List Order
              </button>
              <button
                type="button"
                onClick={() => setViewMode("by_customer")}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === "by_customer"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Group By Customer
              </button>
            </div>
          </div>
        </div>

        {/* Filter & Sorting Bar */}
        <div className="p-4 bg-gray-50/60 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <input
              type="text"
              placeholder="Search by ticket #, customer, address, tech..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-2.5 top-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort & Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1">
              <span className="text-gray-400 text-[11px] font-semibold">Sort:</span>
              <select
                value={`${sortField}_${sortDirection}`}
                onChange={(e) => {
                  const [f, d] = e.target.value.split("_");
                  setSortField(f as ServiceCallSortField);
                  setSortDirection(d as ServiceCallSortDirection);
                }}
                className="bg-transparent text-xs font-medium text-gray-800 focus:outline-hidden cursor-pointer"
              >
                <option value="time_desc">Request Date (Newest first)</option>
                <option value="time_asc">Request Date (Oldest first)</option>
                <option value="appointed_asc">Appointed Date (Upcoming first)</option>
                <option value="appointed_desc">Appointed Date (Latest first)</option>
                <option value="customer_asc">Customer Name (A → Z)</option>
                <option value="customer_desc">Customer Name (Z → A)</option>
                <option value="ticket_desc">Ticket # (Highest first)</option>
                <option value="ticket_asc">Ticket # (Lowest first)</option>
              </select>
            </div>

            {/* Warranty Filter */}
            <select
              value={warrantyFilter}
              onChange={(e) => setWarrantyFilter(e.target.value as "all" | "Covered" | "Non-covered")}
              className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Warranties</option>
              <option value="Covered">Covered Only</option>
              <option value="Non-covered">Non-covered (Billable)</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as ServiceCallPriority | "all")}
              className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="Emergency">🚨 Emergency Only</option>
              <option value="High">High Priority</option>
              <option value="Normal">Normal Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* List Content */}
        <div className="p-5">
          {loading ? (
            <div className="py-16 text-center text-gray-400">Loading service calls...</div>
          ) : serviceCalls.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 mx-auto flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">
                No {activeTab === "active" ? "Active" : activeTab === "scheduled_soon" ? "Scheduled (Next 7 Days)" : "Completed"} Service Calls Found
              </h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                {search || warrantyFilter !== "all" || priorityFilter !== "all"
                  ? "Try adjusting your filters or search keywords."
                  : activeTab === "active"
                  ? "All service calls have been resolved! You can create a new ticket when a customer calls."
                  : activeTab === "scheduled_soon"
                  ? "No active service calls are scheduled in the next 7 days."
                  : "Completed service calls will be archived here once marked complete."}
              </p>
              {activeTab === "active" && (
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg"
                >
                  Generate New Ticket
                </button>
              )}
            </div>
          ) : viewMode === "list" ? (
            /* Time / Flat List View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {serviceCalls.map((call) => (
                <ServiceCallCard
                  key={call.id}
                  call={call}
                  onClick={() => {
                    setSelectedTicketId(call.id);
                    setIsDetailModalOpen(true);
                  }}
                  onToggleComplete={handleToggleComplete}
                  onPrint={(c) => setPrintingTicket(c)}
                />
              ))}
            </div>
          ) : (
            /* Grouped By Customer View */
            <div className="space-y-6">
              {groupedByCustomer.map((group) => (
                <div
                  key={group.clientName}
                  className="bg-gray-50/70 border border-gray-200 rounded-xl p-4.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200/80 pb-3 mb-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-gray-900">{group.clientName}</h2>
                        <span className="text-xs bg-gray-200 text-gray-800 font-semibold px-2 py-0.5 rounded-full">
                          {group.calls.length} {group.calls.length === 1 ? "ticket" : "tickets"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-0.5">
                        {group.address && <span>📍 {group.address}</span>}
                        {group.phone && <span>📞 {group.phone}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {group.activeCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          {group.activeCount} Active
                        </span>
                      )}
                      {group.completedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {group.completedCount} Completed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {group.calls.map((call) => (
                      <ServiceCallCard
                        key={call.id}
                        call={call}
                        onClick={() => {
                          setSelectedTicketId(call.id);
                          setIsDetailModalOpen(true);
                        }}
                        onToggleComplete={handleToggleComplete}
                        onPrint={(c) => setPrintingTicket(c)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      <NewServiceCallModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={(newTicket) => {
          showToast(`Service ticket ${newTicket.ticket_number} created successfully!`);
          if (newTicket.completion_status === "Complete") {
            setActiveTab("completed");
          } else {
            setActiveTab("active");
          }
          fetchServiceCalls();
        }}
      />

      {/* Detail / Edit Modal */}
      <ServiceCallDetailModal
        isOpen={isDetailModalOpen}
        ticketId={selectedTicketId}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTicketId(null);
        }}
        onUpdated={(updated, isBecomingComplete) => {
          if (isBecomingComplete) {
            showToast(`Ticket ${updated.ticket_number} marked Complete and moved to Completed tab!`);
            setActiveTab("completed");
          } else {
            showToast(`Ticket ${updated.ticket_number} updated.`);
          }
          fetchServiceCalls();
        }}
        onDeleted={(id) => {
          showToast("Ticket deleted.");
          fetchServiceCalls();
        }}
        onPrintRequest={(ticket) => setPrintingTicket(ticket)}
      />

      {/* Printable Work Order Sheet */}
      {printingTicket && (
        <ServiceCallPrintSheet
          call={printingTicket}
          onClose={() => setPrintingTicket(null)}
        />
      )}
    </div>
  );
}
