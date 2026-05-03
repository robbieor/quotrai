import { useMemo } from "react";

type DocumentType = "invoice" | "quote";
type TemplateStyle = "modern" | "classic" | "compact";
type LogoAlign = "left" | "center" | "right";

interface PreviewData {
  logoUrl?: string | null;
  showLogo: boolean;
  logoAlign: LogoAlign;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  accentColor: string;
  footerMessage: string;
  paymentTerms: string;
  bankDetails: string;
  showPaymentTerms: boolean;
  showBankDetails: boolean;
  templateStyle: TemplateStyle;
  documentType: DocumentType;
}

const MOCK_CUSTOMER = {
  name: "Sarah Johnson",
  address: "45 Oak Avenue\nManchester M1 2AB",
  email: "sarah@example.com",
};

const MOCK_ITEMS = [
  { description: "EV Charger Installation", qty: 1, price: 850 },
  { description: "7kW Wallbox Unit", qty: 1, price: 650 },
  { description: "Cable routing & containment", qty: 1, price: 175 },
];

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function isLightColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

export function DocumentPreview({ data }: { data: PreviewData }) {
  const subtotal = MOCK_ITEMS.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = subtotal * 0.23;
  const total = subtotal + tax;
  const accent = data.accentColor || "#00FFB2";
  const textOnAccent = isLightColor(accent) ? "#1e293b" : "#ffffff";
  const isInvoice = data.documentType === "invoice";
  const isCompact = data.templateStyle === "compact";
  const isClassic = data.templateStyle === "classic";

  const docNumber = isInvoice ? "INV-2025-0042" : "QTE-2025-0018";
  const docLabel = isInvoice ? "INVOICE" : "QUOTE";
  const dateLabel = isInvoice ? "Issue Date" : "Quote Date";
  const dueLabel = isInvoice ? "Due Date" : "Valid Until";

  const companyName = data.companyName || "Your Company Name";
  const py = isCompact ? "py-2" : "py-3";
  const textSm = isCompact ? "text-[8px]" : "text-[9px]";
  const textBase = isCompact ? "text-[9px]" : "text-[10px]";
  const textLg = isCompact ? "text-[11px]" : "text-[13px]";

  const logoEl = data.showLogo && data.logoUrl ? (
    <img
      src={data.logoUrl}
      alt="Logo"
      className="max-h-10 max-w-[100px] object-contain"
      style={{ display: "block" }}
    />
  ) : null;

  const logoAlignment = data.logoAlign === "center" ? "mx-auto" : data.logoAlign === "right" ? "ml-auto" : "";

  // ── CLASSIC LAYOUT ──
  if (isClassic) {
    return (
      <div className="bg-white text-[#1a1a2e] rounded-lg shadow-md overflow-hidden border" style={{ fontSize: 10 }}>
        {/* Header — centered */}
        <div className={`px-5 ${py} text-center`} style={{ borderBottom: "1px solid #d1d5db" }}>
          {logoEl && <div className="mb-2 mx-auto w-fit">{logoEl}</div>}
          <p className={`font-bold ${textLg}`}>{companyName}</p>
          {data.companyAddress && (
            <p className={`${textSm} whitespace-pre-line text-gray-500 mt-0.5 leading-tight`}>
              {data.companyAddress}
            </p>
          )}
          <div className={`${textSm} text-gray-500 mt-1 space-y-px`}>
            {data.companyPhone && <p>{data.companyPhone}</p>}
            {data.companyEmail && <p>{data.companyEmail}</p>}
            {data.companyWebsite && <p>{data.companyWebsite}</p>}
          </div>
        </div>

        {/* Info boxes — side by side */}
        <div className={`px-5 ${py} grid grid-cols-2 gap-3`}>
          {/* Left: Bill To */}
          <div className="rounded border border-gray-200 bg-gray-50 p-2">
            <p className={`${textSm} font-semibold uppercase tracking-wider text-gray-400 mb-1`}>
              {isInvoice ? "Bill To" : "Quote For"}
            </p>
            <p className={`${textBase} font-semibold`}>{MOCK_CUSTOMER.name}</p>
            <p className={`${textSm} text-gray-500 whitespace-pre-line leading-tight`}>{MOCK_CUSTOMER.address}</p>
            <p className={`${textSm} text-gray-500`}>{MOCK_CUSTOMER.email}</p>
          </div>
          {/* Right: Document meta */}
          <div className="rounded border border-gray-200 bg-gray-50 p-2 text-right">
            <p className={`font-bold ${textLg} tracking-tight`} style={{ color: accent }}>
              {docLabel}
            </p>
            <p className={`${textBase} font-semibold mt-1`}>{docNumber}</p>
            <div className={`${textSm} text-gray-500 mt-2 space-y-px`}>
              <p>{dateLabel}: 24 Mar 2025</p>
              <p>{dueLabel}: 07 Apr 2025</p>
            </div>
          </div>
        </div>

        {/* Line Items Table — gray header, bordered rows, no stripes */}
        <div className="px-5">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#374151", color: "#ffffff" }}>
                <th className={`text-left ${textSm} font-semibold px-2 py-1.5`}>Description</th>
                <th className={`text-center ${textSm} font-semibold px-2 py-1.5 w-10`}>Qty</th>
                <th className={`text-right ${textSm} font-semibold px-2 py-1.5 w-16`}>Price</th>
                <th className={`text-right ${textSm} font-semibold px-2 py-1.5 w-16`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ITEMS.map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td className={`${textBase} px-2 py-1.5`}>{item.description}</td>
                  <td className={`${textBase} px-2 py-1.5 text-center`}>{item.qty}</td>
                  <td className={`${textBase} px-2 py-1.5 text-right`}>€{item.price.toFixed(2)}</td>
                  <td className={`${textBase} px-2 py-1.5 text-right`}>€{(item.qty * item.price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals — gray divider, accent on total text only */}
        <div className={`px-5 ${py}`}>
          <div className="flex justify-end">
            <div className="w-40 space-y-1">
              <div className={`flex justify-between ${textBase}`}>
                <span className="text-gray-500">Subtotal</span>
                <span>€{subtotal.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between ${textBase}`}>
                <span className="text-gray-500">VAT (23%)</span>
                <span>€{tax.toFixed(2)}</span>
              </div>
              <div
                className={`flex justify-between font-bold ${textLg} pt-1 mt-1`}
                style={{ borderTop: "2px solid #d1d5db" }}
              >
                <span>Total</span>
                <span style={{ color: accent }}>€{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer — white bg, simple top border */}
        <div className={`px-5 ${py} mt-1`} style={{ borderTop: "1px solid #e5e7eb" }}>
          {data.showPaymentTerms && data.paymentTerms && (
            <div className="mb-2">
              <p className={`${textSm} font-semibold text-gray-600 mb-0.5`}>Payment Terms</p>
              <p className={`${textSm} text-gray-500 whitespace-pre-line leading-tight`}>{data.paymentTerms}</p>
            </div>
          )}
          {data.showBankDetails && data.bankDetails && (
            <div className="mb-2">
              <p className={`${textSm} font-semibold text-gray-600 mb-0.5`}>Bank Details</p>
              <p className={`${textSm} text-gray-500 whitespace-pre-line leading-tight`}>{data.bankDetails}</p>
            </div>
          )}
          {data.footerMessage && (
            <p className={`${textSm} text-gray-400 text-center mt-1`}>{data.footerMessage}</p>
          )}
        </div>
      </div>
    );
  }

  // ── MODERN & COMPACT LAYOUT (existing) ──
  return (
    <div className="bg-white text-[#1a1a2e] rounded-lg shadow-md overflow-hidden border" style={{ fontSize: 10 }}>
      {/* Header */}
      <div className={`px-5 ${py}`} style={{ borderBottom: `3px solid ${accent}` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {logoEl && <div className={`mb-2 ${logoAlignment}`}>{logoEl}</div>}
            <p className={`font-bold ${textLg}`}>{companyName}</p>
            {data.companyAddress && (
              <p className={`${textSm} whitespace-pre-line text-gray-500 mt-0.5 leading-tight`}>
                {data.companyAddress}
              </p>
            )}
            <div className={`${textSm} text-gray-500 mt-1 space-y-px`}>
              {data.companyPhone && <p>{data.companyPhone}</p>}
              {data.companyEmail && <p>{data.companyEmail}</p>}
              {data.companyWebsite && <p>{data.companyWebsite}</p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-extrabold text-[16px] tracking-tight" style={{ color: accent }}>
              {docLabel}
            </p>
            <p className={`${textBase} font-semibold mt-1`}>{docNumber}</p>
            <div className={`${textSm} text-gray-500 mt-2 space-y-px`}>
              <p>{dateLabel}: 24 Mar 2025</p>
              <p>{dueLabel}: 07 Apr 2025</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className={`px-5 ${py}`}>
        <p className={`${textSm} font-semibold uppercase tracking-wider text-gray-400 mb-1`}>
          {isInvoice ? "Bill To" : "Quote For"}
        </p>
        <p className={`${textBase} font-semibold`}>{MOCK_CUSTOMER.name}</p>
        <p className={`${textSm} text-gray-500 whitespace-pre-line leading-tight`}>{MOCK_CUSTOMER.address}</p>
        <p className={`${textSm} text-gray-500`}>{MOCK_CUSTOMER.email}</p>
      </div>

      {/* Line Items Table */}
      <div className="px-5">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: accent, color: textOnAccent }}>
              <th className={`text-left ${textSm} font-semibold px-2 py-1.5`}>Description</th>
              <th className={`text-center ${textSm} font-semibold px-2 py-1.5 w-10`}>Qty</th>
              <th className={`text-right ${textSm} font-semibold px-2 py-1.5 w-16`}>Price</th>
              <th className={`text-right ${textSm} font-semibold px-2 py-1.5 w-16`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ITEMS.map((item, i) => (
              <tr key={i} style={i % 2 === 1 ? { backgroundColor: hexToRgba(accent, 0.06) } : {}}>
                <td className={`${textBase} px-2 py-1.5`}>{item.description}</td>
                <td className={`${textBase} px-2 py-1.5 text-center`}>{item.qty}</td>
                <td className={`${textBase} px-2 py-1.5 text-right`}>€{item.price.toFixed(2)}</td>
                <td className={`${textBase} px-2 py-1.5 text-right`}>€{(item.qty * item.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className={`px-5 ${py}`}>
        <div className="flex justify-end">
          <div className="w-40 space-y-1">
            <div className={`flex justify-between ${textBase}`}>
              <span className="text-gray-500">Subtotal</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between ${textBase}`}>
              <span className="text-gray-500">VAT (23%)</span>
              <span>€{tax.toFixed(2)}</span>
            </div>
            <div
              className={`flex justify-between font-bold ${textLg} pt-1 mt-1`}
              style={{ borderTop: `2px solid ${accent}` }}
            >
              <span>Total</span>
              <span>€{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className={`px-5 ${py} mt-1`}
        style={{ borderTop: `1px solid ${hexToRgba(accent, 0.2)}`, backgroundColor: hexToRgba(accent, 0.04) }}
      >
        {data.showPaymentTerms && data.paymentTerms && (
          <div className="mb-2">
            <p className={`${textSm} font-semibold text-gray-600 mb-0.5`}>Payment Terms</p>
            <p className={`${textSm} text-gray-500 whitespace-pre-line leading-tight`}>{data.paymentTerms}</p>
          </div>
        )}
        {data.showBankDetails && data.bankDetails && (
          <div className="mb-2">
            <p className={`${textSm} font-semibold text-gray-600 mb-0.5`}>Bank Details</p>
            <p className={`${textSm} text-gray-500 whitespace-pre-line leading-tight`}>{data.bankDetails}</p>
          </div>
        )}
        {data.footerMessage && (
          <p className={`${textSm} text-gray-400 text-center mt-1`}>{data.footerMessage}</p>
        )}
      </div>
    </div>
  );
}
