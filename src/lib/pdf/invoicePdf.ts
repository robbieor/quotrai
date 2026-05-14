import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Invoice } from "@/hooks/useInvoices";
import type { CompanyBranding } from "@/hooks/useCompanyBranding";
import { getBrandingConfig, hexToRgb, addBrandingHeader, addBrandingFooter } from "./pdfBranding";
import { safeFormatDate } from "./dateUtils";
import { calculateTotals } from "@/utils/vatRates";

export async function generateInvoicePdf(
  invoice: Invoice,
  branding?: CompanyBranding | null,
  currencySymbol: string = "€"
): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const config = getBrandingConfig(branding);

  // Add branded header
  let startY = await addBrandingHeader(doc, config, "INVOICE", invoice.display_number);

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
  doc.text(safeFormatDate(invoice.issue_date, "MMM d, yyyy"), pageWidth - 20, startY, { align: "right" });
  doc.text(safeFormatDate(invoice.due_date, "MMM d, yyyy"), pageWidth - 20, startY + 7, { align: "right" });
  
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

  const hasPerLine = invoice.invoice_items.some((i: any) => i.tax_rate !== undefined && i.tax_rate !== null);
  let cursorY = finalY + 7;
  if (hasPerLine) {
    const { breakdown, uniformRate, taxAmount } = calculateTotals(
      invoice.invoice_items.map((i: any) => ({
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        tax_rate: i.tax_rate,
      }))
    );
    if (uniformRate !== null) {
      doc.setTextColor(100, 100, 100);
      doc.text(`Tax (${uniformRate}%):`, pageWidth - 70, cursorY);
      doc.setTextColor(0, 0, 0);
      doc.text(`${currencySymbol}${taxAmount.toFixed(2)}`, pageWidth - 20, cursorY, { align: "right" });
    } else {
      for (const b of breakdown.filter((x) => x.tax > 0 || x.rate > 0)) {
        doc.setTextColor(100, 100, 100);
        doc.text(`Tax (${b.rate}%) on ${currencySymbol}${b.base.toFixed(2)}:`, pageWidth - 90, cursorY);
        doc.setTextColor(0, 0, 0);
        doc.text(`${currencySymbol}${b.tax.toFixed(2)}`, pageWidth - 20, cursorY, { align: "right" });
        cursorY += 5;
      }
      cursorY -= 5;
    }
  } else {
    doc.setTextColor(100, 100, 100);
    doc.text(`Tax (${Number(invoice.tax_rate)}%):`, pageWidth - 70, cursorY);
    doc.setTextColor(0, 0, 0);
    doc.text(`${currencySymbol}${Number(invoice.tax_amount).toFixed(2)}`, pageWidth - 20, cursorY, { align: "right" });
  }

  doc.setDrawColor(...hexToRgb(config.accentColor));
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 80, cursorY + 5, pageWidth - 20, cursorY + 5);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(config.accentColor));
  doc.text("Total:", pageWidth - 70, cursorY + 13);
  doc.text(`${currencySymbol}${Number(invoice.total).toFixed(2)}`, pageWidth - 20, cursorY + 13, { align: "right" });

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
  doc.save(`${invoice.display_number}.pdf`);
}
