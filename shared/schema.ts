import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, decimal, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire", { withTimezone: true }).notNull(),
}, (table) => [
  index("session_expire_idx").on(table.expire),
]);

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  verificationExpiry: timestamp("verification_expiry"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("users_email_verified_idx").on(table.emailVerified),
  index("users_verification_token_idx").on(table.verificationToken),
  index("users_password_reset_token_idx").on(table.passwordResetToken),
]);

// Organization roles: owner, admin, staff, viewer
export type OrganizationRole = "owner" | "admin" | "staff" | "viewer";

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 12 }).notNull().unique(),
  name: text("name").notNull(),
  tradeType: text("trade_type"), // electrician, plumber, carpentry_joinery - required after onboarding
  country: text("country").default("IE"), // ISO country code, default Ireland
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("organizations_code_idx").on(table.code),
  index("organizations_trade_type_idx").on(table.tradeType),
]);

export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("staff"), // owner, admin, staff, viewer
  status: text("status").notNull().default("active"), // active, pending, inactive
  invitedBy: varchar("invited_by").references(() => users.id, { onDelete: "set null" }),
  invitedAt: timestamp("invited_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  joinedAt: timestamp("joined_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("org_member_unique_idx").on(table.organizationId, table.userId),
  index("org_members_user_id_idx").on(table.userId),
  index("org_members_org_id_idx").on(table.organizationId),
]);

export const organizationInvitations = pgTable("organization_invitations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("staff"),
  token: text("token").notNull().unique(),
  invitedBy: varchar("invited_by").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, expired
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("org_invitations_token_idx").on(table.token),
  index("org_invitations_email_idx").on(table.email),
]);

// Trade types for template filtering (v1: single-select, future: multi-trade)
export const TEMPLATE_TRADE_TYPES = [
  "electrician",
  "plumber",
  "carpentry_joinery",
] as const;
export type TemplateTradeType = typeof TEMPLATE_TRADE_TYPES[number];

// Display names for trade types
export const TRADE_TYPE_LABELS: Record<TemplateTradeType, string> = {
  electrician: "Electrician",
  plumber: "Plumber",
  carpentry_joinery: "Carpentry & Joinery",
};

// Trade types for Irish market (expandable for global) - legacy display list
export const TRADE_TYPES = [
  "Plumber",
  "Electrician",
  "Builder",
  "Carpenter",
  "Roofer",
  "Painter & Decorator",
  "Plasterer",
  "Tiler",
  "Landscaper",
  "HVAC / Heating",
  "Mechanic",
  "Locksmith",
  "Glazier",
  "Welder",
  "General Contractor",
  "Other",
] as const;

// Irish counties for regional data
export const IRISH_COUNTIES = [
  "Antrim",
  "Armagh",
  "Carlow",
  "Cavan",
  "Clare",
  "Cork",
  "Derry",
  "Donegal",
  "Down",
  "Dublin",
  "Fermanagh",
  "Galway",
  "Kerry",
  "Kildare",
  "Kilkenny",
  "Laois",
  "Leitrim",
  "Limerick",
  "Longford",
  "Louth",
  "Mayo",
  "Meath",
  "Monaghan",
  "Offaly",
  "Roscommon",
  "Sligo",
  "Tipperary",
  "Tyrone",
  "Waterford",
  "Westmeath",
  "Wexford",
  "Wicklow",
] as const;

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  businessName: text("business_name"),
  businessOwnerName: text("business_owner_name"),
  businessNumber: text("business_number"),
  tradeType: text("trade_type"),
  county: text("county"),
  phone: text("phone"),
  mobile: text("mobile"),
  website: text("website"),
  address: text("address"),
  address2: text("address_2"),
  address3: text("address_3"),
  vatNumber: text("vat_number"),
  invoiceNumberPrefix: text("invoice_number_prefix").default("INV"),
  quoteNumberPrefix: text("quote_number_prefix").default("QUO"),
  nextInvoiceNumber: integer("next_invoice_number").default(1),
  nextQuoteNumber: integer("next_quote_number").default(1),
  defaultEmailSubject: text("default_email_subject"),
  defaultEmailMessage: text("default_email_message"),
  sendEmailCopy: boolean("send_email_copy").default(false),
  paypalEmail: text("paypal_email"),
  chequePayableTo: text("cheque_payable_to"),
  paymentInstructions: text("payment_instructions"),
  // Stripe Connect fields for receiving payments
  stripeAccountId: text("stripe_account_id"), // acct_xxx
  stripeAccountStatus: text("stripe_account_status"), // pending, active, restricted, disabled
  stripeAccountOnboardingComplete: boolean("stripe_account_onboarding_complete").default(false),
  stripeAccountPayoutsEnabled: boolean("stripe_account_payouts_enabled").default(false),
  stripeAccountChargesEnabled: boolean("stripe_account_charges_enabled").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  mobile: text("mobile"),
  phone: text("phone"),
  address: text("address"),
  eircode: text("eircode"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  paymentTerms: integer("payment_terms").default(30),
  priceListId: integer("price_list_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("clients_user_id_idx").on(table.userId),
  index("clients_org_id_idx").on(table.organizationId),
  index("clients_price_list_id_idx").on(table.priceListId),
]);

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, cancelled
  date: timestamp("date").notNull(),
  startTime: text("start_time"), // e.g., "09:00"
  estimatedDuration: text("estimated_duration"), // e.g., "2 hours"
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("jobs_user_id_idx").on(table.userId),
  index("jobs_org_id_idx").on(table.organizationId),
  index("jobs_client_id_idx").on(table.clientId),
]);

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  vendor: text("vendor").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  description: text("description"),
  receiptImageUrl: text("receipt_image_url"),
  jobId: integer("job_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("expenses_user_id_idx").on(table.userId),
  index("expenses_user_date_idx").on(table.userId, table.date),
  index("expenses_org_id_idx").on(table.organizationId),
]);

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  date: timestamp("date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull().default("0.23"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
  taxable: decimal("taxable", { precision: 10, scale: 2 }).notNull().default("0"),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("draft"),
  paidDate: timestamp("paid_date"),
  paymentMethod: text("payment_method"),
  paymentDetails: text("payment_details"),
  poNumber: text("po_number"),
  paymentInfo: text("payment_info"),
  notes: text("notes"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentLink: text("stripe_payment_link"),
  publicToken: text("public_token"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("invoices_user_id_idx").on(table.userId),
  index("invoices_user_date_idx").on(table.userId, table.date),
  index("invoices_user_status_idx").on(table.userId, table.status),
  index("invoices_client_id_idx").on(table.clientId),
  index("invoices_org_id_idx").on(table.organizationId),
  index("invoices_public_token_idx").on(table.publicToken),
]);

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull().default("0"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const savedItems = pgTable("saved_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull().default("0"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull().default("0.23"),
  unit: text("unit").default("each"),
  category: text("category").default("service"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("saved_items_org_id_idx").on(table.organizationId),
  index("saved_items_category_idx").on(table.category),
]);

export const serviceTemplates = pgTable("service_templates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  notes: text("notes"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull().default("0.23"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("service_templates_org_id_idx").on(table.organizationId),
]);

export const serviceTemplateItems = pgTable("service_template_items", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => serviceTemplates.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("service_template_items_template_id_idx").on(table.templateId),
]);

