import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";


const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "coredesk.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      dept TEXT NOT NULL DEFAULT 'Sales',
      blocked INTEGER NOT NULL DEFAULT 0,
      requires_password_change INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      title TEXT,
      notes TEXT,
      office_address TEXT,
      status TEXT NOT NULL DEFAULT 'Cold',
      last_contact_date TEXT,
      assigned_to INTEGER REFERENCES users(id),
      sites TEXT,
      number_of_sites INTEGER,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT,
      deleted_by INTEGER REFERENCES users(id),
      original_assigned_to INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lead_checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      item_key TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      UNIQUE(lead_id, item_key)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'DEVELOPMENT',
      sub_status TEXT NOT NULL DEFAULT 'AUDIT_SCHEDULED',
      project_type TEXT NOT NULL DEFAULT 'Comprehensive (LED + HVAC)',
      utility_provider TEXT NOT NULL DEFAULT 'PG&E',
      pge_application_id TEXT,
      estimated_cost REAL NOT NULL DEFAULT 0,
      assigned_pm_id INTEGER REFERENCES users(id),
      target_completion_date TEXT,
      site_name TEXT,
      client_address TEXT,
      key_contacts TEXT,
      source_crm_deal_id INTEGER REFERENCES leads(id),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
    CREATE INDEX IF NOT EXISTS idx_projects_sub_status ON projects(sub_status);
    CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON projects(lead_id);

    CREATE TABLE IF NOT EXISTS service_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT NOT NULL UNIQUE,
      client_name TEXT NOT NULL,
      client_phone TEXT,
      client_email TEXT,
      job_site_address TEXT,
      request_date TEXT NOT NULL DEFAULT (datetime('now')),
      appointed_date TEXT,
      assignee_id INTEGER REFERENCES users(id),
      service_technician TEXT,
      warranty_labor TEXT NOT NULL DEFAULT 'Covered',
      warranty_materials TEXT NOT NULL DEFAULT 'Covered',
      detail TEXT,
      materials_needed TEXT,
      equipment_needed TEXT,
      technician_notes TEXT,
      priority TEXT NOT NULL DEFAULT 'Normal',
      completion_status TEXT NOT NULL DEFAULT 'Not yet',
      completed_at TEXT,
      completed_by INTEGER REFERENCES users(id),
      linked_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT,
      deleted_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_service_calls_ticket ON service_calls(ticket_number);
    CREATE INDEX IF NOT EXISTS idx_service_calls_completion ON service_calls(completion_status);
    CREATE INDEX IF NOT EXISTS idx_service_calls_client ON service_calls(client_name);
    CREATE INDEX IF NOT EXISTS idx_service_calls_appointed_date ON service_calls(appointed_date);
    CREATE INDEX IF NOT EXISTS idx_service_calls_is_deleted ON service_calls(is_deleted);
  `);

  // Migration: add site_name, client_address, key_contacts, source_crm_deal_id to projects table
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN site_name TEXT`);
  } catch {}

  try {
    db.exec(`ALTER TABLE projects ADD COLUMN client_address TEXT`);
  } catch {}

  try {
    db.exec(`ALTER TABLE projects ADD COLUMN key_contacts TEXT`);
  } catch {}

  try {
    db.exec(`ALTER TABLE projects ADD COLUMN source_crm_deal_id INTEGER REFERENCES leads(id)`);
  } catch {}

  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_source_deal ON projects(source_crm_deal_id)`);
  } catch {}

  // Migration: soft-delete columns on projects table
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0`);
  } catch {}

  try {
    db.exec(`ALTER TABLE projects ADD COLUMN deleted_at TEXT`);
  } catch {}

  try {
    db.exec(`ALTER TABLE projects ADD COLUMN deleted_by INTEGER REFERENCES users(id)`);
  } catch {}

  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_is_deleted ON projects(is_deleted)`);
  } catch {}

  // Migration: soft-delete columns on leads table
  try {
    db.exec(`ALTER TABLE leads ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0`);
  } catch {}

  try {
    db.exec(`ALTER TABLE leads ADD COLUMN deleted_at TEXT`);
  } catch {}

  try {
    db.exec(`ALTER TABLE leads ADD COLUMN deleted_by INTEGER REFERENCES users(id)`);
  } catch {}

  try {
    db.exec(`ALTER TABLE leads ADD COLUMN original_assigned_to INTEGER REFERENCES users(id)`);
  } catch {}

  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_leads_is_deleted ON leads(is_deleted)`);
  } catch {}

  // Migration: add assigned_to if upgrading from pre-auth schema
  try {
    db.exec(`ALTER TABLE leads ADD COLUMN assigned_to INTEGER`);
  } catch {
    // Column already exists
  }

  // Migration: add blocked and requires_password_change if upgrading users table
  try {
    db.exec(`ALTER TABLE users ADD COLUMN blocked INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE users ADD COLUMN requires_password_change INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }

  // Migration: add phone column
  try {
    db.exec(`ALTER TABLE users ADD COLUMN phone TEXT`);
  } catch {
    // Column already exists
  }

  // Migration: add approved column (default 1 for existing users)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN approved INTEGER NOT NULL DEFAULT 1`);
  } catch {
    // Column already exists
  }

  // Migration: add sites column to leads table
  try {
    db.exec(`ALTER TABLE leads ADD COLUMN sites TEXT`);
  } catch {
    // Column already exists
  }

  // Migration: add number_of_sites column to leads table
  try {
    db.exec(`ALTER TABLE leads ADD COLUMN number_of_sites INTEGER`);
  } catch {
    // Column already exists
  }

  // Migration: normalize legacy status values to new labels
  db.exec(`
    UPDATE leads SET status = 'Positive' WHERE status = 'Pos';
    UPDATE leads SET status = 'Negative' WHERE status = 'Neg';
  `);

  // Migration: Upgrade initial bootstrapped manager to Super Admin
  db.exec(`UPDATE users SET dept = 'Super Admin' WHERE email = 'coredesk.mng@coredesk.com' AND dept = 'Management';`);

  // Seed default super admin if database is empty (production bootstrapping)
  // Skip during next build phase to prevent multi-worker race conditions
  if (process.env.NEXT_PHASE !== "phase-production-build") {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    if (userCount.count === 0) {
      const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || "adminpassword123";
      const passwordHash = bcrypt.hashSync(defaultPassword, 12);
      db.prepare(`
        INSERT OR IGNORE INTO users (first_name, last_name, email, phone, password_hash, dept, requires_password_change, blocked, approved)
        VALUES (?, ?, ?, ?, ?, 'Super Admin', 1, 0, 1)
      `).run("GEI", "SuperAdmin", "coredesk.mng@coredesk.com", "—", passwordHash);
      console.log(`Database seeded with default super admin user: coredesk.mng@coredesk.com / ${process.env.INITIAL_ADMIN_PASSWORD ? "[CUSTOM_FROM_ENV]" : "adminpassword123"}`);
    }


  }

  export default db;

  
