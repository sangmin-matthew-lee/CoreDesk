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
  is_deleted?: number;
  deleted_at?: string | null;
  deleted_by?: number | null;
  deleted_by_name?: string | null;
  original_assigned_to?: number | null;
  original_assigned_to_name?: string | null;
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
  linked_project_id?: number | null;
}

export type ProjectCategory =
  | "DEVELOPMENT"
  | "PGE_APPROVAL"
  | "CONSTRUCTION"
  | "CLOSEOUT"
  | "COMPLETED"
  | "ON_HOLD";

export type ProjectCategorySlug =
  | "development"
  | "pge_approval"
  | "construction"
  | "closeout"
  | "completed"
  | "on_hold";

export type ProjectSubStatus =
  // Development
  | "AUDIT_SCHEDULED"
  | "PROPOSAL_GENERATED"
  | "PROPOSAL_DELIVERED"
  // PG&E Review & Contracting
  | "SCHOOL_BOARD_PENDING"
  | "OBF_APPLICATION_SUBMITTED"
  | "OBF_PRE_LA_SENT"
  | "OBF_APPROVED"
  | "NTP_ISSUED"
  // Construction
  | "MATERIAL_PROCUREMENT"
  | "MATERIAL_DELIVERED"
  | "INSTALLATION_IN_PROGRESS"
  // Closeout
  | "OBF_POST_LA_SENT"
  | "PGE_SIGN_OFF_COMPLETE"
  | "FINAL_LOAN_EXECUTED"
  // Completed & Archived
  | "CUSTOMER_LETTER_SENT"
  | "PROJECT_ARCHIVED"
  // Terminal
  | "DISQUALIFIED_OR_DROPPED"
  // Legacy aliases for backwards compatibility
  | "PGE_PRE_INSPECTION_PENDING"
  | "PGE_RESERVATION_APPROVED"
  | "INTERNAL_COMMISSIONING"
  | "POST_INSPECTION_REQUESTED";

export interface KeyContact {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  office_address?: string;
}