// Template categories for organizing templates
export const TEMPLATE_CATEGORIES = [
  "callout",
  "compliance",
  "install",
  "projects",
  "contracts",
  "diagnostic",
  "maintenance",
  "repair",
] as const;
export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];

// Global templates - shared catalog filtered by trade type
export const globalTemplates = pgTable("global_templates", {
  id: serial("id").primaryKey(),
  tradeType: text("trade_type").notNull(), // electrician, plumber, carpentry_joinery
  category: text("category").notNull().default("callout"), // callout, compliance, install, projects, contracts
  name: text("name").notNull(),
  description: text("description"),
  notes: text("notes"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull().default("0.23"),
  country: text("country").notNull().default("IE"), // ISO country code
  isActive: boolean("is_active").notNull().default(true),
  isRecommended: boolean("is_recommended").notNull().default(false), // Featured templates for trade
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("global_templates_trade_type_idx").on(table.tradeType),
  index("global_templates_category_idx").on(table.category),
  index("global_templates_trade_category_idx").on(table.tradeType, table.category),
  index("global_templates_country_idx").on(table.country),
]);

// Template versions for immutable history - quotes reference specific versions
export const templateVersions = pgTable("template_versions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => globalTemplates.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  definitionJson: text("definition_json").notNull(), // JSON of template items at this version
  isCurrent: boolean("is_current").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("template_versions_template_id_idx").on(table.templateId),
  index("template_versions_current_idx").on(table.templateId, table.isCurrent),
]);

// Global template line items (for current version editing)
export const globalTemplateItems = pgTable("global_template_items", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => globalTemplates.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull().default("0"),
  unit: text("unit").default("each"), // each, hour, sqm, linear metre, etc.
  isOptional: boolean("is_optional").notNull().default(false), // Add-on items
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("global_template_items_template_id_idx").on(table.templateId),
]);

