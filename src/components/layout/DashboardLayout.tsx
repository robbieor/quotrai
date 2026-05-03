import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { UserMenu } from "./UserMenu";
import { NotificationCenter } from "./NotificationCenter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ReadOnlyBanner } from "@/components/billing/ReadOnlyBanner";
import { TrialCountdownPopup } from "@/components/billing/TrialCountdownPopup";
import { FloatingTomButton } from "./FloatingTomButton";
import { ActiveCallBar } from "./ActiveCallBar";
import { AgentTaskPanel } from "@/components/shared/AgentTaskPanel";
import { MobileTabBar } from "./MobileTabBar";
import { CommandBar, useCommandBar } from "@/components/command/CommandBar";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { status } = useGlobalVoiceAgent();
  const isCallActive = status === "connected";
  const commandBar = useCommandBar();

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className={cn(
          "min-h-screen flex w-full bg-background transition-[padding-top] duration-200",
          isCallActive && "pt-10"
        )}>
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <ReadOnlyBanner />
            
            <header className="border-b items-center justify-start flex flex-row px-3 md:px-6 py-[10px] sticky top-0 z-20 pt-[max(10px,env(safe-area-inset-top))] bg-background border-border md:bg-sidebar md:border-sidebar-border" style={{minHeight: 'calc(3rem + env(safe-area-inset-top, 0px))' }}>
              <SidebarTrigger className="mr-2 md:mr-4 text-white/70 hover:text-white hidden md:inline-flex" />

              {/* Command Bar Trigger - desktop only */}
              <button
                onClick={() => commandBar.setOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/50 text-xs hover:bg-white/10 hover:text-white/70 transition-colors flex-1 max-w-xs"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search or command...</span>
                <kbd className="inline-flex ml-auto text-[10px] bg-white/10 border border-white/10 rounded px-1.5 py-0.5 font-mono text-white/40">
                  ⌘K
                </kbd>
              </button>

              <div className="flex-1" />
              <div className="text-foreground/70 [&_button]:text-foreground/70 [&_button:hover]:text-foreground md:text-white/70 md:[&_button]:text-white/70 md:[&_button:hover]:text-white">
                <NotificationCenter />
              </div>
              <div className="text-foreground/70 [&_button]:text-foreground/70 [&_button:hover]:text-foreground md:text-white/70 md:[&_button]:text-white/70 md:[&_button:hover]:text-white">
                <UserMenu />
              </div>
            </header>
            <main className="flex-1 overflow-auto safe-area-px">
              <div className="mx-auto w-full max-w-7xl px-4 sm:px-5 md:px-6 py-3 sm:py-4 md:py-6 space-y-4 sm:space-y-6 pb-[calc(80px+env(safe-area-inset-bottom,0px))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
                {children}
              </div>
            </main>
          </div>
          <ActiveCallBar />
          <FloatingTomButton />
          <AgentTaskPanel />
          <TrialCountdownPopup />
          <CommandBar open={commandBar.open} onOpenChange={commandBar.setOpen} />
          <MobileTabBar />
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}