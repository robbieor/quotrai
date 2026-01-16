// SQLite Database Initialization Script
// Run this to create all tables for local development

import Database from "better-sqlite3";
import path from "path";

const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), "quotr.db");
console.log(`Initializing SQLite database at: ${dbPath}`);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
-- Session table for express-session
CREATE TABLE IF NOT EXISTS session (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expire TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS session_expire_idx ON session(expire);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email_verified INTEGER DEFAULT 0 NOT NULL,
  verification_token TEXT,
  verification_expiry TEXT,
  password_reset_token TEXT,
  password_reset_expiry TEXT,
  is_super_admin INTEGER DEFAULT 0 NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS users_email_verified_idx ON users(email_verified);
CREATE INDEX IF NOT EXISTS users_verification_token_idx ON users(verification_token);
CREATE INDEX IF NOT EXISTS users_password_reset_token_idx ON users(password_reset_token);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  trade_type TEXT,
  country TEXT DEFAULT 'IE',
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS organizations_code_idx ON organizations(code);
CREATE INDEX IF NOT EXISTS organizations_trade_type_idx ON organizations(trade_type);

-- Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff',
  status TEXT NOT NULL DEFAULT 'active',
  invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  invited_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  joined_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS org_members_user_id_idx ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS org_members_org_id_idx ON organization_members(organization_id);

-- Organization invitations table
CREATE TABLE IF NOT EXISTS organization_invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS org_invitations_token_idx ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS org_invitations_email_idx ON organization_invitations(email);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  business_name TEXT,
  business_owner_name TEXT,
  business_number TEXT,
  trade_type TEXT,
  county TEXT,
  phone TEXT,
  mobile TEXT,
  website TEXT,
  address TEXT,
  address_2 TEXT,
  address_3 TEXT,
  vat_number TEXT,
  invoice_number_prefix TEXT DEFAULT 'INV',
  quote_number_prefix TEXT DEFAULT 'QUO',
  next_invoice_number INTEGER DEFAULT 1,
  next_quote_number INTEGER DEFAULT 1,
  default_email_subject TEXT,
  default_email_message TEXT,
  send_email_copy INTEGER DEFAULT 0,
  paypal_email TEXT,
  cheque_payable_to TEXT,
  payment_instructions TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  secondary_email TEXT,
  mobile TEXT,
  phone TEXT,
  fax TEXT,
  contact TEXT,
  address TEXT,
  address_2 TEXT,
  address_3 TEXT,
  eircode TEXT,
  latitude TEXT,
  longitude TEXT,
  payment_terms INTEGER DEFAULT 30,
  price_list_id INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS clients_user_id_idx ON clients(user_id);
CREATE INDEX IF NOT EXISTS clients_org_id_idx ON clients(organization_id);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  vendor TEXT NOT NULL,
  amount TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  receipt_image_url TEXT,
  job_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON expenses(user_id);
CREATE INDEX IF NOT EXISTS expenses_user_date_idx ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS expenses_org_id_idx ON expenses(organization_id);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  subtotal TEXT NOT NULL DEFAULT '0',
  discount TEXT NOT NULL DEFAULT '0',
  vat_rate TEXT NOT NULL DEFAULT '0.23',
  vat_amount TEXT NOT NULL DEFAULT '0',
  total TEXT NOT NULL DEFAULT '0',
  taxable TEXT NOT NULL DEFAULT '0',
  paid_amount TEXT NOT NULL DEFAULT '0',
  status TEXT NOT NULL DEFAULT 'draft',
  paid_date TEXT,
  payment_method TEXT,
  payment_details TEXT,
  po_number TEXT,
  payment_info TEXT,
  notes TEXT,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_payment_link TEXT,
  public_token TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON invoices(user_id);
CREATE INDEX IF NOT EXISTS invoices_user_date_idx ON invoices(user_id, date);
CREATE INDEX IF NOT EXISTS invoices_user_status_idx ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS invoices_client_id_idx ON invoices(client_id);
CREATE INDEX IF NOT EXISTS invoices_org_id_idx ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS invoices_public_token_idx ON invoices(public_token);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity TEXT NOT NULL DEFAULT '1',
  rate TEXT NOT NULL DEFAULT '0',
  amount TEXT NOT NULL DEFAULT '0',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  template_version_id INTEGER,
  trade_type_at_creation TEXT,
  date TEXT NOT NULL,
  valid_until TEXT,
  subtotal TEXT NOT NULL DEFAULT '0',
  discount TEXT NOT NULL DEFAULT '0',
  vat_rate TEXT NOT NULL DEFAULT '0.23',
  vat_amount TEXT NOT NULL DEFAULT '0',
  total TEXT NOT NULL DEFAULT '0',
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  converted_to_invoice_id INTEGER,
  customer_signature TEXT,
  customer_signed_at TEXT,
  customer_signed_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS quotes_user_id_idx ON quotes(user_id);
CREATE INDEX IF NOT EXISTS quotes_user_date_idx ON quotes(user_id, date);
CREATE INDEX IF NOT EXISTS quotes_org_id_idx ON quotes(organization_id);

-- Quote items table
CREATE TABLE IF NOT EXISTS quote_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity TEXT NOT NULL DEFAULT '1',
  rate TEXT NOT NULL DEFAULT '0',
  amount TEXT NOT NULL DEFAULT '0',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Invoice branding table
CREATE TABLE IF NOT EXISTS invoice_branding (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  logo_data_uri TEXT,
  primary_color TEXT DEFAULT '#0A7EA4',
  accent_color TEXT DEFAULT '#F59E0B',
  header_color TEXT DEFAULT '#1f2937',
  template TEXT DEFAULT 'modern',
  font_style TEXT DEFAULT 'sans-serif',
  header_layout TEXT DEFAULT 'left',
  footer_text TEXT,
  terms_text TEXT,
  show_vat_number INTEGER DEFAULT 1,
  show_payment_details INTEGER DEFAULT 1,
  show_notes INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS invoice_branding_org_id_idx ON invoice_branding(organization_id);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity TEXT NOT NULL DEFAULT '1',
  unit TEXT DEFAULT 'each',
  unit_cost TEXT NOT NULL DEFAULT '0',
  total_cost TEXT NOT NULL DEFAULT '0',
  supplier TEXT,
  date TEXT NOT NULL,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  receipt_image_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS materials_user_id_idx ON materials(user_id);
CREATE INDEX IF NOT EXISTS materials_user_date_idx ON materials(user_id, date);
CREATE INDEX IF NOT EXISTS materials_org_id_idx ON materials(organization_id);

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  job_site_id INTEGER,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  duration INTEGER NOT NULL,
  hourly_rate TEXT NOT NULL DEFAULT '0',
  amount TEXT NOT NULL DEFAULT '0',
  is_billable INTEGER NOT NULL DEFAULT 1,
  is_billed INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  latitude TEXT,
  longitude TEXT,
  accuracy TEXT,
  address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS time_entries_user_id_idx ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS time_entries_user_date_idx ON time_entries(user_id, date);
CREATE INDEX IF NOT EXISTS time_entries_org_id_idx ON time_entries(organization_id);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_org_id_idx ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at);

-- Saved items table
CREATE TABLE IF NOT EXISTS saved_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rate TEXT NOT NULL DEFAULT '0',
  vat_rate TEXT NOT NULL DEFAULT '0.23',
  unit TEXT DEFAULT 'each',
  category TEXT DEFAULT 'service',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS saved_items_org_id_idx ON saved_items(organization_id);

-- Service templates table
CREATE TABLE IF NOT EXISTS service_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  vat_rate TEXT NOT NULL DEFAULT '0.23',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS service_templates_org_id_idx ON service_templates(organization_id);

-- Service template items table
CREATE TABLE IF NOT EXISTS service_template_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES service_templates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity TEXT NOT NULL DEFAULT '1',
  rate TEXT NOT NULL DEFAULT '0',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS service_template_items_template_id_idx ON service_template_items(template_id);

-- Job sites table
CREATE TABLE IF NOT EXISTS job_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT,
  eircode TEXT,
  latitude TEXT,
  longitude TEXT,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  is_active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  budgeted_hours TEXT,
  default_hourly_rate TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS job_sites_user_id_idx ON job_sites(user_id);
CREATE INDEX IF NOT EXISTS job_sites_org_id_idx ON job_sites(organization_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_org_id_idx ON notifications(organization_id);
`);

console.log("✅ Database tables created successfully!");
console.log("You can now register an account and start using Quotr.");

db.close();
