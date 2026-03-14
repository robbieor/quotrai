import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { UserMenu } from "./UserMenu";
import { NotificationCenter } from "./NotificationCenter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { FloatingTomButton } from "./FloatingTomButton";
import { DemoOverlay } from "@/components/demo/DemoOverlay";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { status } = useGlobalVoiceAgent();
  const isCallActive = status === "connected";
  const demo = useDemoMode();

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className={cn(
          "min-h-screen flex w-full bg-background transition-[padding-top] duration-200",
          isCallActive && "pt-10"
        )}>
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TrialBanner />
            <header className="h-12 md:h-14 border-b border-border text-muted-foreground items-center justify-start flex flex-row px-2 md:px-[8px] py-[10px] bg-primary-foreground sticky top-0 z-20">
              <SidebarTrigger className="mr-2 md:mr-4" />
              <div className="flex-1" />
              <NotificationCenter />
              <UserMenu />
            </header>
            <main className="flex-1 p-3 md:p-6 overflow-auto py-3 md:py-[22px]">
              {children}
            </main>
          </div>
          <FloatingTomButton />
          <DemoOverlay
            currentStep={demo.currentStep}
            currentStepIndex={demo.currentStepIndex}
            totalSteps={demo.totalSteps}
            isNarrating={demo.isNarrating}
            onNext={demo.nextStep}
            onPrev={demo.prevStep}
            onStop={demo.stopDemo}
            onPlayAll={demo.playAll}
          />
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}