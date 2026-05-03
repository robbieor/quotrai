import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload, 
  Trash2, 
  Building2, 
  Palette, 
  FileText, 
  CreditCard,
  Image,
  Save,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  Send,
} from "lucide-react";
import { useCompanyBranding, CompanyBrandingInput } from "@/hooks/useCompanyBranding";
import { useAuth } from "@/hooks/useAuth";
import { DocumentPreview } from "./DocumentPreview";
import { generateInvoicePdf } from "@/lib/pdf/invoicePdf";
import { generateQuotePdf } from "@/lib/pdf/quotePdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PREVIEW_EMAIL_STEPS } from "@/components/shared/AgentWorkingPanel";
import { useAgentTask } from "@/contexts/AgentTaskContext";

const ACCENT_COLORS = [
  { name: "revamo Green", value: "#00FFB2" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Orange", value: "#F97316" },
  { name: "Red", value: "#EF4444" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Slate", value: "#64748B" },
];

type TemplateStyle = "modern" | "classic" | "compact";
type LogoAlign = "left" | "center" | "right";
type DocType = "invoice" | "quote";

export function BrandingSettings() {
  const { branding, isLoading, upsertBranding, uploadLogo, removeLogo } = useCompanyBranding();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { startBackendTask } = useAgentTask();
  
  const [formData, setFormData] = useState<CompanyBrandingInput>({
    company_name: "",
    company_address: "",
    company_phone: "",
    company_email: "",
    company_website: "",
    accent_color: "#00FFB2",
    footer_message: "Thank you for your business!",
    payment_terms: "",
    bank_details: "",
    show_logo: true,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>("modern");
  const [logoAlign, setLogoAlign] = useState<LogoAlign>("left");
  const [previewDocType, setPreviewDocType] = useState<DocType>("invoice");
  const [showPaymentTerms, setShowPaymentTerms] = useState(true);
  const [showBankDetails, setShowBankDetails] = useState(true);

  useEffect(() => {
    if (branding) {
      setFormData({
        company_name: branding.company_name || "",
        company_address: branding.company_address || "",
        company_phone: branding.company_phone || "",
        company_email: branding.company_email || "",
        company_website: branding.company_website || "",
        accent_color: branding.accent_color || "#00FFB2",
        footer_message: branding.footer_message || "Thank you for your business!",
        payment_terms: branding.payment_terms || "",
        bank_details: branding.bank_details || "",
        show_logo: branding.show_logo ?? true,
      });
    }
  }, [branding]);

  const updateField = (field: keyof CompanyBrandingInput, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await upsertBranding.mutateAsync(formData);
    setHasChanges(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Logo must be less than 2MB");
        return;
      }
      uploadLogo.mutate(file);
    }
  };

  const handleRemoveLogo = () => {
    if (confirm("Remove your company logo?")) {
      removeLogo.mutate();
    }
  };

  const [isSendingPreview, setIsSendingPreview] = useState(false);

  const handleSendPreview = async () => {
    if (!user?.email) {
      toast.error("No email found on your account");
      return;
    }

    setIsSendingPreview(true);

    try {
      // Build branding for PDF
      const mockBranding = {
        id: branding?.id || "",
        team_id: branding?.team_id || "",
        company_name: formData.company_name || null,
        company_address: formData.company_address || null,
        company_phone: formData.company_phone || null,
        company_email: formData.company_email || null,
        company_website: formData.company_website || null,
        logo_url: branding?.logo_url || null,
        accent_color: formData.accent_color || "#00FFB2",
        footer_message: formData.footer_message || "Thank you for your business!",
        payment_terms: formData.payment_terms || null,
        bank_details: formData.bank_details || null,
        show_logo: formData.show_logo ?? true,
        created_at: branding?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Generate PDF locally
      let pdfDoc;
      if (previewDocType === "invoice") {
        const mockInvoice = {
          id: "preview",
          display_number: "INV-2025-0042",
          issue_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 14 * 86400000).toISOString(),
          status: "sent" as const,
          total: 2060.25,
          subtotal: 1675.00,
          tax_rate: 23,
          tax_amount: 385.25,
          currency: "EUR",
          notes: "Sample invoice generated for branding preview.",
          customer: { name: "Sarah Johnson", email: "sarah@example.com" },
          invoice_items: [
            { description: "EV Charger Installation", quantity: 1, unit_price: 850, total_price: 850, tax_rate: 23 },
            { description: "7kW Wallbox Unit", quantity: 1, unit_price: 650, total_price: 650, tax_rate: 23 },
            { description: "Cable routing & containment", quantity: 1, unit_price: 175, total_price: 175, tax_rate: 23 },
          ],
        } as any;
        pdfDoc = await generateInvoicePdf(mockInvoice, mockBranding as any, "€");
      } else {
        const mockQuote = {
          id: "preview",
          display_number: "QTE-2025-0018",
          created_at: new Date().toISOString(),
          valid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
          status: "draft" as const,
          total: 2060.25,
          subtotal: 1675.00,
          tax_rate: 23,
          tax_amount: 385.25,
          notes: "Sample quote generated for branding preview.",
          customer: { name: "Sarah Johnson", email: "sarah@example.com" },
          quote_items: [
            { description: "EV Charger Installation", quantity: 1, unit_price: 850, total_price: 850, tax_rate: 23 },
            { description: "7kW Wallbox Unit", quantity: 1, unit_price: 650, total_price: 650, tax_rate: 23 },
            { description: "Cable routing & containment", quantity: 1, unit_price: 175, total_price: 175, tax_rate: 23 },
          ],
        } as any;
        pdfDoc = await generateQuotePdf(mockQuote, mockBranding as any, "€");
      }

      const pdfBase64 = pdfDoc.output("datauristring").split(",")[1];

      // Launch backend-driven task
      const backendSteps = PREVIEW_EMAIL_STEPS.map((s) => ({
        step_key: s.id,
        label: s.label,
      }));

      await startBackendTask(
        "send_preview",
        `Sending ${previewDocType} preview`,
        backendSteps,
        { pdfBase64, documentType: previewDocType },
        "preview"
      );
    } catch (err: any) {
      console.error("Preview send failed:", err);
      toast.error(err?.message || "Failed to send preview");
    } finally {
      setIsSendingPreview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }


  const alignButtons: { value: LogoAlign; icon: typeof AlignLeft }[] = [
    { value: "left", icon: AlignLeft },
    { value: "center", icon: AlignCenter },
    { value: "right", icon: AlignRight },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* LEFT — Settings Forms */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Template + Preview Controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Document Style
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Template</Label>
                <Select value={templateStyle} onValueChange={(v) => setTemplateStyle(v as TemplateStyle)}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preview</Label>
                <div className="flex gap-1">
                  <Button
                    variant={previewDocType === "invoice" ? "default" : "outline"}
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => setPreviewDocType("invoice")}
                  >
                    Invoice
                  </Button>
                  <Button
                    variant={previewDocType === "quote" ? "default" : "outline"}
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => setPreviewDocType("quote")}
                  >
                    Quote
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Company Logo
            </CardTitle>
            <CardDescription>
              Your logo appears on invoices, quotes, and customer-facing documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                {branding?.logo_url ? (
                  <div className="relative group">
                    <img
                      src={branding.logo_url}
                      alt="Company logo"
                      className="h-24 w-24 object-contain rounded-lg border bg-white p-2"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
                    <Image className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLogo.isPending}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadLogo.isPending ? "Uploading..." : "Upload Logo"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG or SVG. Max 2MB. Auto-scaled to fit.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-logo"
                      checked={formData.show_logo}
                      onCheckedChange={(v) => updateField("show_logo", v)}
                    />
                    <Label htmlFor="show-logo" className="text-sm">
                      Show logo
                    </Label>
                  </div>
                  <div className="flex items-center gap-1 border rounded-md">
                    {alignButtons.map(({ value, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setLogoAlign(value)}
                        className={`p-1.5 rounded transition-colors ${
                          logoAlign === value
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-muted-foreground"
                        }`}
                        title={`Align ${value}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Details
            </CardTitle>
            <CardDescription>
              This information appears in the header of your documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  placeholder="Acme Electrical Ltd"
                  value={formData.company_name || ""}
                  onChange={(e) => updateField("company_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_phone">Phone</Label>
                <Input
                  id="company_phone"
                  placeholder="+353 1 234 5678"
                  value={formData.company_phone || ""}
                  onChange={(e) => updateField("company_phone", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_address">Address</Label>
              <Textarea
                id="company_address"
                placeholder={"123 Main Street\nDublin 1\nIreland"}
                rows={3}
                value={formData.company_address || ""}
                onChange={(e) => updateField("company_address", e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_email">Email</Label>
                <Input
                  id="company_email"
                  type="email"
                  placeholder="info@company.com"
                  value={formData.company_email || ""}
                  onChange={(e) => updateField("company_email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_website">Website</Label>
                <Input
                  id="company_website"
                  placeholder="www.company.com"
                  value={formData.company_website || ""}
                  onChange={(e) => updateField("company_website", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accent Color */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Brand Color
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateField("accent_color", color.value)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    formData.accent_color === color.value
                      ? "border-foreground scale-110 ring-2 ring-offset-2 ring-foreground/20"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
              <div className="flex items-center gap-2 ml-2">
                <Label htmlFor="custom-color" className="text-sm text-muted-foreground">Custom:</Label>
                <Input
                  id="custom-color"
                  type="color"
                  value={formData.accent_color || "#00FFB2"}
                  onChange={(e) => updateField("accent_color", e.target.value)}
                  className="w-10 h-10 p-1 cursor-pointer"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer & Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Footer & Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="footer_message">Footer Message</Label>
              <Input
                id="footer_message"
                placeholder="Thank you for your business!"
                value={formData.footer_message || ""}
                onChange={(e) => updateField("footer_message", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-payment-terms"
                    checked={showPaymentTerms}
                    onCheckedChange={setShowPaymentTerms}
                  />
                  <Label htmlFor="show-payment-terms" className="text-xs text-muted-foreground">Show on docs</Label>
                </div>
              </div>
              <Textarea
                id="payment_terms"
                placeholder={"Payment due within 14 days of invoice date.\nLate payments may incur a 2% monthly charge."}
                rows={2}
                value={formData.payment_terms || ""}
                onChange={(e) => updateField("payment_terms", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Bank Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bank_details">Bank Account Information</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-bank-details"
                    checked={showBankDetails}
                    onCheckedChange={setShowBankDetails}
                  />
                  <Label htmlFor="show-bank-details" className="text-xs text-muted-foreground">Show on docs</Label>
                </div>
              </div>
              <Textarea
                id="bank_details"
                placeholder={"Bank: AIB\nIBAN: IE12 AIBK 1234 5678 9012 34\nBIC: AIBKIE2D"}
                rows={3}
                value={formData.bank_details || ""}
                onChange={(e) => updateField("bank_details", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Displayed on invoices and quotes for bank transfer payments only — not used for online payments.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pb-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || upsertBranding.isPending}
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {upsertBranding.isPending ? "Saving..." : "Save Branding Settings"}
          </Button>
        </div>
      </div>

      {/* RIGHT — Live Preview */}
      <div className="lg:w-[380px] xl:w-[420px] shrink-0">
        <div className="lg:sticky lg:top-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Live Preview
            </Badge>
            <span className="text-xs text-muted-foreground">Updates as you type</span>
          </div>
          <DocumentPreview
            data={{
              logoUrl: branding?.logo_url,
              showLogo: formData.show_logo ?? true,
              logoAlign,
              companyName: formData.company_name || "",
              companyAddress: formData.company_address || "",
              companyPhone: formData.company_phone || "",
              companyEmail: formData.company_email || "",
              companyWebsite: formData.company_website || "",
              accentColor: formData.accent_color || "#00FFB2",
              footerMessage: formData.footer_message || "",
              paymentTerms: formData.payment_terms || "",
              bankDetails: formData.bank_details || "",
              showPaymentTerms,
              showBankDetails,
              templateStyle,
              documentType: previewDocType,
            }}
          />
          {/* Send Preview Button */}
          <div className="pt-2 border-t border-border">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSendPreview}
              disabled={isSendingPreview}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Preview to Myself
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-1.5">
              Emails a test {previewDocType} PDF to your account email only
            </p>
          </div>
        </div>
      </div>

      {/* Progress is now shown via the global AgentTaskPanel */}
    </div>
  );
}