export const insertGlobalTemplateSchema = createInsertSchema(globalTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateVersionSchema = createInsertSchema(templateVersions).omit({
  id: true,
  createdAt: true,
});

export const insertGlobalTemplateItemSchema = createInsertSchema(globalTemplateItems).omit({
  id: true,
  createdAt: true,
});

export const recurringInvoices = pgTable("recurring_invoices", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  frequency: text("frequency").notNull().default("monthly"),
  dayOfMonth: integer("day_of_month").default(1),
  dayOfWeek: integer("day_of_week"),
  nextDate: timestamp("next_date").notNull(),
  endDate: timestamp("end_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull().default("0.23"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
  paymentInfo: text("payment_info"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  lastGeneratedDate: timestamp("last_generated_date"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("recurring_invoices_org_id_idx").on(table.organizationId),
]);

export const recurringInvoiceItems = pgTable("recurring_invoice_items", {
  id: serial("id").primaryKey(),
  recurringInvoiceId: integer("recurring_invoice_id").notNull().references(() => recurringInvoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull().default("0"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  quoteNumber: text("quote_number").notNull(),
  templateVersionId: integer("template_version_id").references(() => templateVersions.id, { onDelete: "set null" }), // Immutable template snapshot
  tradeTypeAtCreation: text("trade_type_at_creation"), // Preserve org's trade at time of quote creation
  date: timestamp("date").notNull(),
  validUntil: timestamp("valid_until"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull().default("0.23"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("open"),
  notes: text("notes"),
  convertedToInvoiceId: integer("converted_to_invoice_id"),
  customerSignature: text("customer_signature"),
  customerSignedAt: timestamp("customer_signed_at"),
  customerSignedName: text("customer_signed_name"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("quotes_user_id_idx").on(table.userId),
  index("quotes_user_date_idx").on(table.userId, table.date),
  index("quotes_org_id_idx").on(table.organizationId),
  index("quotes_template_version_idx").on(table.templateVersionId),
]);

export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull().default("0"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type VariationStatus = "draft" | "pending_approval" | "approved" | "rejected" | "invoiced";

export const variationOrders = pgTable("variation_orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  parentQuoteId: integer("parent_quote_id").references(() => quotes.id, { onDelete: "set null" }),
  parentInvoiceId: integer("parent_invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  variationNumber: text("variation_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  reason: text("reason"),
  date: timestamp("date").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull().default("0.23"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("draft"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  convertedToInvoiceId: integer("converted_to_invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("variations_user_id_idx").on(table.userId),
  index("variations_org_id_idx").on(table.organizationId),
  index("variations_org_status_idx").on(table.organizationId, table.status),
  index("variations_org_date_idx").on(table.organizationId, table.date),
  index("variations_client_id_idx").on(table.clientId),
  index("variations_parent_quote_idx").on(table.parentQuoteId),
  index("variations_parent_invoice_idx").on(table.parentInvoiceId),
]);

export const variationItems = pgTable("variation_items", {
  id: serial("id").primaryKey(),
  variationId: integer("variation_id").notNull().references(() => variationOrders.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull().default("0"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("variation_items_variation_id_idx").on(table.variationId),
]);

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
  createdAt: true,
});

export const insertSavedItemSchema = createInsertSchema(savedItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({
  id: true,
  createdAt: true,
});

export const insertVariationOrderSchema = createInsertSchema(variationOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVariationItemSchema = createInsertSchema(variationItems).omit({
  id: true,
  createdAt: true,
});

export const insertRecurringInvoiceSchema = createInsertSchema(recurringInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecurringInvoiceItemSchema = createInsertSchema(recurringInvoiceItems).omit({
  id: true,
  createdAt: true,
});

export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  duration: integer("duration").notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull().default("0"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  isBillable: boolean("is_billable").notNull().default(true),
  isBilled: boolean("is_billed").notNull().default(false),
  notes: text("notes"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  accuracy: decimal("accuracy", { precision: 10, scale: 2 }),
  address: text("address"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("time_entries_user_id_idx").on(table.userId),
  index("time_entries_user_date_idx").on(table.userId, table.date),
  index("time_entries_org_id_idx").on(table.organizationId),
  index("time_entries_job_id_idx").on(table.jobId),
]);

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // e.g., "create_invoice", "view_report", "login"
  entityType: text("entity_type"), // e.g., "invoice", "quote", "material"
  entityId: integer("entity_id"),
  details: text("details"), // JSON string for extra context
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("activity_logs_user_id_idx").on(table.userId),
  index("activity_logs_org_id_idx").on(table.organizationId),
  index("activity_logs_created_at_idx").on(table.createdAt),
]);

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export const invoiceBranding = pgTable("invoice_branding", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  logoDataUri: text("logo_data_uri"),
  primaryColor: text("primary_color").default("#0A7EA4"),
  accentColor: text("accent_color").default("#F59E0B"),
  headerColor: text("header_color").default("#1f2937"),
  template: text("template").default("modern"),
  fontStyle: text("font_style").default("sans-serif"),
  headerLayout: text("header_layout").default("left"),
  footerText: text("footer_text"),
  termsText: text("terms_text"),
  showVatNumber: boolean("show_vat_number").default(true),
  showPaymentDetails: boolean("show_payment_details").default(true),
  showNotes: boolean("show_notes").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("invoice_branding_org_id_idx").on(table.organizationId),
]);

export const insertInvoiceBrandingSchema = createInsertSchema(invoiceBranding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const cashPayments = pgTable("cash_payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  receivedById: varchar("received_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receivedByName: text("received_by_name").notNull(),
  receivedAt: timestamp("received_at").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("cash_payments_invoice_id_idx").on(table.invoiceId),
  index("cash_payments_org_id_idx").on(table.organizationId),
  index("cash_payments_received_at_idx").on(table.organizationId, table.receivedAt),
]);

export const insertCashPaymentSchema = createInsertSchema(cashPayments).omit({
  id: true,
  createdAt: true,
});

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unit: text("unit").default("each"),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  supplier: text("supplier"),
  date: timestamp("date").notNull(),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  receiptImageUrl: text("receipt_image_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("materials_user_id_idx").on(table.userId),
  index("materials_user_date_idx").on(table.userId, table.date),
  index("materials_client_id_idx").on(table.clientId),
  index("materials_org_id_idx").on(table.organizationId),
]);

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});



// Clock entries for GPS-verified time tracking
export const clockEntries = pgTable("clock_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  clockInTime: timestamp("clock_in_time").notNull(),
  clockOutTime: timestamp("clock_out_time"),
  clockInLatitude: decimal("clock_in_latitude", { precision: 10, scale: 7 }),
  clockInLongitude: decimal("clock_in_longitude", { precision: 10, scale: 7 }),
  clockInAccuracy: decimal("clock_in_accuracy", { precision: 10, scale: 2 }), // GPS accuracy in meters
  clockInAddress: text("clock_in_address"), // Reverse geocoded address
  clockInEircode: varchar("clock_in_eircode", { length: 8 }),
  clockOutLatitude: decimal("clock_out_latitude", { precision: 10, scale: 7 }),
  clockOutLongitude: decimal("clock_out_longitude", { precision: 10, scale: 7 }),
  clockOutAccuracy: decimal("clock_out_accuracy", { precision: 10, scale: 2 }), // GPS accuracy in meters
  clockOutAddress: text("clock_out_address"),
  clockOutEircode: varchar("clock_out_eircode", { length: 8 }),
  clockInDistanceMeters: integer("clock_in_distance_meters"), // Distance from job site at clock-in
  clockOutDistanceMeters: integer("clock_out_distance_meters"), // Distance from job site at clock-out
  clockInVerified: boolean("clock_in_verified").default(false), // True if within geofence
  clockOutVerified: boolean("clock_out_verified").default(false),
  totalMinutes: integer("total_minutes"), // Calculated on clock-out
  breakMinutes: integer("break_minutes").default(0), // Total break time
  billableMinutes: integer("billable_minutes"), // totalMinutes - breakMinutes
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }), // Rate for this entry
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }), // Calculated billable amount
  workDescription: text("work_description"), // What was done during shift
  completionNotes: text("completion_notes"), // Notes added on clock-out
  notes: text("notes"),
  adminNotes: text("admin_notes"), // Notes from admin about discrepancies
  isBillable: boolean("is_billable").default(true),
  status: text("status").notNull().default("active"), // active, completed, invoiced, flagged
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("clock_entries_user_id_idx").on(table.userId),
  index("clock_entries_org_id_idx").on(table.organizationId),
  index("clock_entries_job_id_idx").on(table.jobId),
  index("clock_entries_clock_in_time_idx").on(table.clockInTime),
  index("clock_entries_status_idx").on(table.status),
]);

export const insertClockEntrySchema = createInsertSchema(clockEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Breaks table for tracking multiple breaks per shift
export const clockEntryBreaks = pgTable("clock_entry_breaks", {
  id: serial("id").primaryKey(),
  clockEntryId: integer("clock_entry_id").notNull().references(() => clockEntries.id, { onDelete: "cascade" }),
  breakStart: timestamp("break_start").notNull(),
  breakEnd: timestamp("break_end"),
  durationMinutes: integer("duration_minutes"),
  isPaid: boolean("is_paid").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("clock_entry_breaks_clock_entry_id_idx").on(table.clockEntryId),
]);

export const insertClockEntryBreakSchema = createInsertSchema(clockEntryBreaks).omit({
  id: true,
  createdAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({
  id: true,
  createdAt: true,
});

export const insertOrganizationInvitationSchema = createInsertSchema(organizationInvitations).omit({
  id: true,
  createdAt: true,
});

// Premium Subscriptions for Data Consultation
export const SUBSCRIPTION_TIERS = ["free", "starter", "professional", "business"] as const;
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  tier: text("tier").notNull().default("free"), // free, starter, professional, business
  status: text("status").notNull().default("inactive"), // active, cancelled, past_due, trialing, inactive
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  hasPaidMigration: boolean("has_paid_migration").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("subscriptions_user_id_idx").on(table.userId),
  index("subscriptions_org_id_idx").on(table.organizationId),
  index("subscriptions_stripe_sub_id_idx").on(table.stripeSubscriptionId),
]);

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Data Consultation Requests
export const CONSULTATION_STATUS = ["pending", "in_progress", "completed", "cancelled"] as const;
export type ConsultationStatus = typeof CONSULTATION_STATUS[number];

export const consultationRequests = pgTable("consultation_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requestType: text("request_type").notNull(), // pricing_analysis, supplier_comparison, industry_benchmark, custom
  status: text("status").notNull().default("pending"),
  priority: text("priority").default("normal"), // normal, high, urgent
  response: text("response"),
  respondedAt: timestamp("responded_at"),
  respondedBy: varchar("responded_by"),
  attachments: text("attachments"), // JSON array of file references
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("consultation_user_id_idx").on(table.userId),
  index("consultation_org_id_idx").on(table.organizationId),
  index("consultation_status_idx").on(table.status),
]);

export const insertConsultationRequestSchema = createInsertSchema(consultationRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type SavedItem = typeof savedItems.$inferSelect;
export type InsertSavedItem = z.infer<typeof insertSavedItemSchema>;
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type RecurringInvoice = typeof recurringInvoices.$inferSelect;
export type InsertRecurringInvoice = z.infer<typeof insertRecurringInvoiceSchema>;
export type RecurringInvoiceItem = typeof recurringInvoiceItems.$inferSelect;
export type InsertRecurringInvoiceItem = z.infer<typeof insertRecurringInvoiceItemSchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type InvoiceBranding = typeof invoiceBranding.$inferSelect;
export type InsertInvoiceBranding = z.infer<typeof insertInvoiceBrandingSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
export type InsertOrganizationInvitation = z.infer<typeof insertOrganizationInvitationSchema>;

export type ClockEntry = typeof clockEntries.$inferSelect;
export type InsertClockEntry = z.infer<typeof insertClockEntrySchema>;
export type ClockEntryBreak = typeof clockEntryBreaks.$inferSelect;
export type InsertClockEntryBreak = z.infer<typeof insertClockEntryBreakSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type ConsultationRequest = typeof consultationRequests.$inferSelect;
export type InsertConsultationRequest = z.infer<typeof insertConsultationRequestSchema>;
export type GlobalTemplate = typeof globalTemplates.$inferSelect;
export type InsertGlobalTemplate = z.infer<typeof insertGlobalTemplateSchema>;
export type TemplateVersion = typeof templateVersions.$inferSelect;
export type InsertTemplateVersion = z.infer<typeof insertTemplateVersionSchema>;
export type GlobalTemplateItem = typeof globalTemplateItems.$inferSelect;
export type InsertGlobalTemplateItem = z.infer<typeof insertGlobalTemplateItemSchema>;

// Employee job assignments - linking employees to jobs
export const employeeJobAssignments = pgTable("employee_job_assignments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeUserId: varchar("employee_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  assignedBy: varchar("assigned_by").references(() => users.id, { onDelete: "set null" }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }), // Employee-specific rate for this job
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("employee_job_assignments_org_id_idx").on(table.organizationId),
  index("employee_job_assignments_employee_idx").on(table.employeeUserId),
  index("employee_job_assignments_job_idx").on(table.jobId),
  uniqueIndex("employee_job_unique_idx").on(table.employeeUserId, table.jobId),
]);

export const insertEmployeeJobAssignmentSchema = createInsertSchema(employeeJobAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Holiday/Leave requests with approval workflow
export const HOLIDAY_STATUS = ["pending", "approved", "rejected", "cancelled"] as const;
export type HolidayStatus = typeof HOLIDAY_STATUS[number];

export const HOLIDAY_TYPES = ["annual_leave", "sick_leave", "personal", "other"] as const;
export type HolidayType = typeof HOLIDAY_TYPES[number];

export const holidayRequests = pgTable("holiday_requests", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeUserId: varchar("employee_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  holidayType: text("holiday_type").notNull().default("annual_leave"), // annual_leave, sick_leave, personal, other
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, cancelled
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  totalDays: decimal("total_days", { precision: 5, scale: 1 }).notNull().default("1"), // Supports half days
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("holiday_requests_org_id_idx").on(table.organizationId),
  index("holiday_requests_employee_idx").on(table.employeeUserId),
  index("holiday_requests_status_idx").on(table.status),
  index("holiday_requests_dates_idx").on(table.startDate, table.endDate),
]);

export const insertHolidayRequestSchema = createInsertSchema(holidayRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// In-app notifications for approvals and updates
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // holiday_request, holiday_approved, holiday_rejected, assignment_added, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  referenceType: text("reference_type"), // holiday_request, job_assignment, etc.
  referenceId: integer("reference_id"), // ID of the related record
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("notifications_user_id_idx").on(table.userId),
  index("notifications_org_id_idx").on(table.organizationId),
  index("notifications_is_read_idx").on(table.isRead),
  index("notifications_created_at_idx").on(table.createdAt),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type EmployeeJobAssignment = typeof employeeJobAssignments.$inferSelect;
export type InsertEmployeeJobAssignment = z.infer<typeof insertEmployeeJobAssignmentSchema>;
export type HolidayRequest = typeof holidayRequests.$inferSelect;
export type InsertHolidayRequest = z.infer<typeof insertHolidayRequestSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Revenue entity types for identifier mapping
export const REVENUE_ENTITY_TYPES = [
  "invoice",
  "quote",
  "expense",
  "recurring_invoice",
  "credit_note",
  "payment",
] as const;
export type RevenueEntityType = typeof REVENUE_ENTITY_TYPES[number];

// Flexible identifier map for all revenue objects
export const revenueIdentifiers = pgTable("revenue_identifiers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // invoice, quote, expense, recurring_invoice, credit_note, payment
  entityId: integer("entity_id").notNull(),
  identifierKey: text("identifier_key").notNull(), // internal_number, legacy_id, external_system_id, po_number, etc.
  identifierValue: text("identifier_value").notNull(),
  sourceSystem: text("source_system"), // For integrations: stripe, quickbooks, xero, legacy_import, etc.
  isPrimary: boolean("is_primary").notNull().default(false),
  metadata: text("metadata"), // JSON string for additional structured data
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("revenue_identifiers_org_id_idx").on(table.organizationId),
  index("revenue_identifiers_entity_idx").on(table.entityType, table.entityId),
  index("revenue_identifiers_key_value_idx").on(table.identifierKey, table.identifierValue),
  uniqueIndex("revenue_identifiers_unique_idx").on(table.organizationId, table.entityType, table.identifierKey, table.identifierValue),
]);

export const insertRevenueIdentifierSchema = createInsertSchema(revenueIdentifiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RevenueIdentifier = typeof revenueIdentifiers.$inferSelect;
export type InsertRevenueIdentifier = z.infer<typeof insertRevenueIdentifierSchema>;

// Price lists for client-specific pricing
export const priceLists = pgTable("price_lists", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  currency: text("currency").notNull().default("EUR"),
  effectiveFrom: timestamp("effective_from"),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("price_lists_org_id_idx").on(table.organizationId),
  index("price_lists_is_default_idx").on(table.organizationId, table.isDefault),
  index("price_lists_is_active_idx").on(table.isActive),
]);

export const insertPriceListSchema = createInsertSchema(priceLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Price list items with unit pricing
export const priceListItems = pgTable("price_list_items", {
  id: serial("id").primaryKey(),
  priceListId: integer("price_list_id").notNull().references(() => priceLists.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // e.g., "Labour", "Materials", "Parts", "Services"
  subCategory: text("sub_category"), // For materials: "Electrical", "Plumbing", etc.
  sku: text("sku"), // Optional stock keeping unit
  unit: text("unit").notNull().default("each"), // each, hour, sqm, linear m, etc.
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull().default("0.23"), // Irish VAT rates
  minQuantity: decimal("min_quantity", { precision: 10, scale: 2 }),
  maxQuantity: decimal("max_quantity", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("price_list_items_price_list_id_idx").on(table.priceListId),
  index("price_list_items_category_idx").on(table.priceListId, table.category),
  index("price_list_items_sku_idx").on(table.sku),
  index("price_list_items_is_active_idx").on(table.isActive),
]);

export const insertPriceListItemSchema = createInsertSchema(priceListItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PriceList = typeof priceLists.$inferSelect;
export type InsertPriceList = z.infer<typeof insertPriceListSchema>;
export type PriceListItem = typeof priceListItems.$inferSelect;
export type InsertPriceListItem = z.infer<typeof insertPriceListItemSchema>;

// Supplier invoices - for tracking purchases from suppliers (CEF, Trade Electric, etc.)
export const supplierInvoices = pgTable("supplier_invoices", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  supplierName: text("supplier_name").notNull(),
  supplierVatNumber: text("supplier_vat_number"),
  supplierAddress: text("supplier_address"),
  supplierEmail: text("supplier_email"),
  supplierPhone: text("supplier_phone"),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date"),
  orderReference: text("order_reference"), // PO number or job reference
  deliveryAddress: text("delivery_address"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull().default("0.23"),
  currency: text("currency").notNull().default("EUR"),
  status: text("status").notNull().default("unpaid"), // unpaid, paid, overdue, disputed
  processingStatus: text("processing_status").notNull().default("complete"), // pending, processing, complete, needs_review, failed
  paidDate: timestamp("paid_date"),
  documentUrl: text("document_url"), // Link to stored PDF
  extractedRawData: text("extracted_raw_data"), // Raw JSON from AI extraction
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("supplier_invoices_org_id_idx").on(table.organizationId),
  index("supplier_invoices_user_id_idx").on(table.userId),
  index("supplier_invoices_supplier_name_idx").on(table.supplierName),
  index("supplier_invoices_invoice_date_idx").on(table.invoiceDate),
  index("supplier_invoices_status_idx").on(table.status),
  uniqueIndex("supplier_invoices_unique_idx").on(table.organizationId, table.supplierName, table.invoiceNumber),
]);

export const insertSupplierInvoiceSchema = createInsertSchema(supplierInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Supplier invoice line items - individual items purchased
export const supplierInvoiceItems = pgTable("supplier_invoice_items", {
  id: serial("id").primaryKey(),
  supplierInvoiceId: integer("supplier_invoice_id").notNull().references(() => supplierInvoices.id, { onDelete: "cascade" }),
  itemCode: text("item_code"), // SKU/product code from supplier
  description: text("description").notNull(),
  category: text("category"), // Auto-categorized: Electrical, Plumbing, HVAC, etc.
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unit: text("unit").notNull().default("each"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull().default("0"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull().default("0.23"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("supplier_invoice_items_invoice_id_idx").on(table.supplierInvoiceId),
  index("supplier_invoice_items_item_code_idx").on(table.itemCode),
  index("supplier_invoice_items_category_idx").on(table.category),
]);

export const insertSupplierInvoiceItemSchema = createInsertSchema(supplierInvoiceItems).omit({
  id: true,
  createdAt: true,
});

export type SupplierInvoice = typeof supplierInvoices.$inferSelect;
export type InsertSupplierInvoice = z.infer<typeof insertSupplierInvoiceSchema>;
export type SupplierInvoiceItem = typeof supplierInvoiceItems.$inferSelect;
export type InsertSupplierInvoiceItem = z.infer<typeof insertSupplierInvoiceItemSchema>;

// Receipt scans - OCR extraction results before finalization
export const receiptScans = pgTable("receipt_scans", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, extracted, finalized, failed
  supplierName: text("supplier_name"),
  supplierVatNumber: text("supplier_vat_number"),
  supplierAddress: text("supplier_address"),
  receiptDate: timestamp("receipt_date"),
  receiptNumber: text("receipt_number"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }),
  total: decimal("total", { precision: 10, scale: 2 }),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }),
  currency: text("currency").default("EUR"),
  paymentMethod: text("payment_method"),
  extractedLineItems: text("extracted_line_items"), // JSON array of line items
  extractedRawJson: text("extracted_raw_json"), // Full raw OCR extraction
  ocrConfidence: decimal("ocr_confidence", { precision: 5, scale: 2 }), // 0-100
  processingError: text("processing_error"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("receipt_scans_org_id_idx").on(table.organizationId),
  index("receipt_scans_user_id_idx").on(table.userId),
  index("receipt_scans_status_idx").on(table.status),
  index("receipt_scans_date_idx").on(table.createdAt),
]);

export const insertReceiptScanSchema = createInsertSchema(receiptScans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ReceiptScan = typeof receiptScans.$inferSelect;
export type InsertReceiptScan = z.infer<typeof insertReceiptScanSchema>;

// Expenses Final - auditable multi-tenant ledger for all finalized expenses
export const expensesFinal = pgTable("expenses_final", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  subscriberName: text("subscriber_name").notNull(), // Snapshot at time of creation
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiptScanId: integer("receipt_scan_id").references(() => receiptScans.id, { onDelete: "set null" }),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  supplierName: text("supplier_name").notNull(),
  supplierVatNumber: text("supplier_vat_number"),
  supplierAddress: text("supplier_address"),
  receiptNumber: text("receipt_number"),
  receiptDate: timestamp("receipt_date").notNull(),
  category: text("category").notNull(), // Materials, Tools, Fuel, Subcontractor, Office, Vehicle, etc.
  description: text("description"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull().default("0.23"),
  currency: text("currency").notNull().default("EUR"),
  paymentMethod: text("payment_method"), // Cash, Card, Bank Transfer, Credit
  lineItems: text("line_items"), // JSON array of extracted line items
  receiptImageUrl: text("receipt_image_url"),
  entryMethod: text("entry_method").notNull().default("manual"), // manual, ocr_scan
  isVatReclaimable: boolean("is_vat_reclaimable").notNull().default(true),
  jobReference: text("job_reference"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete for audit trail
  deletedBy: varchar("deleted_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  index("expenses_final_subscriber_id_idx").on(table.subscriberId),
  index("expenses_final_org_id_idx").on(table.organizationId),
  index("expenses_final_user_id_idx").on(table.userId),
  index("expenses_final_date_idx").on(table.receiptDate),
  index("expenses_final_category_idx").on(table.category),
  index("expenses_final_invoice_id_idx").on(table.invoiceId),
  index("expenses_final_supplier_idx").on(table.supplierName),
  index("expenses_final_receipt_scan_idx").on(table.receiptScanId),
  index("expenses_final_deleted_idx").on(table.deletedAt),
]);

export const insertExpenseFinalSchema = createInsertSchema(expensesFinal).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedBy: true,
});

export type ExpenseFinal = typeof expensesFinal.$inferSelect;
export type InsertExpenseFinal = z.infer<typeof insertExpenseFinalSchema>;

// Expense line items - individual products/items from a receipt
export const expenseLineItems = pgTable("expense_line_items", {
  id: serial("id").primaryKey(),
  expenseId: integer("expense_id").notNull().references(() => expensesFinal.id, { onDelete: "cascade" }),
  itemCode: text("item_code"),
  description: text("description").notNull(),
  category: text("category"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unit: text("unit").notNull().default("each"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull().default("0"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("expense_line_items_expense_id_idx").on(table.expenseId),
  index("expense_line_items_category_idx").on(table.category),
]);

export const insertExpenseLineItemSchema = createInsertSchema(expenseLineItems).omit({
  id: true,
  createdAt: true,
});

export type ExpenseLineItem = typeof expenseLineItems.$inferSelect;
export type InsertExpenseLineItem = z.infer<typeof insertExpenseLineItemSchema>;

// User pattern learning for agent command suggestions
export const userPatterns = pgTable("user_patterns", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  patternType: text("pattern_type").notNull(), // command_usage, client_frequency, template_preference, time_of_day, typical_values
  patternKey: text("pattern_key").notNull(), // e.g., "/quote", "client:123", "template:callout"
  patternValue: text("pattern_value"), // JSON with additional context
  usageCount: integer("usage_count").notNull().default(1),
  lastUsedAt: timestamp("last_used_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("user_patterns_user_id_idx").on(table.userId),
  index("user_patterns_org_id_idx").on(table.organizationId),
  index("user_patterns_type_idx").on(table.patternType),
  index("user_patterns_key_idx").on(table.patternKey),
]);

export const insertUserPatternSchema = createInsertSchema(userPatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserPattern = typeof userPatterns.$inferSelect;
export type InsertUserPattern = z.infer<typeof insertUserPatternSchema>;

// Agent command history for learning
export const agentCommandHistory = pgTable("agent_command_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  rawInput: text("raw_input").notNull(),
  parsedCommand: text("parsed_command"), // JSON of parsed command
  commandType: text("command_type"), // quote, invoice, client, add, search
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  templateId: integer("template_id"),
  wasSuccessful: boolean("was_successful").notNull().default(true),
  resultType: text("result_type"), // success, draft, error, question
  executionTimeMs: integer("execution_time_ms"),
  dayOfWeek: integer("day_of_week"), // 0-6
  hourOfDay: integer("hour_of_day"), // 0-23
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("agent_cmd_history_user_id_idx").on(table.userId),
  index("agent_cmd_history_org_id_idx").on(table.organizationId),
  index("agent_cmd_history_type_idx").on(table.commandType),
  index("agent_cmd_history_client_idx").on(table.clientId),
  index("agent_cmd_history_created_idx").on(table.createdAt),
]);

export const insertAgentCommandHistorySchema = createInsertSchema(agentCommandHistory).omit({
  id: true,
  createdAt: true,
});

export type AgentCommandHistory = typeof agentCommandHistory.$inferSelect;
export type InsertAgentCommandHistory = z.infer<typeof insertAgentCommandHistorySchema>;

// ============================================
// Team Collaboration - Channels & Messages
// ============================================

export const teamChannels = pgTable("team_channels", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  channelType: text("channel_type").notNull().default("general"), // general, job, quote, invoice
  linkedEntityType: text("linked_entity_type"), // job, quote, invoice (for auto-created channels)
  linkedEntityId: integer("linked_entity_id"),
  isDefault: boolean("is_default").notNull().default(false), // One default channel per org
  isArchived: boolean("is_archived").notNull().default(false),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("team_channels_org_id_idx").on(table.organizationId),
  index("team_channels_org_default_idx").on(table.organizationId, table.isDefault),
  index("team_channels_linked_entity_idx").on(table.linkedEntityType, table.linkedEntityId),
]);

export const insertTeamChannelSchema = createInsertSchema(teamChannels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TeamChannel = typeof teamChannels.$inferSelect;
export type InsertTeamChannel = z.infer<typeof insertTeamChannelSchema>;

export type MessageType = "text" | "image" | "task" | "system";

export const channelMessages = pgTable("channel_messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull().references(() => teamChannels.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  messageType: text("message_type").notNull().default("text"), // text, image, task, system
  content: text("content").notNull(),
  imageUrl: text("image_url"), // For image messages
  metadata: text("metadata"), // JSON for additional data (task links, mentions, etc.)
  isEdited: boolean("is_edited").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("channel_messages_channel_id_idx").on(table.channelId),
  index("channel_messages_sender_id_idx").on(table.senderId),
  index("channel_messages_created_idx").on(table.channelId, table.createdAt),
]);

export const insertChannelMessageSchema = createInsertSchema(channelMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ChannelMessage = typeof channelMessages.$inferSelect;
export type InsertChannelMessage = z.infer<typeof insertChannelMessageSchema>;

// Track last read message per user per channel for unread counts
export const messageReads = pgTable("message_reads", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull().references(() => teamChannels.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastReadMessageId: integer("last_read_message_id").references(() => channelMessages.id, { onDelete: "set null" }),
  lastReadAt: timestamp("last_read_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("message_reads_channel_user_idx").on(table.channelId, table.userId),
  index("message_reads_user_idx").on(table.userId),
]);

export const insertMessageReadSchema = createInsertSchema(messageReads).omit({
  id: true,
});

export type MessageRead = typeof messageReads.$inferSelect;
export type InsertMessageRead = z.infer<typeof insertMessageReadSchema>;

// ============================================
// Team Collaboration - Tasks
// ============================================

export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export const teamTasks = pgTable("team_tasks", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  channelId: integer("channel_id").references(() => teamChannels.id, { onDelete: "set null" }), // Optional channel context
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"), // todo, in_progress, done, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  dueDate: timestamp("due_date"),
  linkedEntityType: text("linked_entity_type"), // job, quote, invoice, expense
  linkedEntityId: integer("linked_entity_id"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("team_tasks_org_id_idx").on(table.organizationId),
  index("team_tasks_channel_id_idx").on(table.channelId),
  index("team_tasks_status_idx").on(table.organizationId, table.status),
  index("team_tasks_due_date_idx").on(table.organizationId, table.dueDate),
  index("team_tasks_linked_entity_idx").on(table.linkedEntityType, table.linkedEntityId),
]);

export const insertTeamTaskSchema = createInsertSchema(teamTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TeamTask = typeof teamTasks.$inferSelect;
export type InsertTeamTask = z.infer<typeof insertTeamTaskSchema>;

export const taskAssignments = pgTable("task_assignments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => teamTasks.id, { onDelete: "cascade" }),
  assigneeId: varchar("assignee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("task_assignments_task_user_idx").on(table.taskId, table.assigneeId),
  index("task_assignments_assignee_idx").on(table.assigneeId),
]);

export const insertTaskAssignmentSchema = createInsertSchema(taskAssignments).omit({
  id: true,
});

export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type InsertTaskAssignment = z.infer<typeof insertTaskAssignmentSchema>;

export * from "./models/chat";
