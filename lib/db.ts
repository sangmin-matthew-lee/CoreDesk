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
  `);

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

  // Migration: normalize legacy status values to new labels
  db.exec(`
    UPDATE leads SET status = 'Positive' WHERE status = 'Pos';
    UPDATE leads SET status = 'Negative' WHERE status = 'Neg';
  `);

  // Seed default admin if database is empty (production bootstrapping)
  // Skip during next build phase to prevent multi-worker race conditions
  if (process.env.NEXT_PHASE !== "phase-production-build") {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    if (userCount.count === 0) {
      const defaultPassword = "adminpassword123";
      const passwordHash = bcrypt.hashSync(defaultPassword, 12);
      db.prepare(`
        INSERT OR IGNORE INTO users (first_name, last_name, email, phone, password_hash, dept, requires_password_change, blocked, approved)
        VALUES (?, ?, ?, ?, ?, 'Management', 1, 0, 1)
      `).run("CoreDesk", "Manager", "coredesk.mng@coredesk.com", "—", passwordHash);
      console.log("Database seeded with default admin user: coredesk.mng@coredesk.com / adminpassword123");
    }
  }

  export default db;
  
