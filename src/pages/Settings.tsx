import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { SubscriptionPricing } from "@/components/billing/SubscriptionPricing";
import { GeorgeVoiceOverview } from "@/components/settings/GeorgeVoiceOverview";
import { GeorgeBillingReports } from "@/components/billing/GeorgeBillingReports";
import { BrandingSettings } from "@/components/settings/BrandingSettings";
import { DataImportSection } from "@/components/settings/DataImportSection";
import { ExpenseEmailForwarding } from "@/components/settings/ExpenseEmailForwarding";
import { ReferralCard } from "@/components/settings/ReferralCard";
import { StripeConnectSetup } from "@/components/settings/StripeConnectSetup";
import { XeroConnectionCard } from "@/components/settings/XeroConnectionCard";
import { QuickBooksConnectionCard } from "@/components/settings/QuickBooksConnectionCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarCropDialog } from "@/components/settings/AvatarCropDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CreditCard, User, Upload, Loader2, Palette, FileSpreadsheet, Mail } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { CURRENCY_OPTIONS, CurrencyCode } from "@/hooks/useCurrency";
import { CommunicationsSettings } from "@/components/settings/CommunicationsSettings";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Settings() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "profile";
  const { profile, updateProfile } = useProfile();
  const { user } = useAuth();
  const { isTeamSeat } = useUserRole();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("EUR");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with profile when it loads
  useEffect(() => {
    if (profile) {
      if (profile.full_name && !fullName) {
        setFullName(profile.full_name);
      }
      if (profile.avatar_url && !avatarUrl) {
        setAvatarUrl(profile.avatar_url);
      }
      if (profile.currency) {
        setSelectedCurrency(profile.currency as CurrencyCode);
      }
    }
  }, [profile]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 10MB for original before crop)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    // Create object URL for cropping
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setCropDialogOpen(true);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user) return;

    setIsUploading(true);

    try {
      // Create a unique filename
      const fileName = `${user.id}/avatar-${Date.now()}.jpg`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, croppedBlob, { 
          upsert: true,
          contentType: "image/jpeg" 
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Add cache buster to force refresh
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success("Avatar uploaded successfully");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload avatar");
    } finally {
      setIsUploading(false);
      // Clean up object URL
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
        setSelectedImage("");
      }
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // Remove cache buster from URL before saving
      const cleanAvatarUrl = avatarUrl.split("?")[0];
      await updateProfile.mutateAsync({
        full_name: fullName,
        avatar_url: cleanAvatarUrl || undefined,
        currency: selectedCurrency,
      });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage your account, team, and preferences</p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-4 md:space-y-6">
          <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="profile" className="gap-1.5 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <User className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Profile</span>
              <span className="sm:hidden">Me</span>
            </TabsTrigger>
            {!isTeamSeat && (
              <>
                <TabsTrigger value="branding" className="gap-1.5 md:gap-2 text-xs md:text-sm px-2 md:px-3">
                  <Palette className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Branding</span>
                  <span className="sm:hidden">Brand</span>
                </TabsTrigger>
                <TabsTrigger value="import" className="gap-1.5 md:gap-2 text-xs md:text-sm px-2 md:px-3">
                  <FileSpreadsheet className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span>Import</span>
                </TabsTrigger>
                <TabsTrigger value="team" className="gap-1.5 md:gap-2 text-xs md:text-sm px-2 md:px-3">
                  <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span>Team</span>
                </TabsTrigger>
                <TabsTrigger value="billing" className="gap-1.5 md:gap-2 text-xs md:text-sm px-2 md:px-3">
                  <CreditCard className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Billing</span>
                  <span className="sm:hidden">Bill</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <Avatar className="h-20 w-20 border-2 border-border">
                      <AvatarImage src={avatarUrl || undefined} alt={fullName || "User"} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl font-medium">
                        {getInitials(fullName || profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">{fullName || profile?.full_name || "Your Name"}</h3>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="avatar-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="gap-2"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {isUploading ? "Uploading..." : "Upload Photo"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={profile?.email || ""} 
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={selectedCurrency} onValueChange={(v) => setSelectedCurrency(v as CurrencyCode)}>
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((curr) => (
                          <SelectItem key={curr.code} value={curr.code}>
                            {curr.symbol} - {curr.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Used for all monetary displays in the app
                    </p>
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
            <ReferralCard />
          </TabsContent>

          <TabsContent value="branding" className="space-y-6 max-w-3xl">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Document Branding</h2>
              <p className="text-muted-foreground">
                Customize how your invoices and quotes look with your company logo, colors, and details.
              </p>
            </div>
            <BrandingSettings />
          </TabsContent>

          <TabsContent value="import" className="space-y-6 max-w-4xl">
            <ExpenseEmailForwarding />
            <DataImportSection />
          </TabsContent>

          <TabsContent value="team" className="max-w-2xl">
            <TeamManagement />
          </TabsContent>

          <TabsContent value="billing" className="space-y-6 max-w-4xl">
            <StripeConnectSetup />
            <XeroConnectionCard />
            <QuickBooksConnectionCard />
            <SubscriptionPricing />
            <GeorgeVoiceOverview />
            <GeorgeBillingReports />
          </TabsContent>
        </Tabs>
      </div>

      {/* Avatar Crop Dialog */}
      <AvatarCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={selectedImage}
        onCropComplete={handleCropComplete}
      />
    </DashboardLayout>
  );
}
