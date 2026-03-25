import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Invoice } from "@/hooks/useInvoices";
import type { CompanyBranding } from "@/hooks/useCompanyBranding";
import { getBrandingConfig, hexToRgb, addBrandingHeader, addBrandingFooter } from "./pdfBranding";

export async function generateInvoicePdf(
  invoice: Invoice,
  branding?: CompanyBranding | null,
  currencySymbol: string = "€"
): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const config = getBrandingConfig(branding);

  // Add branded header
  let startY = await addBrandingHeader(doc, config, "INVOICE", invoice.invoice_number);

  // Invoice details section
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Bill To:", 20, startY);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(invoice.customer?.name || "N/A", 20, startY + 6);

  // Invoice meta (right side)
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("Issue Date:", pageWidth - 70, startY);
  doc.text("Due Date:", pageWidth - 70, startY + 7);
  doc.text("Status:", pageWidth - 70, startY + 14);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(format(new Date(invoice.issue_date), "MMM d, yyyy"), pageWidth - 20, startY, { align: "right" });
  doc.text(format(new Date(invoice.due_date), "MMM d, yyyy"), pageWidth - 20, startY + 7, { align: "right" });
  
  // Status with color
  const statusText = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
  const statusColor = invoice.status === "paid" ? [34, 197, 94] : invoice.status === "overdue" ? [239, 68, 68] : [100, 100, 100];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(statusText, pageWidth - 20, startY + 14, { align: "right" });

  // Line items table
  const tableData = invoice.invoice_items.map((item) => [
    item.description,
    item.quantity.toString(),
    `${currencySymbol}${Number(item.unit_price).toFixed(2)}`,
    `${currencySymbol}${Number(item.total_price).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: startY + 28,
    head: [["Description", "Qty", "Unit Price", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: hexToRgb(config.accentColor),
      textColor: 255,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
    },
    margin: { left: 20, right: 20 },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Subtotal:", pageWidth - 70, finalY);
  doc.setTextColor(0, 0, 0);
  doc.text(`${currencySymbol}${Number(invoice.subtotal).toFixed(2)}`, pageWidth - 20, finalY, { align: "right" });

  doc.setTextColor(100, 100, 100);
  doc.text(`Tax (${Number(invoice.tax_rate)}%):`, pageWidth - 70, finalY + 7);
  doc.setTextColor(0, 0, 0);
  doc.text(`${currencySymbol}${Number(invoice.tax_amount).toFixed(2)}`, pageWidth - 20, finalY + 7, { align: "right" });

  doc.setDrawColor(...hexToRgb(config.accentColor));
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 80, finalY + 12, pageWidth - 20, finalY + 12);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(config.accentColor));
  doc.text("Total:", pageWidth - 70, finalY + 20);
  doc.text(`${currencySymbol}${Number(invoice.total).toFixed(2)}`, pageWidth - 20, finalY + 20, { align: "right" });

  // Notes
  let notesEndY = finalY + 25;
  if (invoice.notes) {
    notesEndY = finalY + 35;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Notes:", 20, notesEndY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - 40);
    doc.text(splitNotes, 20, notesEndY + 5);
    notesEndY += 5 + splitNotes.length * 4;
  }

  // Add branded footer
  addBrandingFooter(doc, config, notesEndY);

  // Generation timestamp
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(`Generated on ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}`, pageWidth / 2, pageHeight - 8, { align: "center" });

  return doc;
}

export async function downloadInvoicePdf(
  invoice: Invoice,
  branding?: CompanyBranding | null,
  currencySymbol?: string
) {
  const doc = await generateInvoicePdf(invoice, branding, currencySymbol);
  doc.save(`${invoice.invoice_number}.pdf`);
}
