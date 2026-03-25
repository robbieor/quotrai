import { SEOHead } from "@/components/shared/SEOHead";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  ArrowLeft,
  Smartphone,
  Apple,
  Monitor,
  Camera,
  Shield,
  FileText,
  Image,
  Globe,
} from "lucide-react";
import foremanLogo from "@/assets/foreman-logo.png";

const iconSizes = [
  { size: "1024×1024", platform: "iOS App Store", required: true, note: "No alpha channel, no rounded corners" },
  { size: "512×512", platform: "Google Play Store", required: true, note: "32-bit PNG with alpha" },
  { size: "192×192", platform: "PWA / Web", required: true, note: "Maskable icon recommended" },
  { size: "180×180", platform: "iOS Home Screen", required: true, note: "apple-touch-icon" },
  { size: "167×167", platform: "iPad Pro", required: false, note: "App icon" },
  { size: "152×152", platform: "iPad", required: false, note: "App icon" },
  { size: "120×120", platform: "iPhone (Retina)", required: false, note: "Spotlight & Settings" },
  { size: "76×76", platform: "iPad (non-Retina)", required: false, note: "App icon" },
];

const iosChecklist = [
  { step: "Create an Apple Developer account ($99/year)", done: false },
  { step: "Register a Bundle ID: app.lovable.9b11f743854248068d3ea81555111caa", done: true },
  { step: "Generate signing certificates & provisioning profiles in Xcode", done: false },
  { step: "Add Info.plist permission strings (mic, location, camera)", done: true },
  { step: "Prepare 1024×1024 app icon (no alpha, no rounded corners)", done: true },
  { step: "Capture screenshots for iPhone 6.7\" and 6.1\" devices", done: false },
  { step: "Write App Store listing copy (subtitle, keywords, description)", done: true },
  { step: "Add App Review notes explaining reader subscription model", done: true },
  { step: "Archive build in Xcode → Upload to App Store Connect", done: false },
  { step: "Submit for review (allow 1–3 business days)", done: false },
];

const androidChecklist = [
  { step: "Create a Google Play Developer account ($25 one-time)", done: false },
  { step: "Register package ID: app.lovable.9b11f743854248068d3ea81555111caa", done: true },
  { step: "Generate a signed APK or AAB in Android Studio", done: false },
  { step: "Prepare 512×512 app icon and feature graphic (1024×500)", done: false },
  { step: "Capture screenshots for phone and tablet", done: false },
  { step: "Write Play Store listing (title, short desc, full desc)", done: true },
  { step: "Set content rating via questionnaire", done: false },
  { step: "Complete Data Safety section", done: false },
  { step: "Upload AAB to Play Console → Submit for review", done: false },
  { step: "Review typically takes 1–7 days for new apps", done: false },
];

const screenshotSpecs = [
  { device: "iPhone 6.7\" (15 Pro Max)", resolution: "1290 × 2796", required: true },
  { device: "iPhone 6.1\" (15 Pro)", resolution: "1179 × 2556", required: true },
  { device: "iPad Pro 12.9\"", resolution: "2048 × 2732", required: false },
  { device: "Android Phone", resolution: "1080 × 1920 min", required: true },
  { device: "Android Tablet 7\"", resolution: "1200 × 1920 min", required: false },
  { device: "Android Tablet 10\"", resolution: "1600 × 2560 min", required: false },
];

const permissions = [
  { key: "NSMicrophoneUsageDescription", value: "Foreman uses the microphone for Foreman AI voice commands" },
  { key: "NSLocationWhenInUseUsageDescription", value: "Foreman uses your location to verify job site attendance" },
  { key: "NSLocationAlwaysAndWhenInUseUsageDescription", value: "Foreman tracks your location in the background for GPS time tracking" },
  { key: "NSCameraUsageDescription", value: "Foreman uses the camera for site visit verification photos" },
];

