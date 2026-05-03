import jsPDF from "jspdf";
import type { CompanyBranding } from "@/hooks/useCompanyBranding";

export interface BrandingConfig {
  companyName: string;
  companyAddress: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
  logoUrl: string | null;
  showLogo: boolean;
  accentColor: string;
  footerMessage: string;
  paymentTerms: string | null;
  bankDetails: string | null;
}

export function getBrandingConfig(branding: CompanyBranding | null, fallbackName?: string): BrandingConfig {
  return {
    companyName: branding?.company_name || fallbackName || "Your Company",
    companyAddress: branding?.company_address || null,
    companyPhone: branding?.company_phone || null,
    companyEmail: branding?.company_email || null,
    companyWebsite: branding?.company_website || null,
    logoUrl: branding?.logo_url || null,
    showLogo: branding?.show_logo ?? true,
    accentColor: branding?.accent_color || "#00FFB2",
    footerMessage: branding?.footer_message || "Thank you for your business!",
    paymentTerms: branding?.payment_terms || null,
    bankDetails: branding?.bank_details || null,
  };
}

// Convert hex color to RGB array for jsPDF
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 255, 178]; // Default to revamo green
}

// Load image and convert to base64 for jsPDF
export async function loadLogoAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function addBrandingHeader(
  doc: jsPDF,
  branding: BrandingConfig,
  documentType: "INVOICE" | "QUOTE",
  documentNumber: string
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 20;

  // Logo (if available and enabled)
  if (branding.showLogo && branding.logoUrl) {
    try {
      const logoBase64 = await loadLogoAsBase64(branding.logoUrl);
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", 20, currentY - 5, 30, 30);
      }
    } catch (e) {
      console.error("Failed to load logo:", e);
    }
  }

  // Company info (left side, offset if logo present)
  const textStartX = branding.showLogo && branding.logoUrl ? 55 : 20;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(branding.companyName, textStartX, currentY);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  
  let infoY = currentY + 6;
  
  if (branding.companyAddress) {
    const addressLines = branding.companyAddress.split("\n");
    addressLines.forEach((line) => {
      doc.text(line, textStartX, infoY);
      infoY += 4;
    });
  }
  
  if (branding.companyPhone) {
    doc.text(branding.companyPhone, textStartX, infoY);
    infoY += 4;
  }
  
  if (branding.companyEmail) {
    doc.text(branding.companyEmail, textStartX, infoY);
    infoY += 4;
  }
  
  if (branding.companyWebsite) {
    doc.text(branding.companyWebsite, textStartX, infoY);
    infoY += 4;
  }

  // Document type header (right side)
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(branding.accentColor));
  doc.text(documentType, pageWidth - 20, currentY, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(documentNumber, pageWidth - 20, currentY + 8, { align: "right" });

  // Calculate where header ends
  const headerEndY = Math.max(infoY, currentY + 15) + 5;
  
  // Divider line
  doc.setDrawColor(...hexToRgb(branding.accentColor));
  doc.setLineWidth(0.5);
  doc.line(20, headerEndY, pageWidth - 20, headerEndY);

  return headerEndY + 8;
}

export function addBrandingFooter(
  doc: jsPDF,
  branding: BrandingConfig,
  finalY: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = finalY;

  // Payment terms
  if (branding.paymentTerms) {
    currentY += 15;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Payment Terms:", 20, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const termsLines = doc.splitTextToSize(branding.paymentTerms, pageWidth - 40);
    doc.text(termsLines, 20, currentY + 5);
    currentY += 5 + termsLines.length * 4;
  }

  // Bank details
  if (branding.bankDetails) {
    currentY += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Bank Details:", 20, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const bankLines = branding.bankDetails.split("\n");
    bankLines.forEach((line, i) => {
      doc.text(line, 20, currentY + 5 + i * 4);
    });
  }

  // Footer message at bottom
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text(branding.footerMessage, pageWidth / 2, pageHeight - 15, { align: "center" });

  return currentY;
}
