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
import { Search, Phone } from "lucide-react";
import { useState } from "react";

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
            
            <header className="hidden md:flex border-b border-sidebar-border items-center justify-start flex-row px-6 py-[10px] sticky top-0 z-20 bg-sidebar" style={{minHeight: '3rem'}}>
              <SidebarTrigger className="mr-4 text-white/70 hover:text-white" />

              <button
                onClick={() => commandBar.setOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/50 text-xs hover:bg-white/10 hover:text-white/70 transition-colors flex-1 max-w-xs"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search or command...</span>
                <kbd className="inline-flex ml-auto text-[10px] bg-white/10 border border-white/10 rounded px-1.5 py-0.5 font-mono text-white/40">
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

            {/* Mobile sticky top bar (in-flow, not overlapping) */}
            <header
              className="md:hidden sticky top-0 z-30 flex items-center justify-end gap-1 bg-background/95 backdrop-blur border-b border-border px-2 h-10"
              style={{
                marginTop: "env(safe-area-inset-top, 0px)",
              }}
            >
              <Link
                to="/foreman-ai"
                aria-label="Talk to revamo AI"
                className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95 transition-all"
              >
                <Phone className="h-4 w-4" />
              </Link>
              <NotificationCenter />
              <UserMenu />
            </header>

            <main className="flex-1 overflow-auto safe-area-px">
              <div className="mx-auto w-full max-w-7xl px-4 sm:px-5 md:px-6 pt-4 md:pt-6 pb-[calc(64px+env(safe-area-inset-bottom,0px))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-4 sm:space-y-6">
                {children}
              </div>
            </main>
          </div>
          <ActiveCallBar />
          <div className="hidden md:block">
            <FloatingTomButton />
          </div>
          <AgentTaskPanel />
          <TrialCountdownPopup />
          <CommandBar open={commandBar.open} onOpenChange={commandBar.setOpen} />
          <MobileTabBar />
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}