export default function AppStoreAssets() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="App Store Assets & Submission Guide"
        description="Everything needed to submit Foreman to the Apple App Store and Google Play Store."
        path="/app-store-assets"
      />

      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <img src={foremanLogo} alt="Foreman" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold tracking-tight">App Store Assets</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl space-y-12">

        {/* App Icon Preview */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Image className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">App Icon</h2>
          </div>
          <div className="flex items-end gap-6 flex-wrap">
            {[128, 96, 64, 48, 32].map((size) => (
              <div key={size} className="text-center">
                <img
                  src={foremanLogo}
                  alt={`Foreman icon ${size}px`}
                  className="rounded-2xl shadow-md"
                  style={{ width: size, height: size }}
                />
                <p className="text-xs text-muted-foreground mt-2">{size}px</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <a href="/icon-1024.png" download>
              <Button variant="outline" size="sm">Download 1024px</Button>
            </a>
            <a href="/icon-512.png" download>
              <Button variant="outline" size="sm">Download 512px</Button>
            </a>
          </div>
        </section>

        <Separator />

        {/* Icon Requirements */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Required Icon Sizes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-4 font-semibold">Size</th>
                  <th className="py-3 pr-4 font-semibold">Platform</th>
                  <th className="py-3 pr-4 font-semibold">Required</th>
                  <th className="py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {iconSizes.map((icon) => (
                  <tr key={icon.size + icon.platform} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-mono text-xs">{icon.size}</td>
                    <td className="py-3 pr-4">{icon.platform}</td>
                    <td className="py-3 pr-4">
                      {icon.required ? (
                        <Badge variant="default" className="text-xs">Required</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">{icon.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Separator />

        {/* iOS Submission Checklist */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Apple className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">iOS App Store Checklist</h2>
          </div>
          <ol className="space-y-3">
            {iosChecklist.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                  item.done ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/30"
                }`}>
                  {item.done && <Check className="h-3 w-3" />}
                </div>
                <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.step}</span>
              </li>
            ))}
          </ol>
        </section>

        <Separator />

        {/* Android Submission Checklist */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Google Play Store Checklist</h2>
          </div>
          <ol className="space-y-3">
            {androidChecklist.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                  item.done ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/30"
                }`}>
                  {item.done && <Check className="h-3 w-3" />}
                </div>
                <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.step}</span>
              </li>
            ))}
          </ol>
        </section>

        <Separator />

        {/* Screenshot Requirements */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Screenshot Requirements</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Upload 2–8 screenshots per device size. Recommended screens: Dashboard, Invoice creation, Quote builder, Time tracking, Client list, Receipt scanning, Reports, Branding settings.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-4 font-semibold">Device</th>
                  <th className="py-3 pr-4 font-semibold">Resolution</th>
                  <th className="py-3 font-semibold">Required</th>
                </tr>
              </thead>
              <tbody>
                {screenshotSpecs.map((spec) => (
                  <tr key={spec.device} className="border-b border-border/50">
                    <td className="py-3 pr-4">{spec.device}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{spec.resolution}</td>
                    <td className="py-3">
                      {spec.required ? (
                        <Badge variant="default" className="text-xs">Required</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Separator />

        {/* Info.plist Permissions */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">iOS Permission Strings</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Add these to your <code className="text-xs bg-muted px-1.5 py-0.5 rounded">Info.plist</code> before submitting to the App Store.
          </p>
          <div className="space-y-3">
            {permissions.map((perm) => (
              <div key={perm.key} className="rounded-lg border border-border bg-card p-4">
                <p className="font-mono text-xs text-primary mb-1">{perm.key}</p>
                <p className="text-sm text-muted-foreground">{perm.value}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Store Listing Copy */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Store Listing Copy</h2>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">App Name</p>
              <p className="font-semibold">Foreman - Invoice & Job Tracker</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Subtitle (iOS)</p>
              <p>Quotes, invoices & time tracking</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Short Description (Android)</p>
              <p>Create invoices, scan receipts, track expenses & time. Perfect for tradespeople.</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Keywords (iOS, 100 chars)</p>
              <p className="font-mono text-xs">invoice,quotes,tradesperson,contractor,expenses,time tracking,GPS,receipts,plumber,electrician,VAT</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Promotional Text (iOS, 170 chars)</p>
              <p className="text-sm">Run your trade business from your pocket. Create invoices, track time with GPS, manage clients, and get AI-powered assistance — all in one app built for tradespeople.</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Links */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Required Links</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link to="/privacy" className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors">
              <p className="font-semibold mb-1">Privacy Policy</p>
              <p className="text-sm text-muted-foreground">quotr.work/privacy</p>
            </Link>
            <Link to="/terms" className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors">
              <p className="font-semibold mb-1">Terms of Service</p>
              <p className="text-sm text-muted-foreground">quotr.work/terms</p>
            </Link>
          </div>
        </section>

        <div className="pb-12" />
      </div>
    </div>
  );
}
