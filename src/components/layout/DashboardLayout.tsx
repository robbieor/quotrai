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
            
            <header className="h-12 md:h-14 border-b border-white/10 items-center justify-start flex flex-row px-3 md:px-6 py-[10px] bg-[hsl(220_26%_12%)] sticky top-0 z-20">
              <SidebarTrigger className="mr-2 md:mr-4 text-white/70 hover:text-white" />

              {/* Command Bar Trigger */}
              <button
                onClick={() => commandBar.setOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/50 text-xs hover:bg-white/10 hover:text-white/70 transition-colors flex-1 max-w-xs"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Search or command...</span>
                <span className="sm:hidden">Search...</span>
                <kbd className="hidden md:inline-flex ml-auto text-[10px] bg-white/10 border border-white/10 rounded px-1.5 py-0.5 font-mono text-white/40">
                  ⌘K
                </kbd>
              </button>

              <div className="flex-1" />
              <div className="text-white/70 [&_button]:text-white/70 [&_button:hover]:text-white">
                <NotificationCenter />
              </div>
              <div className="text-white/70 [&_button]:text-white/70 [&_button:hover]:text-white">
                <UserMenu />
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              <div className="mx-auto w-full max-w-7xl px-5 md:px-6 py-4 md:py-6 space-y-6">
                {children}
              </div>
            </main>
          </div>
          <FloatingTomButton />
          <AgentTaskPanel />
          <TrialCountdownPopup />
          <CommandBar open={commandBar.open} onOpenChange={commandBar.setOpen} />
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}