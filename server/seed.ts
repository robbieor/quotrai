import { db } from "./db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  users,
  organizations,
  organizationMembers,
  userProfiles,
  clients,
  invoices,
  invoiceItems,
  quotes,
  quoteItems,
  expenses,
  revenueIdentifiers,
  savedItems,
  jobSites,
  timeEntries,
} from "@shared/schema";
import { sql } from "drizzle-orm";

function generateOrgCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function seed() {
  console.log("Starting database seeding...");

  const hashedPassword = await hashPassword("password123");

  const org1Code = generateOrgCode();
  const org2Code = generateOrgCode();

  const [user1] = await db.insert(users).values({
    email: "sean.murphy@dublinplumbing.ie",
    password: hashedPassword,
    emailVerified: true,
    isSuperAdmin: true,
  }).returning();

  const [user2] = await db.insert(users).values({
    email: "padraig.kelly@galwayelectrical.ie",
    password: hashedPassword,
    emailVerified: true,
    isSuperAdmin: false,
  }).returning();

  const [staffUser1] = await db.insert(users).values({
    email: "mike.brennan@dublinplumbing.ie",
    password: hashedPassword,
    emailVerified: true,
    isSuperAdmin: false,
  }).returning();

  const [staffUser2] = await db.insert(users).values({
    email: "ciara.walsh@galwayelectrical.ie",
    password: hashedPassword,
    emailVerified: true,
    isSuperAdmin: false,
  }).returning();

  console.log("Created users:", { user1: user1.id, user2: user2.id, staffUser1: staffUser1.id, staffUser2: staffUser2.id });

  const [org1] = await db.insert(organizations).values({
    code: org1Code,
    name: "Dublin Plumbing Solutions",
    createdBy: user1.id,
  }).returning();

  const [org2] = await db.insert(organizations).values({
    code: org2Code,
    name: "Galway Electrical Services",
    createdBy: user2.id,
  }).returning();

  console.log("Created organizations:", { org1: org1.id, org2: org2.id });

  await db.insert(organizationMembers).values([
    { organizationId: org1.id, userId: user1.id, role: "owner", status: "active", joinedAt: new Date() },
    { organizationId: org1.id, userId: staffUser1.id, role: "staff", status: "active", invitedBy: user1.id, joinedAt: new Date() },
    { organizationId: org2.id, userId: user2.id, role: "owner", status: "active", joinedAt: new Date() },
    { organizationId: org2.id, userId: staffUser2.id, role: "staff", status: "active", invitedBy: user2.id, joinedAt: new Date() },
  ]);

  console.log("Created organization members");

  await db.insert(userProfiles).values([
    {
      userId: user1.id,
      organizationId: org1.id,
      businessName: "Dublin Plumbing Solutions",
      businessOwnerName: "Sean Murphy",
      businessNumber: "IE1234567R",
      tradeType: "Plumber",
      county: "Dublin",
      phone: "+353 1 234 5678",
      mobile: "+353 87 123 4567",
      address: "Unit 12, Industrial Estate",
      address2: "Finglas",
      address3: "Dublin 11",
      vatNumber: "IE1234567R",
      invoiceNumberPrefix: "DPS",
      quoteNumberPrefix: "DPQ",
      nextInvoiceNumber: 1001,
      nextQuoteNumber: 501,
      paymentInstructions: "Bank: AIB\nIBAN: IE12 AIBK 1234 5678 9012 3456\nBIC: AIBKIE2D",
    },
    {
      userId: user2.id,
      organizationId: org2.id,
      businessName: "Galway Electrical Services",
      businessOwnerName: "Padraig Kelly",
      businessNumber: "IE9876543T",
      tradeType: "Electrician",
      county: "Galway",
      phone: "+353 91 987 6543",
      mobile: "+353 86 987 6543",
      address: "45 High Street",
      address2: "Salthill",
      address3: "Galway",
      vatNumber: "IE9876543T",
      invoiceNumberPrefix: "GES",
      quoteNumberPrefix: "GEQ",
      nextInvoiceNumber: 2001,
      nextQuoteNumber: 301,
      paymentInstructions: "Bank: Bank of Ireland\nIBAN: IE34 BOFI 9012 3456 7890 1234\nBIC: BOFIIE2D",
    },
  ]);

  console.log("Created user profiles");

  const dublinClients = await db.insert(clients).values([
    {
      userId: user1.id,
      organizationId: org1.id,
      name: "O'Brien Construction Ltd",
      email: "accounts@obriencon.ie",
      mobile: "+353 87 111 2222",
      contact: "Declan O'Brien",
      address: "Industrial Park, Santry",
      address2: "Dublin 9",
      eircode: "D09 X2Y3",
      latitude: "53.3930",
      longitude: "-6.2545",
      paymentTerms: 30,
      notes: "Major construction client, monthly projects",
    },
    {
      userId: user1.id,
      organizationId: org1.id,
      name: "Fitzgerald Property Management",
      email: "maintenance@fitzprop.ie",
      mobile: "+353 86 333 4444",
      contact: "Mary Fitzgerald",
      address: "12 Baggot Street",
      address2: "Dublin 2",
      eircode: "D02 AB12",
      latitude: "53.3374",
      longitude: "-6.2465",
      paymentTerms: 14,
      notes: "Property management company, emergency call-outs",
    },
    {
      userId: user1.id,
      organizationId: org1.id,
      name: "St. Patrick's Primary School",
      email: "principal@stpats.ie",
      phone: "+353 1 555 6666",
      contact: "Fr. Michael Ryan",
      address: "Church Road",
      address2: "Drumcondra",
      address3: "Dublin 9",
      eircode: "D09 CD45",
      paymentTerms: 30,
      notes: "School maintenance contract",
    },
  ]).returning();

  const galwayClients = await db.insert(clients).values([
    {
      userId: user2.id,
      organizationId: org2.id,
      name: "Atlantic Hotel Group",
      email: "facilities@atlantichotels.ie",
      mobile: "+353 85 777 8888",
      contact: "Sarah Nolan",
      address: "Promenade",
      address2: "Salthill",
      address3: "Galway",
      eircode: "H91 E2F3",
      latitude: "53.2601",
      longitude: "-9.0786",
      paymentTerms: 30,
      notes: "Hotel chain, ongoing maintenance contracts",
    },
    {
      userId: user2.id,
      organizationId: org2.id,
      name: "Connacht Medical Centre",
      email: "admin@connachtmedical.ie",
      phone: "+353 91 222 3333",
      contact: "Dr. Aoife Byrne",
      address: "University Road",
      address2: "Galway City",
      eircode: "H91 G4H5",
      paymentTerms: 14,
      notes: "Medical facility, urgent works priority",
    },
  ]).returning();

  console.log("Created clients:", { dublin: dublinClients.length, galway: galwayClients.length });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const dublinInvoices = await db.insert(invoices).values([
    {
      userId: user1.id,
      organizationId: org1.id,
      clientId: dublinClients[0].id,
      invoiceNumber: "DPS-1001",
      date: sixtyDaysAgo,
      dueDate: thirtyDaysAgo,
      subtotal: "2450.00",
      discount: "0.00",
      vatRate: "0.23",
      vatAmount: "563.50",
      total: "3013.50",
      taxable: "2450.00",
      paidAmount: "3013.50",
      status: "paid",
      paidDate: thirtyDaysAgo,
      paymentMethod: "Bank Transfer",
      poNumber: "OBC-2024-0045",
      notes: "Boiler installation and pipework",
    },
    {
      userId: user1.id,
      organizationId: org1.id,
      clientId: dublinClients[1].id,
      invoiceNumber: "DPS-1002",
      date: thirtyDaysAgo,
      dueDate: now,
      subtotal: "850.00",
      discount: "50.00",
      vatRate: "0.23",
      vatAmount: "184.00",
      total: "984.00",
      taxable: "800.00",
      paidAmount: "0.00",
      status: "sent",
      notes: "Emergency plumbing repair - burst pipe",
    },
    {
      userId: user1.id,
      organizationId: org1.id,
      clientId: dublinClients[2].id,
      invoiceNumber: "DPS-1003",
      date: now,
      dueDate: thirtyDaysFromNow,
      subtotal: "1200.00",
      discount: "0.00",
      vatRate: "0.135",
      vatAmount: "162.00",
      total: "1362.00",
      taxable: "1200.00",
      paidAmount: "0.00",
      status: "draft",
      notes: "Bathroom renovation - Phase 1",
    },
  ]).returning();

  console.log("Created Dublin invoices:", dublinInvoices.length);

  await db.insert(invoiceItems).values([
    { invoiceId: dublinInvoices[0].id, description: "Worcester Bosch 30kW Combi Boiler - Supply", quantity: "1", rate: "1200.00", amount: "1200.00" },
    { invoiceId: dublinInvoices[0].id, description: "Boiler installation labour - 8 hours", quantity: "8", rate: "65.00", amount: "520.00" },
    { invoiceId: dublinInvoices[0].id, description: "Copper pipework and fittings", quantity: "1", rate: "430.00", amount: "430.00" },
    { invoiceId: dublinInvoices[0].id, description: "Magnetic filter installation", quantity: "1", rate: "150.00", amount: "150.00" },
    { invoiceId: dublinInvoices[0].id, description: "System flush and commission", quantity: "1", rate: "150.00", amount: "150.00" },
    { invoiceId: dublinInvoices[1].id, description: "Emergency call-out fee", quantity: "1", rate: "85.00", amount: "85.00" },
    { invoiceId: dublinInvoices[1].id, description: "Burst pipe repair - labour", quantity: "3", rate: "65.00", amount: "195.00" },
    { invoiceId: dublinInvoices[1].id, description: "Replacement copper pipe and fittings", quantity: "1", rate: "120.00", amount: "120.00" },
    { invoiceId: dublinInvoices[1].id, description: "Water damage cleanup and drying", quantity: "1", rate: "450.00", amount: "450.00" },
    { invoiceId: dublinInvoices[2].id, description: "Bathroom renovation Phase 1 - First fix plumbing", quantity: "1", rate: "800.00", amount: "800.00" },
    { invoiceId: dublinInvoices[2].id, description: "New soil stack installation", quantity: "1", rate: "400.00", amount: "400.00" },
  ]);

  console.log("Created invoice items");

  const galwayInvoices = await db.insert(invoices).values([
    {
      userId: user2.id,
      organizationId: org2.id,
      clientId: galwayClients[0].id,
      invoiceNumber: "GES-2001",
      date: thirtyDaysAgo,
      dueDate: now,
      subtotal: "4500.00",
      discount: "0.00",
      vatRate: "0.23",
      vatAmount: "1035.00",
      total: "5535.00",
      taxable: "4500.00",
      paidAmount: "5535.00",
      status: "paid",
      paidDate: now,
      paymentMethod: "Credit Card",
      notes: "Hotel lobby lighting upgrade",
    },
  ]).returning();

  await db.insert(invoiceItems).values([
    { invoiceId: galwayInvoices[0].id, description: "LED lighting fixtures - supply", quantity: "24", rate: "85.00", amount: "2040.00" },
    { invoiceId: galwayInvoices[0].id, description: "Electrical installation labour", quantity: "16", rate: "75.00", amount: "1200.00" },
    { invoiceId: galwayInvoices[0].id, description: "Wiring and accessories", quantity: "1", rate: "760.00", amount: "760.00" },
    { invoiceId: galwayInvoices[0].id, description: "Testing and certification", quantity: "1", rate: "500.00", amount: "500.00" },
  ]);

  console.log("Created Galway invoice and items");

  const dublinQuotes = await db.insert(quotes).values([
    {
      userId: user1.id,
      organizationId: org1.id,
      clientId: dublinClients[0].id,
      quoteNumber: "DPQ-501",
      date: now,
      validUntil: thirtyDaysFromNow,
      subtotal: "8500.00",
      discount: "500.00",
      vatRate: "0.23",
      vatAmount: "1840.00",
      total: "9840.00",
      status: "sent",
      notes: "Complete bathroom suite installation for new office building",
    },
    {
      userId: user1.id,
      organizationId: org1.id,
      clientId: dublinClients[1].id,
      quoteNumber: "DPQ-502",
      date: thirtyDaysAgo,
      validUntil: now,
      subtotal: "3200.00",
      discount: "0.00",
      vatRate: "0.23",
      vatAmount: "736.00",
      total: "3936.00",
      status: "accepted",
      convertedToInvoiceId: dublinInvoices[2].id,
      notes: "Annual maintenance contract renewal",
    },
  ]).returning();

  await db.insert(quoteItems).values([
    { quoteId: dublinQuotes[0].id, description: "Commercial bathroom suites - 4 units", quantity: "4", rate: "1200.00", amount: "4800.00" },
    { quoteId: dublinQuotes[0].id, description: "Installation labour - 40 hours", quantity: "40", rate: "65.00", amount: "2600.00" },
    { quoteId: dublinQuotes[0].id, description: "Materials and fittings", quantity: "1", rate: "1100.00", amount: "1100.00" },
    { quoteId: dublinQuotes[1].id, description: "Annual maintenance - 12 visits", quantity: "12", rate: "200.00", amount: "2400.00" },
    { quoteId: dublinQuotes[1].id, description: "Emergency call-out allowance", quantity: "4", rate: "200.00", amount: "800.00" },
  ]);

  console.log("Created quotes and quote items");

  const seededExpenses = await db.insert(expenses).values([
    {
      userId: user1.id,
      organizationId: org1.id,
      date: thirtyDaysAgo,
      vendor: "Plumb Center Dublin",
      amount: "456.78",
      category: "Materials",
      description: "Copper pipes, fittings, and solder",
    },
    {
      userId: user1.id,
      organizationId: org1.id,
      date: sixtyDaysAgo,
      vendor: "Circle K Santry",
      amount: "78.50",
      category: "Fuel",
      description: "Diesel for van",
    },
    {
      userId: user1.id,
      organizationId: org1.id,
      date: now,
      vendor: "Screwfix",
      amount: "234.99",
      category: "Tools",
      description: "Pipe bender and cutting tools",
    },
    {
      userId: user2.id,
      organizationId: org2.id,
      date: thirtyDaysAgo,
      vendor: "City Electrical Factors",
      amount: "1234.56",
      category: "Materials",
      description: "LED lighting fixtures bulk order",
    },
    {
      userId: user2.id,
      organizationId: org2.id,
      date: now,
      vendor: "Applegreen Galway",
      amount: "65.00",
      category: "Fuel",
      description: "Petrol for site visits",
    },
  ]).returning();

  console.log("Created expenses:", seededExpenses.length);

  await db.insert(revenueIdentifiers).values([
    { organizationId: org1.id, entityType: "invoice", entityId: dublinInvoices[0].id, identifierKey: "internal_number", identifierValue: "DPS-1001", isPrimary: true },
    { organizationId: org1.id, entityType: "invoice", entityId: dublinInvoices[0].id, identifierKey: "po_number", identifierValue: "OBC-2024-0045", isPrimary: false },
    { organizationId: org1.id, entityType: "invoice", entityId: dublinInvoices[1].id, identifierKey: "internal_number", identifierValue: "DPS-1002", isPrimary: true },
    { organizationId: org1.id, entityType: "invoice", entityId: dublinInvoices[2].id, identifierKey: "internal_number", identifierValue: "DPS-1003", isPrimary: true },
    { organizationId: org1.id, entityType: "quote", entityId: dublinQuotes[0].id, identifierKey: "internal_number", identifierValue: "DPQ-501", isPrimary: true },
    { organizationId: org1.id, entityType: "quote", entityId: dublinQuotes[1].id, identifierKey: "internal_number", identifierValue: "DPQ-502", isPrimary: true },
    { organizationId: org2.id, entityType: "invoice", entityId: galwayInvoices[0].id, identifierKey: "internal_number", identifierValue: "GES-2001", isPrimary: true },
    { organizationId: org1.id, entityType: "expense", entityId: seededExpenses[0].id, identifierKey: "receipt_ref", identifierValue: "EXP-DPS-001", isPrimary: true },
    { organizationId: org1.id, entityType: "expense", entityId: seededExpenses[1].id, identifierKey: "receipt_ref", identifierValue: "EXP-DPS-002", isPrimary: true },
    { organizationId: org1.id, entityType: "expense", entityId: seededExpenses[2].id, identifierKey: "receipt_ref", identifierValue: "EXP-DPS-003", isPrimary: true },
    { organizationId: org2.id, entityType: "expense", entityId: seededExpenses[3].id, identifierKey: "receipt_ref", identifierValue: "EXP-GES-001", isPrimary: true },
    { organizationId: org2.id, entityType: "expense", entityId: seededExpenses[4].id, identifierKey: "receipt_ref", identifierValue: "EXP-GES-002", isPrimary: true },
  ]);

  console.log("Created revenue identifiers");

  await db.insert(savedItems).values([
    { userId: user1.id, organizationId: org1.id, name: "Standard labour rate", description: "Hourly rate for plumbing work", rate: "65.00", vatRate: "0.23", unit: "hour" },
    { userId: user1.id, organizationId: org1.id, name: "Emergency call-out", description: "After-hours emergency call-out fee", rate: "85.00", vatRate: "0.23", unit: "each" },
    { userId: user1.id, organizationId: org1.id, name: "Boiler service", description: "Annual boiler service and safety check", rate: "120.00", vatRate: "0.135", unit: "each" },
    { userId: user2.id, organizationId: org2.id, name: "Electrical labour rate", description: "Standard hourly rate", rate: "75.00", vatRate: "0.23", unit: "hour" },
    { userId: user2.id, organizationId: org2.id, name: "RECI certification", description: "Electrical installation certification", rate: "150.00", vatRate: "0.23", unit: "each" },
  ]);

  console.log("Created saved items");

  const [jobSite1] = await db.insert(jobSites).values({
    userId: user1.id,
    organizationId: org1.id,
    clientId: dublinClients[0].id,
    name: "O'Brien Construction HQ",
    address: "Industrial Park, Santry, Dublin 9",
    latitude: "53.3930",
    longitude: "-6.2545",
    radiusMeters: 10,
    isActive: true,
    notes: "Main site entrance via loading bay",
  }).returning();

  console.log("Created job site:", jobSite1.id);

  console.log("\n=== SEED COMPLETE ===");
  console.log("Test accounts created:");
  console.log("  Email: sean.murphy@dublinplumbing.ie");
  console.log("  Email: padraig.kelly@galwayelectrical.ie");
  console.log("  Email: mike.brennan@dublinplumbing.ie");
  console.log("  Email: ciara.walsh@galwayelectrical.ie");
  console.log("  Password for all: password123");
  console.log("\nOrganization codes:");
  console.log(`  Dublin Plumbing Solutions: ${org1Code}`);
  console.log(`  Galway Electrical Services: ${org2Code}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