export interface Project {
  id: number;
  lead_id: number | null;
  source_crm_deal_id: number | null;
  name: string;
  client_name: string;
  school_district_name?: string;
  client_address?: string | null;
  site_name: string | null;
  key_contacts: string | null;
  category: ProjectCategory;
  sub_status: ProjectSubStatus;
  project_type: string;
  utility_provider: string;
  pge_application_id: string | null;
  estimated_cost: number;
  assigned_pm_id: number | null;
  assigned_pm_name?: string | null;
  target_completion_date: string | null;
  notes: string | null;
  is_deleted?: number;
  deleted_at?: string | null;
  deleted_by?: number | null;
  deleted_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeletedProject extends Project {
  deleted_by_name?: string | null;
  assigned_pm_name?: string | null;
  linked_lead_name?: string | null;
  linked_lead_company?: string | null;
}

export interface CategoryMetadata {
  key: ProjectCategory;
  slug: ProjectCategorySlug;
  label: string;
  shortLabel: string;
  description: string;
  subStatuses: ProjectSubStatus[];
  isSecondary?: boolean;
}

export const PROJECT_CATEGORIES: CategoryMetadata[] = [
  {
    key: "DEVELOPMENT",
    slug: "development",
    label: "Development & Audit",
    shortLabel: "Development",
    description: "",
    subStatuses: [
      "AUDIT_SCHEDULED",
      "PROPOSAL_GENERATED",
      "PROPOSAL_DELIVERED",
    ],
  },
  {
    key: "PGE_APPROVAL",
    slug: "pge_approval",
    label: "PG&E Review & Contracting",
    shortLabel: "PG&E Review",
    description: "",
    subStatuses: [
      "SCHOOL_BOARD_PENDING",
      "OBF_APPLICATION_SUBMITTED",
      "OBF_PRE_LA_SENT",
      "OBF_APPROVED",
      "NTP_ISSUED",
    ],
  },
  {
    key: "CONSTRUCTION",
    slug: "construction",
    label: "Construction & Execution",
    shortLabel: "Construction",
    description: "",
    subStatuses: [
      "MATERIAL_PROCUREMENT",
      "MATERIAL_DELIVERED",
      "INSTALLATION_IN_PROGRESS",
    ],
  },
  {
    key: "CLOSEOUT",
    slug: "closeout",
    label: "Closeout & Inspection",
    shortLabel: "Closeout",
    description: "",
    subStatuses: [
      "OBF_POST_LA_SENT",
      "PGE_SIGN_OFF_COMPLETE",
      "FINAL_LOAN_EXECUTED",
    ],
  },
  {
    key: "COMPLETED",
    slug: "completed",
    label: "Completed & Archived",
    shortLabel: "Completed",
    description: "",
    subStatuses: [
      "CUSTOMER_LETTER_SENT",
      "PROJECT_ARCHIVED",
    ],
  },
  {
    key: "ON_HOLD",
    slug: "on_hold",
    label: "On Hold / Canceled",
    shortLabel: "On Hold",
    description: "",
    isSecondary: true,
    subStatuses: [
      "DISQUALIFIED_OR_DROPPED",
    ],
  },
];

export const SUB_STATUS_DETAILS: Record<
  ProjectSubStatus,
  { label: string; stageCategory: ProjectCategory; isInspectionOrReview?: boolean }
> = {
  // Development
  AUDIT_SCHEDULED: { label: "Audit Scheduled", stageCategory: "DEVELOPMENT" },
  PROPOSAL_GENERATED: { label: "Proposal Generated", stageCategory: "DEVELOPMENT" },
  PROPOSAL_DELIVERED: { label: "Proposal Delivered", stageCategory: "DEVELOPMENT" },
  // PG&E Review & Contracting
  SCHOOL_BOARD_PENDING: {
    label: "School Board Approval Pending",
    stageCategory: "PGE_APPROVAL",
    isInspectionOrReview: true,
  },
  OBF_APPLICATION_SUBMITTED: { label: "OBF Application Submitted", stageCategory: "PGE_APPROVAL" },
  OBF_PRE_LA_SENT: {
    label: "OBF Pre-LA Sent",
    stageCategory: "PGE_APPROVAL",
    isInspectionOrReview: true,
  },
  OBF_APPROVED: { label: "OBF Approved", stageCategory: "PGE_APPROVAL" },
  NTP_ISSUED: { label: "NTP Issued", stageCategory: "PGE_APPROVAL" },
  // Construction
  MATERIAL_PROCUREMENT: { label: "Material Procurement", stageCategory: "CONSTRUCTION" },
  MATERIAL_DELIVERED: { label: "Material Delivered", stageCategory: "CONSTRUCTION" },
  INSTALLATION_IN_PROGRESS: { label: "Installation In Progress", stageCategory: "CONSTRUCTION" },
  // Closeout
  OBF_POST_LA_SENT: {
    label: "OBF Post-LA Sent",
    stageCategory: "CLOSEOUT",
    isInspectionOrReview: true,
  },
  PGE_SIGN_OFF_COMPLETE: { label: "PG&E Sign-Off Complete", stageCategory: "CLOSEOUT" },
  FINAL_LOAN_EXECUTED: { label: "Final Loan Executed", stageCategory: "CLOSEOUT" },
  // Completed & Archived
  CUSTOMER_LETTER_SENT: { label: "Customer Letter Sent", stageCategory: "COMPLETED" },
  PROJECT_ARCHIVED: { label: "Project Archived", stageCategory: "COMPLETED" },
  // Terminal
  DISQUALIFIED_OR_DROPPED: { label: "Disqualified / Dropped", stageCategory: "ON_HOLD" },
  // Legacy aliases
  PGE_PRE_INSPECTION_PENDING: {
    label: "OBF Pre-LA Sent",
    stageCategory: "PGE_APPROVAL",
    isInspectionOrReview: true,
  },
  PGE_RESERVATION_APPROVED: { label: "OBF Approved", stageCategory: "PGE_APPROVAL" },
  INTERNAL_COMMISSIONING: { label: "Installation In Progress", stageCategory: "CONSTRUCTION" },
  POST_INSPECTION_REQUESTED: {
    label: "OBF Post-LA Sent",
    stageCategory: "CLOSEOUT",
    isInspectionOrReview: true,
  },
};

export type WarrantyStatus = "Covered" | "Non-covered";
export type ServiceCallCompletion = "Complete" | "Not yet";
export type ServiceCallPriority = "Low" | "Normal" | "High" | "Emergency";

export interface ServiceCall {
  id: number;
  ticket_number: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  job_site_address: string | null;
  request_date: string;
  appointed_date: string | null;
  assignee_id: number | null;
  assignee_name?: string | null;
  service_technician: string | null;
  warranty_labor: WarrantyStatus;
  warranty_materials: WarrantyStatus;
  detail: string | null;
  materials_needed: string | null;
  equipment_needed: string | null;
  technician_notes: string | null;
  priority: ServiceCallPriority;
  completion_status: ServiceCallCompletion;
  completed_at: string | null;
  completed_by: number | null;
  completed_by_name?: string | null;
  linked_project_id: number | null;
  linked_project_name?: string | null;
  is_deleted?: number;
  deleted_at?: string | null;
  deleted_by?: number | null;
  created_at: string;
  updated_at: string;
}

export type ServiceCallSortField = "time" | "appointed" | "customer" | "ticket";
export type ServiceCallSortDirection = "asc" | "desc";

