import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  Trash2, 
  Building2, 
  Palette, 
  FileText, 
  CreditCard,
  Image,
  Save
} from "lucide-react";
import { useCompanyBranding, CompanyBrandingInput } from "@/hooks/useCompanyBranding";

const ACCENT_COLORS = [
  { name: "Quotr Green", value: "#00FFB2" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Orange", value: "#F97316" },
  { name: "Red", value: "#EF4444" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Slate", value: "#64748B" },
];

export function BrandingSettings() {
  const { branding, isLoading, upsertBranding, uploadLogo, removeLogo } = useCompanyBranding();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Load branding data into form
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                PNG, JPG or SVG. Max 2MB. Recommended: 400x400px or higher.
              </p>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-logo"
                  checked={formData.show_logo}
                  onCheckedChange={(v) => updateField("show_logo", v)}
                />
                <Label htmlFor="show-logo" className="text-sm">
                  Show logo on documents
                </Label>
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
            This information appears in the header of your invoices and quotes
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
              placeholder="123 Main Street&#10;Dublin 1&#10;Ireland"
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
          <CardDescription>
            Choose an accent color for table headers and highlights in your documents
          </CardDescription>
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
              <Label htmlFor="custom-color" className="text-sm text-muted-foreground">
                Custom:
              </Label>
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
          <CardDescription>
            Customize the footer message and payment terms on your documents
          </CardDescription>
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
            <Label htmlFor="payment_terms">Payment Terms</Label>
            <Textarea
              id="payment_terms"
              placeholder="Payment due within 14 days of invoice date.&#10;Late payments may incur a 2% monthly charge."
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
          <CardDescription>
            Add your bank account details to appear on invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="bank_details">Bank Account Information</Label>
            <Textarea
              id="bank_details"
              placeholder="Bank: AIB&#10;IBAN: IE12 AIBK 1234 5678 9012 34&#10;BIC: AIBKIE2D"
              rows={3}
              value={formData.bank_details || ""}
              onChange={(e) => updateField("bank_details", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
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
  );
}
