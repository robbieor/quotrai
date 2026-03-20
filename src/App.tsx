import { useEffect, lazy, Suspense } from "react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { VoiceAgentProvider } from "@/contexts/VoiceAgentContext";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { SeatGuard } from "@/components/auth/SeatGuard";

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
const Settings = lazy(() => import("./pages/Settings"));
const Reports = lazy(() => import("./pages/Reports"));
const Templates = lazy(() => import("./pages/Templates"));
const Documents = lazy(() => import("./pages/Documents"));
const Certificates = lazy(() => import("./pages/Certificates"));
const Notifications = lazy(() => import("./pages/Notifications"));
const TimeTracking = lazy(() => import("./pages/TimeTracking"));
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
const Industries = lazy(() => import("./pages/Industries"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

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
        const hasReloaded = sessionStorage.getItem("__quotr_chunk_retry__");
        if (!hasReloaded) {
          sessionStorage.setItem("__quotr_chunk_retry__", "1");
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
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <VoiceAgentProvider>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public pages */}
                <Route path="/" element={<Landing />} />
                <Route path="/trade/:tradeSlug" element={<TradeLanding />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/request-access" element={<RequestAccess />} />
                <Route path="/app-store-assets" element={<AppStoreAssets />} />
                <Route path="/industries" element={<Industries />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />

                {/* Portal pages */}
                <Route path="/quote/:token" element={<QuotePortal />} />
                <Route path="/invoice/:token" element={<InvoicePortal />} />
                <Route path="/customer/login" element={<CustomerLogin />} />
                <Route path="/customer/dashboard" element={<CustomerDashboard />} />

                {/* Onboarding */}
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/select-plan" element={<SelectPlan />} />

                {/* Protected dashboard pages — all seats */}
                <Route path="/dashboard" element={<RoleGuard><Dashboard /></RoleGuard>} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/calendar" element={<JobCalendar />} />
                <Route path="/customers" element={<RoleGuard><Customers /></RoleGuard>} />
                <Route path="/quotes" element={<RoleGuard><Quotes /></RoleGuard>} />
                <Route path="/invoices" element={<RoleGuard><Invoices /></RoleGuard>} />
                <Route path="/templates" element={<RoleGuard><Templates /></RoleGuard>} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/time-tracking" element={<TimeTracking />} />
                <Route path="/settings" element={<Settings />} />

                {/* Connect+ seat required */}
                <Route path="/expenses" element={<RoleGuard><SeatGuard requiredSeat="connect"><Expenses /></SeatGuard></RoleGuard>} />
                <Route path="/george" element={<SeatGuard requiredSeat="connect"><George /></SeatGuard>} />
                <Route path="/ai-audit" element={<RoleGuard><SeatGuard requiredSeat="connect"><AIAuditHistory /></SeatGuard></RoleGuard>} />
                <Route path="/reports" element={<RoleGuard><SeatGuard requiredSeat="connect"><Reports /></SeatGuard></RoleGuard>} />
                <Route path="/documents" element={<RoleGuard><SeatGuard requiredSeat="connect"><Documents /></SeatGuard></RoleGuard>} />
                <Route path="/certificates" element={<RoleGuard><SeatGuard requiredSeat="connect"><Certificates /></SeatGuard></RoleGuard>} />

                {/* Grow seat required */}
                <Route path="/leads" element={<RoleGuard><SeatGuard requiredSeat="grow"><Leads /></SeatGuard></RoleGuard>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </VoiceAgentProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
