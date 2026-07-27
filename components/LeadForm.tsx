"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lead, LeadStatus, LeadSite } from "@/lib/types";

interface UserOption {
  id: number;
  first_name: string;
  last_name: string;
}

interface LeadFormProps {
  initial?: Partial<Lead>;
  onSubmit: (data: Partial<Lead>) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
  isManagement?: boolean;
  salesUsers?: UserOption[];
}

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "Cold", label: "Cold — Cold Calling" },
  { value: "Positive", label: "Positive — Interested" },
  { value: "Negative", label: "Negative — Not Interested" },
  { value: "Closed", label: "Closed — Deal Closed" },
];

export default function LeadForm({
  initial = {},
  onSubmit,
  onCancel,
  submitLabel,
  isManagement = false,
  salesUsers = [],
}: LeadFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<Lead>>({
    name: "",
    email: "",
    phone: "",
    company: "",
    title: "",
    notes: "",
    office_address: "",
    status: "Cold",
    last_contact_date: "",
    assigned_to: null,
    number_of_sites: null,
    ...initial,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [sitesList, setSitesList] = useState<LeadSite[]>(() => {
    try {
      return initial.sites ? JSON.parse(initial.sites) : [];
    } catch {
      return [];
    }
  });

  const set =
    (field: keyof Lead) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) { setError("Name is required"); return; }
    setLoading(true);
    setError("");
    try {
      await onSubmit({
        ...form,
        sites: JSON.stringify(sitesList),
        number_of_sites: form.number_of_sites ? Number(form.number_of_sites) : null,
      });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name" required>
          <input className={inputCls} value={form.name || ""} onChange={set("name")} placeholder="John Doe" required />
        </Field>
        <Field label="Company">
          <input className={inputCls} value={form.company || ""} onChange={set("company")} placeholder="Acme Corp" />
        </Field>
        <Field label="Title">
          <input className={inputCls} value={form.title || ""} onChange={set("title")} placeholder="CEO" />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" value={form.email || ""} onChange={set("email")} placeholder="john@example.com" />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={form.phone || ""} onChange={set("phone")} placeholder="123-456-7890" />
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status || "Cold"} onChange={set("status")}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Last Contact Date">
          <input className={inputCls} type="date" value={form.last_contact_date || ""} onChange={set("last_contact_date")} />
        </Field>
        <Field label="Office Address">
          <input className={inputCls} value={form.office_address || ""} onChange={set("office_address")} placeholder="123 Main St, City, State" />
        </Field>
        <Field label="Number of Sites (학교 갯수)">
          <input
            className={inputCls}
            type="number"
            min="0"
            value={form.number_of_sites ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                number_of_sites: e.target.value ? Number(e.target.value) : null,
              }))
            }
            placeholder="0"
          />
        </Field>

        {isManagement && salesUsers.length > 0 && (
          <Field label="Assign To">
            <select
              className={inputCls}
              value={form.assigned_to ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  assigned_to: e.target.value ? Number(e.target.value) : null,
                }))
              }
            >
              <option value="">— Unassigned —</option>
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sites & Costs</h3>
          <button
            type="button"
            onClick={() => setSitesList((prev) => [...prev, { name: "", cost: 0 }])}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            + Add Site
          </button>
        </div>

        {sitesList.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No sites added yet. Click "+ Add Site" to add project sites and costs.</p>
        ) : (
          <div className="space-y-2">
            {sitesList.map((site, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  required
                  placeholder="Site Name / School Name"
                  value={site.name}
                  onChange={(e) => {
                    const next = [...sitesList];
                    next[index].name = e.target.value;
                    setSitesList(next);
                  }}
                  className={`${inputCls} flex-1`}
                />
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Cost"
                  value={site.cost || ""}
                  onChange={(e) => {
                    const next = [...sitesList];
                    next[index].cost = Number(e.target.value);
                    setSitesList(next);
                  }}
                  className={`${inputCls} w-32`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSitesList((prev) => prev.filter((_, i) => i !== index));
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            <div className="text-right text-xs font-semibold text-gray-600 pr-14 pt-1">
              Total Project Cost: <span className="text-indigo-600 font-bold">${sitesList.reduce((sum, s) => sum + s.cost, 0).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <Field label="Notes">
        <textarea
          className={`${inputCls} resize-none`}
          rows={4}
          value={form.notes || ""}
          onChange={set("notes")}
          placeholder="Additional notes..."
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => onCancel ? onCancel() : router.back()}
          className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";
