import { Calendar, FileText, Receipt, Send } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import tomAvatar from "@/assets/tom-avatar.png";

interface GeorgeWelcomeProps {
  onQuickAction?: (action: string | null, message: string) => void;
  isProcessing?: boolean;
}

export function GeorgeWelcome({ onQuickAction, isProcessing }: GeorgeWelcomeProps) {
  const { profile } = useProfile();
  const isMobile = useIsMobile();
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  // Mobile: Centered welcome with quick actions
  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center min-h-full px-5 py-8 bg-background">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center mb-4 border border-border overflow-hidden">
            <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
          </div>

          <h2 className="text-lg font-semibold mb-1">Foreman AI</h2>

          {/* Welcome text */}
          <p className="text-center text-muted-foreground text-sm leading-relaxed max-w-xs mb-6">
            Hey {firstName}, what would you like to do?
          </p>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={() => onQuickAction?.(qa.action, qa.message)}
                disabled={isProcessing}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.97] transition-all border border-transparent hover:border-border"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <qa.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-center leading-tight">
                  {qa.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Desktop: Original design with quick actions
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 overflow-y-auto">
      {/* Avatar and Title */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 overflow-hidden shadow-md">
          <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-xl font-semibold mb-1">Foreman AI</h1>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          Your AI Assistant
        </span>
      </div>

      {/* Welcome Message */}
      <p className="text-center text-muted-foreground mb-8 max-w-sm">
        Hey {firstName}, I'm here to help. What would you like to do?
      </p>

      {/* Quick Actions Grid - Desktop only */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            onClick={() => onQuickAction?.(qa.action, qa.message)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all border border-transparent hover:border-border"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <qa.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-center leading-tight">
              {qa.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Quick actions for desktop only
const quickActions = [
  {
    icon: Calendar,
    label: "Today's jobs",
    message: "What jobs do I have scheduled for today?",
    action: "get_todays_jobs",
  },
  {
    icon: FileText,
    label: "Create quote",
    message: "Help me create a new quote",
    action: null,
  },
  {
    icon: Receipt,
    label: "Log expense",
    message: "I need to log an expense",
    action: null,
  },
  {
    icon: Send,
    label: "Overdue invoices",
    message: "Which invoices are overdue?",
    action: "get_overdue_invoices",
  },
];
