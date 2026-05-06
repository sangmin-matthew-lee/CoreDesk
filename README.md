# CoreDesk

Internal operations platform for **Sales** and **Project Management** teams.

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

## Features

### Authentication

- **Register** — first name, last name, department (Sales / Management), email, password
- **Login / Logout** — JWT stored in `httpOnly` cookie, 7-day expiry
- **Forgot password** — sends a time-limited reset link to the registered email (1-hour expiry). In development, the link is printed to the server console if SMTP is not configured.
- Authenticated users are redirected away from auth pages; unauthenticated users are blocked from all app pages via proxy middleware.

### Role-Based Access (RBAC)


| Role           | Access                                                           |
| -------------- | ---------------------------------------------------------------- |
| **Sales**      | Own leads only — create, view, edit leads assigned to themselves |
| **Management** | Full access — all leads, assign/reassign leads to Sales reps     |


### Sales CRM

- **Lead list** — sortable table showing Lead Status, Name, Company, Title, Pipeline Stage (last completed step), and Progress %
- **Search** — field-scoped search: Name / Company / Title / Sales Rep (SR — Management only)
- **Status filter** — All · Cold · Positive · Negative · Closed
- **Sales Rep column** — visible to Management users only, with avatar initial
- **Lead detail** — full contact info (name, email, phone, company, title, office address, notes)
- **Lead status** — Cold · Positive · Negative · Closed; auto-set to **Closed** when all pipeline steps are completed
- **Pipeline checklist** (16 steps):
- **Progress bar** — real-time completion percentage across checklist
- **Export to Excel** — exports all accessible leads with contact info and checklist status (Management exports all; Sales exports own leads)
- **Assign lead** — Management can assign or reassign a lead to any Sales rep from the create/edit form

### Project Management

- Coming soon

---

---

## Project Structure

```
app/
├── (auth)/              # Login, register, password reset (no nav)
├── (app)/               # Main app pages (protected, nav bar)
│   ├── page.tsx         # Home dashboard
│   └── sales/           # Sales CRM
│       ├── page.tsx     # Lead list
│       ├── new/         # Create lead
│       └── [id]/        # Lead detail + checklist
└── api/
    ├── auth/            # register · login · logout · reset-password
    ├── leads/           # CRUD + role-filtered list
    ├── users/           # List users (Management only)
    └── export/          # Excel export
lib/
├── db.ts                # SQLite init + migrations
├── jwt.ts               # Token sign/verify (edge-compatible)
├── auth.ts              # getCurrentUser() server helper
├── email.ts             # Nodemailer + console fallback
└── types.ts             # Shared TypeScript types
components/
├── StatusBadge.tsx      # Cold / Positive / Negative / Closed badge
├── ChecklistPanel.tsx   # 16-step pipeline checklist with progress bar
├── LeadForm.tsx         # Create / edit lead form
└── LogoutButton.tsx     # Client-side logout
proxy.ts                 # Route protection middleware (Next.js 16)
```

---

## GCP Deployment Notes

The app is designed to run entirely on a **single GCP e2-micro free-tier VM**:

1. SSH into the VM and clone the repo
2. Install Node.js 20+
3. Set production environment variables in `.env.local`
4. Run `npm install && npm run build`
5. Use `pm2` or a `systemd` service to keep `npm start` running
6. Optionally put Nginx in front for HTTPS (with Let's Encrypt)

The `data/coredesk.db` file is the entire database — back it up by copying the file.