import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { UserMenu } from "./UserMenu";
import { NotificationCenter } from "./NotificationCenter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { FloatingTomButton } from "./FloatingTomButton";
import { AgentTaskPanel } from "@/components/shared/AgentTaskPanel";
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
            <header className="h-12 md:h-14 border-b border-border text-card items-center justify-start flex flex-row md:px-6 py-[10px] sticky top-0 z-20 bg-primary-foreground px-[2px] my-[18px]">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              <div className="flex items-center gap-1">
                <NotificationCenter />
                <UserMenu />
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              <div className="mx-auto w-full max-w-7xl px-4 md:px-8 py-5 md:py-8 pb-24 md:pb-8">
                {children}
              </div>
            </main>
          </div>
          <FloatingTomButton />
          <AgentTaskPanel />
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
