# CoreDesk

Internal operations platform for **Sales CRM** and **Project Management** teams.

## Tech Stack

| Layer    | Choice                                            |
| -------- | ------------------------------------------------- |
| Frontend | Next.js 16 (App Router, TypeScript, Tailwind CSS) |
| Database | SQLite via `better-sqlite3`                       |
| Auth     | JWT in `httpOnly` cookie (`jose`)                 |
| Password | bcrypt (12 rounds)                                |
| Email    | Nodemailer (console fallback in dev)              |
| Export   | `xlsx` — Excel file generation                    |

> **Deployment target:** GCP free-tier VM (e2-micro). The entire app — frontend, API routes, and SQLite DB file — runs on a single machine with zero additional infrastructure cost.

---

## Role-Based Access & Worker Classification (RBAC)

CoreDesk enforces strict operational boundaries between **1099 Independent Sales Contractors** and **W2 Management / Engineering Employees**:

| Role / Worker Classification | Department | Scope of Access | Permissions & Boundaries |
| :--- | :--- | :--- | :--- |
| **Sales Representative** | `Sales` | **1099 Contractor** | • Access restricted strictly to **Sales CRM**.<br>• View, edit, and export **only their own assigned leads**.<br>• **Project Management Tab Hidden:** No access to company-wide portfolio totals, other reps' deals, contractor margins, or PM engineering data.<br>• Can promote qualified opportunities to active projects (Rule 2).<br>• Lead detail shows a read-only live PM status badge for connected projects.<br>• Cannot edit or delete projects. |
| **Operations & Engineering** | `Management` | **W2 Employee** | • Full access to **Sales CRM** and **Project Management**.<br>• Manage all company leads across all sales reps.<br>• Reassign leads, restore deleted leads, and export company-wide reports.<br>• Create, edit, stage-advance, and archive projects.<br>• Assign dedicated W2 Project Managers. |


---

## Features

### Authentication & Security

- **Register & Approval** — first name, last name, department (`Sales` / `Management`), email, password. Accounts can be locked or approved by Super Admin.
- **Login / Logout** — JWT stored in secure `httpOnly` cookie (`coredesk_token`), 7-day expiry.
- **Password Reset** — sends a time-limited reset link to the registered email (1-hour expiry). In development, the link is logged to the server console if SMTP is unconfigured.
- **Route Guards & Middleware** — Unauthenticated requests are blocked. Non-management users attempting to access `/projects` or `/projects/deleted` are automatically intercepted and redirected to `/sales`.

---

### Sales CRM

- **Lead List & Pipeline** — sortable table tracking Lead Status, School District / Company, Contact Name, Title, Pipeline Stage, and Progress %.
- **Strict Data Isolation** — 1099 contractors only see and search leads assigned to them. W2 Management sees all leads across the organization.
- **Search & Filter** — Field-scoped search (Name / Company / Title / Sales Rep) and Status filter (All · Cold · Positive · Negative · Closed).
- **Lead Detail & Checklist** — 16-step standardized sales checklist with automated progress tracking.
- **Export to Excel** — Role-governed XLSX download. 1099 contractors can only export their own assigned leads; W2 Management can export company-wide records.
- **Soft Deletion & Trash** — Leads are safely soft-deleted and can be restored with original or reassigned sales ownership by Management.

---

### Project Management User Guide

The **Project Management** module is the central operational command center for delivering turnkey **On-Bill Financing (OBF)** energy efficiency retrofits, PG&E utility reviews, engineering audits, and construction closeout.

#### 1. Access & Visibility
- **W2 Management Only:** The Project Management tab (top header and home page card) is visible only to `Management` and `Super Admin` accounts.
- **Contractor Isolation:** 1099 Sales Contractors cannot query `/api/projects` or browse `/projects`. If a sales contractor directly inputs `/projects` into the browser, server-side route guards redirect them to `/sales`.

#### 2. Lead-to-Project Conversion (Rule 1 & Rule 2)
Projects originate from qualified sales opportunities in the CRM:
- **Rule 1 (Management):** W2 Management accounts can convert any CRM lead to an active project at any time.
- **Rule 2 (1099 Sales):** 1099 Sales Reps can promote **only their own assigned leads** once qualified:
  - **Automatic Promotion:** Checking **"Audit Scheduled"** on the sales checklist automatically creates the linked project.
  - **Manual Promotion:** Clicking **"Promote to active project"** in the lead header or qualification banner initiates the conversion.
- **Data Decoupling:** Initial conversion copies over the School District name, primary campus, address, site list, estimated cost, and key facility contacts. After creation, technical engineering specifications and PG&E utility records remain decoupled so sales reps cannot overwrite engineering data.
- **Live PM Status in CRM:** On the CRM lead page, sales reps see a read-only live status banner displaying the project category, stage, and assigned PM, keeping sales informed without exposing operational controls.

#### 3. Category Stages & Workflow Lifecycle
Projects advance through six structured stages in the PM module:

1. **Development**
   - `AUDIT_SCHEDULED` — On-site facility energy audit scheduled with school district.
   - `AUDIT_COMPLETED` — Engineering audit completed; utility meter data collected.
   - `SCOPING` — LED, HVAC, controls retrofit scope defined.
   - `PROPOSAL_DELIVERED` — Turnkey financial proposal delivered to school board / CBO.
