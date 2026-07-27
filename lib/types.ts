export type LeadStatus = "Cold" | "Positive" | "Negative" | "Closed";
export type Dept = "Sales" | "Management" | "Super Admin";


export const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: "mot_meeting", label: "MOT Meeting" },
  { key: "cbo_meeting", label: "CBO Meeting" },
  { key: "audit_scheduled", label: "Audit Scheduled" },
  { key: "audit_completed", label: "Audit Completed" },
  { key: "proposals_delivered", label: "Proposals Delivered" },
  { key: "phs_signed", label: "PHS Signed" },
  { key: "third_party_signed", label: "3rd Party Signed" },
  { key: "proposals_signed", label: "Proposals Signed" },
  { key: "pre_install_review", label: "Pre-Install Review Submitted" },
  { key: "la_issued", label: "LA Issued" },
  { key: "la_signed", label: "LA Signed" },
  { key: "installation", label: "Installation" },
  { key: "lma_issued", label: "LMA Issued" },
  { key: "lma_signed", label: "LMA Signed" },
  { key: "check_received", label: "Check Received" },
  { key: "warranty_letter_sent", label: "Warranty Letter Sent" },
];

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  dept: Dept;
  created_at: string;
}

export interface LeadSite {
  name: string;
  cost: number;
}

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  notes: string;
  office_address: string;
  status: LeadStatus;
  last_contact_date: string | null;
  assigned_to: number | null;
  assigned_to_name?: string | null;
  checklist_completed?: number;
  latest_stage_key?: string | null;
  sites?: string | null;
  number_of_sites?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: number;
  lead_id: number;
  item_key: string;
  completed: number;
  completed_at: string | null;
}

export interface LeadWithChecklist extends Lead {
  checklist: Record<string, boolean>;
}
