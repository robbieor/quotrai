import bcrypt from "bcryptjs";
import XLSX from "xlsx";
import { db } from "../server/db";
import { users, organizations, organizationMembers, clients, invoices } from "../shared/schema";
import { eq } from "drizzle-orm";

interface InvoiceRow {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  clientName: string;
  mobile: string;
  phone: string;
  clientEmail: string;
  tax: number;
  subtotal: number;
  total: number;
  taxable: number;
  paid: number;
  paidDate: string;
  balanceDue: number;
  paymentDetails: string;
  poNumber: string;
}

function parseExcelDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

function parsePaymentDate(paymentDetails: string): Date | null {
  if (!paymentDetails) return null;
  const match = paymentDetails.match(/(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return new Date(match[1]);
  }
  return null;
}

function extractPaymentMethod(paymentDetails: string): string | null {
  if (!paymentDetails) return null;
  if (paymentDetails.includes("BANK")) return "bank_transfer";
  if (paymentDetails.includes("CASH")) return "cash";
  if (paymentDetails.includes("CARD")) return "card";
  return "other";
}

function readInvoicesFromExcel(filePath: string): InvoiceRow[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  const invoices: InvoiceRow[] = [];
  
  for (let i = 2; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row[0] || !String(row[0]).startsWith("INV")) continue;
    
    invoices.push({
      invoiceNumber: String(row[0] || ""),
      date: String(row[1] || ""),
      dueDate: String(row[2] || ""),
      clientName: String(row[3] || "").trim(),
      mobile: String(row[4] || ""),
      phone: String(row[5] || ""),
      clientEmail: String(row[6] || "").toLowerCase().trim(),
      tax: parseFloat(row[7]) || 0,
      subtotal: parseFloat(row[8]) || 0,
      total: parseFloat(row[9]) || 0,
      taxable: parseFloat(row[10]) || 0,
      paid: parseFloat(row[11]) || 0,
      paidDate: String(row[12] || ""),
      balanceDue: parseFloat(row[13]) || 0,
      paymentDetails: String(row[14] || ""),
      poNumber: String(row[15] || ""),
    });
  }
  
  return invoices;
}

async function main() {
  console.log("Starting OROC Electrical data import...\n");
  
  const email = "orocelectrical@gmail.com";
  const password = "Temp2026!";
  
  let existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  let userId: string;
  
  if (existingUser.length > 0) {
    console.log("User already exists, using existing account");
    userId = existingUser[0].id;
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(users).values({
      email,
      password: hashedPassword,
      emailVerified: true,
    }).returning();
    userId = newUser.id;
    console.log("Created user:", email);
  }
  
  let existingOrg = await db.select().from(organizations).where(eq(organizations.name, "OROC Electrical")).limit(1);
  
  let orgId: number;
  
  if (existingOrg.length > 0) {
    console.log("Organization already exists, using existing");
    orgId = existingOrg[0].id;
  } else {
    const orgCode = "OROC" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const [newOrg] = await db.insert(organizations).values({
      name: "OROC Electrical",
      code: orgCode,
      createdBy: userId,
    }).returning();
    orgId = newOrg.id;
    console.log("Created organization: OROC Electrical (code:", orgCode, ")");
    
    await db.insert(organizationMembers).values({
      organizationId: orgId,
      userId: userId,
      role: "owner",
      status: "active",
      joinedAt: new Date(),
    });
    console.log("Added user as organization owner");
  }
  
  console.log("\nReading invoice files...");
  const invoices2024 = readInvoicesFromExcel("attached_assets/Invoice-Summary-[2024-01-01]-[2024-12-31]_1767635582633.xlsx");
  const invoices2025 = readInvoicesFromExcel("attached_assets/Invoice-Summary-[2025-01-01]-[2025-12-31]_1767635582633.xlsx");
  
  console.log(`Found ${invoices2024.length} invoices from 2024`);
  console.log(`Found ${invoices2025.length} invoices from 2025`);
  
  const allInvoiceRows = [...invoices2024, ...invoices2025];
  
  const uniqueClients = new Map<string, InvoiceRow>();
  for (const inv of allInvoiceRows) {
    if (inv.clientName && !uniqueClients.has(inv.clientName)) {
      uniqueClients.set(inv.clientName, inv);
    }
  }
  
  console.log(`\nFound ${uniqueClients.size} unique clients`);
  
  const clientIdMap = new Map<string, number>();
  
  for (const [clientName, invData] of uniqueClients) {
    const existingClient = await db.select().from(clients)
      .where(eq(clients.name, clientName))
      .limit(1);
    
    if (existingClient.length > 0 && existingClient[0].organizationId === orgId) {
      clientIdMap.set(clientName, existingClient[0].id);
    } else {
      const [newClient] = await db.insert(clients).values({
        userId,
        organizationId: orgId,
        name: clientName,
        email: invData.clientEmail || null,
        mobile: invData.mobile || null,
        phone: invData.phone || null,
      }).returning();
      clientIdMap.set(clientName, newClient.id);
    }
  }
  
  console.log(`Imported ${clientIdMap.size} clients`);
  
  console.log("\nImporting invoices...");
  let importedCount = 0;
  let skippedCount = 0;
  
  for (const inv of allInvoiceRows) {
    const clientId = clientIdMap.get(inv.clientName);
    if (!clientId) {
      console.log(`Skipping invoice ${inv.invoiceNumber} - no client found for "${inv.clientName}"`);
      skippedCount++;
      continue;
    }
    
    const existingInvoice = await db.select().from(invoices)
      .where(eq(invoices.invoiceNumber, inv.invoiceNumber))
      .limit(1);
    
    if (existingInvoice.length > 0) {
      skippedCount++;
      continue;
    }
    
    let vatRate = 0.23;
    if (inv.taxable > 0 && inv.tax > 0) {
      vatRate = inv.tax / inv.taxable;
      vatRate = Math.round(vatRate * 1000) / 1000;
    } else if (inv.tax === 0) {
      vatRate = 0;
    }
    
    let status = "draft";
    if (inv.balanceDue === 0 && inv.paid > 0) {
      status = "paid";
    } else if (inv.paid > 0 && inv.balanceDue > 0) {
      status = "partial";
    } else if (inv.total > 0) {
      status = "sent";
    }
    
    const paidDate = inv.paidDate ? parseExcelDate(inv.paidDate) : parsePaymentDate(inv.paymentDetails);
    const paymentMethod = extractPaymentMethod(inv.paymentDetails);
    
    await db.insert(invoices).values({
      userId,
      organizationId: orgId,
      clientId,
      invoiceNumber: inv.invoiceNumber,
      date: parseExcelDate(inv.date),
      dueDate: parseExcelDate(inv.dueDate),
      subtotal: inv.subtotal.toFixed(2),
      vatRate: vatRate.toFixed(4),
      vatAmount: inv.tax.toFixed(2),
      total: inv.total.toFixed(2),
      taxable: inv.taxable.toFixed(2),
      paidAmount: inv.paid.toFixed(2),
      status,
      paidDate: paidDate,
      paymentMethod: paymentMethod,
      paymentDetails: inv.paymentDetails || null,
      poNumber: inv.poNumber || null,
    });
    
    importedCount++;
  }
  
  console.log(`\nImport complete!`);
  console.log(`- Imported: ${importedCount} invoices`);
  console.log(`- Skipped (already exist): ${skippedCount} invoices`);
  console.log(`\nLogin credentials:`);
  console.log(`- Email: ${email}`);
  console.log(`- Password: Temp2026!`);
  console.log(`- Organization: OROC Electrical`);
}

main().catch(console.error).finally(() => process.exit(0));
