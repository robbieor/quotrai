import { useEffect, lazy, Suspense } from "react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useAutoSyncTools } from "@/hooks/useAutoSyncTools";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { VoiceAgentProvider } from "@/contexts/VoiceAgentContext";
import { AgentTaskProvider } from "@/contexts/AgentTaskContext";
import { HighlightProvider } from "@/contexts/HighlightContext";
import { RolePreviewProvider } from "@/contexts/RolePreviewContext";
import { RolePreviewBanner } from "@/components/admin/RolePreviewBanner";
import { NavigationBridge } from "@/components/voice/NavigationBridge";
import { LiveActionOverlay } from "@/components/voice/LiveActionOverlay";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { SeatGuard } from "@/components/auth/SeatGuard";
import { useIsNative } from "@/hooks/useIsNative";

// Lazy-loaded pages
const Landing = lazy(() => import("./pages/Landing"));
const TradeLanding = lazy(() => import("./pages/TradeLanding"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const SelectPlan = lazy(() => import("./pages/SelectPlan"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Jobs = lazy(() => import("./pages/Jobs"));
const JobCalendar = lazy(() => import("./pages/JobCalendar"));
const Customers = lazy(() => import("./pages/Customers"));
const Quotes = lazy(() => import("./pages/Quotes"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Leads = lazy(() => import("./pages/Leads"));
const George = lazy(() => import("./pages/George"));
const GeorgeCapabilities = lazy(() => import("./pages/GeorgeCapabilities"));
const Settings = lazy(() => import("./pages/Settings"));
const Reports = lazy(() => import("./pages/Reports"));
const Templates = lazy(() => import("./pages/Templates"));
const Documents = lazy(() => import("./pages/Documents"));
const Certificates = lazy(() => import("./pages/Certificates"));
const Notifications = lazy(() => import("./pages/Notifications"));
const TimeTracking = lazy(() => import("./pages/TimeTracking"));
const PriceBook = lazy(() => import("./pages/PriceBook"));
const PricebookDetail = lazy(() => import("./pages/PricebookDetail"));
const Pricing = lazy(() => import("./pages/Pricing"));
const AppStoreAssets = lazy(() => import("./pages/AppStoreAssets"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const RequestAccess = lazy(() => import("./pages/RequestAccess"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const QuotePortal = lazy(() => import("./pages/QuotePortal"));
const InvoicePortal = lazy(() => import("./pages/InvoicePortal"));
const CustomerLogin = lazy(() => import("./pages/CustomerLogin"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const AIAuditHistory = lazy(() => import("./pages/AIAuditHistory"));
const VoiceUsage = lazy(() => import("./pages/VoiceUsage"));
const Industries = lazy(() => import("./pages/Industries"));
const InvestorPitch = lazy(() => import("./pages/InvestorPitch"));
const InvestorMarket = lazy(() => import("./pages/InvestorMarket"));
const InvestorProduct = lazy(() => import("./pages/InvestorProduct"));
const InvestorTeam = lazy(() => import("./pages/InvestorTeam"));
const InvestorProjections = lazy(() => import("./pages/FounderProjections"));
const InvestorForecast = lazy(() => import("./pages/InvestorForecast"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const SubscriptionConfirmed = lazy(() => import("./pages/SubscriptionConfirmed"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FunnelAnalytics = lazy(() => import("./pages/FunnelAnalytics"));
const ConnectProducts = lazy(() => import("./pages/ConnectProducts"));
const Storefront = lazy(() => import("./pages/Storefront"));

const queryClient = new QueryClient();

function RootRedirect() {
  const isNative = useIsNative();
  if (isNative) return <Navigate to="/login" replace />;
  return <Landing />;
}

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Invisible component that initializes offline sync inside QueryClientProvider
function OfflineSyncInit() {
  useOfflineSync();
  return null;
}

// Silently sync voice agent tools once per session
function AutoSyncInit() {
  useAutoSyncTools();
  return null;
}

const App = () => {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const reasonMessage =
        typeof event.reason === "string"
          ? event.reason
          : event.reason?.message;

      if (
        typeof reasonMessage === "string" &&
        reasonMessage.includes("Failed to fetch dynamically imported module")
      ) {
        const hasReloaded = sessionStorage.getItem("__foreman_chunk_retry__");
        if (!hasReloaded) {
          sessionStorage.setItem("__foreman_chunk_retry__", "1");
          window.location.reload();
          return;
        }
      }

      console.error("Unhandled rejection:", event.reason);
    };

    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <OfflineSyncInit />
      <AutoSyncInit />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <VoiceAgentProvider>
          <HighlightProvider>
            <AgentTaskProvider>
              <BrowserRouter>
                <RolePreviewProvider>
                  <RolePreviewBanner />
                  <NavigationBridge />
                  <LiveActionOverlay />
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                    {/* Public pages */}
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/trade/:tradeSlug" element={<TradeLanding />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/request-access" element={<RequestAccess />} />
                    <Route path="/industries" element={<Industries />} />
                    <Route path="/accept-invite" element={<AcceptInvite />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />

                    {/* Investor deck — gated behind auth */}
                    <Route path="/investor/pitch" element={<RoleGuard><InvestorPitch /></RoleGuard>} />
                    <Route path="/investor/market" element={<RoleGuard><InvestorMarket /></RoleGuard>} />
                    <Route path="/investor/product" element={<RoleGuard><InvestorProduct /></RoleGuard>} />
                    <Route path="/investor/team" element={<RoleGuard><InvestorTeam /></RoleGuard>} />
                    <Route path="/investor/projections" element={<RoleGuard><InvestorProjections /></RoleGuard>} />
                    <Route path="/investor/forecast" element={<RoleGuard><InvestorForecast /></RoleGuard>} />

                    {/* Portal pages */}
                    <Route path="/quote/:token" element={<QuotePortal />} />
                    <Route path="/invoice/:token" element={<InvoicePortal />} />
                    <Route path="/portal/invoice" element={<InvoicePortal />} />
                    <Route path="/portal/quote" element={<QuotePortal />} />
                    <Route path="/customer/login" element={<CustomerLogin />} />
                    <Route path="/customer/dashboard" element={<CustomerDashboard />} />

                    {/* Onboarding */}
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/select-plan" element={<SelectPlan />} />
                    <Route path="/subscription-confirmed" element={<SubscriptionConfirmed />} />

                    {/* Protected dashboard pages — all seats */}
                    <Route path="/dashboard" element={<RoleGuard><Dashboard /></RoleGuard>} />
                    <Route path="/jobs" element={<Jobs />} />
                    <Route path="/calendar" element={<JobCalendar />} />
                    <Route path="/customers" element={<RoleGuard><Customers /></RoleGuard>} />
                    <Route path="/quotes" element={<RoleGuard><Quotes /></RoleGuard>} />
                    <Route path="/invoices" element={<RoleGuard><Invoices /></RoleGuard>} />
                    <Route path="/templates" element={<RoleGuard><Templates /></RoleGuard>} />
                    <Route path="/price-book" element={<RoleGuard><PriceBook /></RoleGuard>} />
                    <Route path="/price-book/:id" element={<RoleGuard><PricebookDetail /></RoleGuard>} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/time-tracking" element={<TimeTracking />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/app-store-assets" element={<RoleGuard><AppStoreAssets /></RoleGuard>} />

                    {/* Connect+ seat required */}
                    <Route path="/expenses" element={<RoleGuard><SeatGuard requiredSeat="connect"><Expenses /></SeatGuard></RoleGuard>} />
                    <Route path="/foreman-ai" element={<RoleGuard><SeatGuard requiredSeat="connect"><George /></SeatGuard></RoleGuard>} />
                    <Route path="/foreman-ai/capabilities" element={<RoleGuard><SeatGuard requiredSeat="connect"><GeorgeCapabilities /></SeatGuard></RoleGuard>} />
                    <Route path="/george" element={<Navigate to="/foreman-ai" replace />} />
                    <Route path="/ai-audit" element={<RoleGuard><SeatGuard requiredSeat="connect"><AIAuditHistory /></SeatGuard></RoleGuard>} />
                    <Route path="/voice-usage" element={<RoleGuard><SeatGuard requiredSeat="connect"><VoiceUsage /></SeatGuard></RoleGuard>} />
                    <Route path="/reports" element={<RoleGuard><SeatGuard requiredSeat="connect"><Reports /></SeatGuard></RoleGuard>} />
                    <Route path="/documents" element={<RoleGuard><SeatGuard requiredSeat="connect"><Documents /></SeatGuard></RoleGuard>} />
                    <Route path="/certificates" element={<RoleGuard><SeatGuard requiredSeat="connect"><Certificates /></SeatGuard></RoleGuard>} />

                    {/* Grow seat required */}
                    <Route path="/leads" element={<RoleGuard><SeatGuard requiredSeat="grow"><Leads /></SeatGuard></RoleGuard>} />
                    <Route path="/funnel" element={<RoleGuard><FunnelAnalytics /></RoleGuard>} />
                    <Route path="/connect/products" element={<RoleGuard><ConnectProducts /></RoleGuard>} />

                    {/* Public storefront — no auth required */}
                    <Route path="/storefront/:accountId" element={<Storefront />} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </RolePreviewProvider>
              </BrowserRouter>
            </AgentTaskProvider>
          </HighlightProvider>
        </VoiceAgentProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