2. **PG&E Approval**
   - `APPLICATION_SUBMITTED` — Formal OBF rebate application submitted to PG&E.
   - `ENGINEERING_REVIEW` — PG&E energy efficiency engineering team review.
   - `CUSTOMER_SIGNATURE` — Customer signature packet and utility authorization.
   - `APPROVED` — PG&E OBF zero-interest financing officially approved.
3. **Construction**
   - `PROCUREMENT` — Fixtures, lighting materials, and mechanical equipment ordered.
   - `INSTALLATION_SCHEDULED` — Contractor installation schedule coordinated with school calendar.
   - `INSTALLATION_IN_PROGRESS` — Active electrical/mechanical construction on campus.
   - `PUNCH_LIST` — Field inspection and quality assurance walk-through.
4. **Closeout**
   - `POST_INSPECTION` — PG&E post-installation inspection and meter verification.
   - `TRUE_UP` — Energy savings calculations verified against utility baselines.
   - `INCENTIVE_PAID` — Financing clearance and OBF loan terms executed on PG&E bill.
5. **Completed**
   - Permanent archive of successfully executed energy efficiency retrofits.
6. **On Hold / Cancelled**
   - Projects delayed by utility capacity, district funding holds, or school board deferrals.

#### 4. Project Operations & Features
- **Board & List Views:** Toggle between interactive visual Kanban stage cards or a compact data table with inline badges.
- **Attention Counter:** Real-time badge highlighting projects that require immediate engineering or utility action.
- **Portfolio Financing Total:** Real-time calculation of active OBF financing values across active projects.
- **Assigned PM Assignment:** Dropdown strictly restricted to W2 Management and Super Admin employees (1099 contractors are excluded from PM assignment).
- **Direct CRM Deal Link:** Click **"View CRM Deal →"** inside any project modal to inspect the originating sales history.
- **Keyboard Shortcuts:** Press `Esc` to dismiss modals; press `Enter` to instantly save/create projects.

#### 5. Project Archival & Trash (Deleted Projects)
- **Safe Soft Deletion:** Deleting a project moves it to the **Deleted Projects** archive. It is excluded from active counts and portfolio value calculations, but preserves historical data and connected lead linkages.
- **Trash Management (`/projects/deleted`):** W2 Management accounts can view all archived projects, see who deleted them and when, restore projects back to active stages with one click, or permanently purge records.

---

## Project Structure

```
app/
├── (auth)/                  # Login, register, password reset (no nav)
├── (app)/                   # Protected authenticated application
│   ├── page.tsx             # Role-aware home dashboard (Sales CRM / Project Management)
│   ├── layout.tsx           # Global header navigation with RBAC filtering
│   ├── sales/               # Sales CRM module
│   │   ├── page.tsx         # Lead list with status & assignee filters
│   │   ├── new/             # Create new lead
│   │   ├── [id]/            # Lead detail, 16-step checklist & live PM banner
│   │   └── deleted/         # Deleted leads archive (Management only)
│   └── projects/            # Project Management module (Management only)
│       ├── layout.tsx       # Server-side route guard (redirects non-management to /sales)
│       ├── page.tsx         # Kanban board & list view of projects by stage
│       └── deleted/         # Deleted projects trash & restore page
└── api/
    ├── auth/                # register · login · logout · reset-password · me
    ├── leads/               # Lead CRUD, checklist updates & soft deletion
    │   ├── [id]/convert/    # Lead-to-project promotion endpoint (Rule 1 & Rule 2)
    │   ├── [id]/restore/    # Lead restoration endpoint (Management only)
    │   └── deleted/         # Deleted leads query (Management only)
    ├── projects/            # Project list, creation & stage counts (Management only)
    │   ├── [id]/            # Project detail, update & soft deletion (Management only)
    │   ├── [id]/restore/    # Project restoration endpoint (Management only)
    │   └── deleted/         # Project trash list & permanent purge (Management only)
    ├── users/               # User management & assignee directory (Management only)
    └── export/              # Role-governed Excel export (Sales: own leads / Management: all)
lib/
├── db.ts                    # SQLite init, schema tables & indexes
├── jwt.ts                   # JWT sign/verify (jose)
├── auth.ts                  # getCurrentUser() server helper
├── projects.ts              # Lead-to-project conversion engine
└── types.ts                 # TypeScript types (Leads, Projects, Stages)
components/
├── projects/                # Project Management UI components
│   ├── ProjectSidebar.tsx   # Category stage navigation, counts & trash link
│   ├── ProjectCard.tsx      # Kanban card with sub-status badges & cost
│   ├── ProjectDetailModal.tsx # Full project inspector, PG&E ID, PM assignment & notes
│   └── NewProjectModal.tsx  # Standalone project creation modal
├── ChecklistPanel.tsx       # 16-step sales pipeline checklist
├── LeadForm.tsx             # Create & edit lead form with site cost calculations
└── LogoutButton.tsx         # Secure session logout
```

---

## GCP Deployment Notes

The app runs on a single **GCP e2-micro free-tier VM**:

1. SSH into the VM and clone the repository.
2. Install Node.js 20+ and build tools.
3. Configure production environment variables in `.env.local` (`JWT_SECRET`, `SESSION_SECRET`, SMTP credentials).
4. Run `npm install && npm run build`.
5. Use `pm2` or `systemd` to keep the Next.js process running daemonized.
6. Configure Nginx with Let's Encrypt SSL certificates reverse-proxying to `localhost:3000`.

> **Database Backup:** All production data is housed in `data/coredesk.db`. Schedule automated cron backups of `data/` using standard SQLite backup scripts or snapshot tooling.