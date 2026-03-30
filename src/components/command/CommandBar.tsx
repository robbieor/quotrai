import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Search, FileText, Receipt, Briefcase, DollarSign, Users, CalendarDays, Clock, Settings, Bot, BarChart3, Package, UserPlus, FolderOpen, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSlashCommand, getSlashHints, SLASH_COMMANDS } from "@/utils/slashCommandParser";

const NAV_ITEMS = [
  { label: "Operations", url: "/dashboard", icon: BarChart3, keywords: ["dashboard", "home", "overview"] },
  { label: "Job Intelligence", url: "/jobs", icon: Briefcase, keywords: ["jobs", "work", "schedule"] },
  { label: "Calendar", url: "/calendar", icon: CalendarDays, keywords: ["calendar", "schedule", "dates"] },
  { label: "Quote Pipeline", url: "/quotes", icon: FileText, keywords: ["quotes", "estimates", "pricing"] },
  { label: "Revenue", url: "/invoices", icon: Receipt, keywords: ["invoices", "revenue", "billing", "payments"] },
  { label: "Cost Control", url: "/expenses", icon: DollarSign, keywords: ["expenses", "costs", "spending"] },
  { label: "Client Intelligence", url: "/customers", icon: Users, keywords: ["customers", "clients", "contacts"] },
  { label: "Workforce", url: "/time-tracking", icon: Clock, keywords: ["time", "tracking", "workforce", "clock"] },
  { label: "Foreman AI", url: "/foreman-ai", icon: Bot, keywords: ["ai", "foreman", "george", "assistant"] },
  { label: "Templates", url: "/templates", icon: FolderOpen, keywords: ["templates"] },
  { label: "Price Book", url: "/price-book", icon: Package, keywords: ["price", "book", "rates"] },
  { label: "Enquiries", url: "/leads", icon: UserPlus, keywords: ["leads", "enquiries"] },
  { label: "Settings", url: "/settings", icon: Settings, keywords: ["settings", "profile", "account"] },
];

const QUICK_ACTIONS = [
  { label: "Create a new quote", action: "create_quote", icon: FileText, message: "Help me create a new quote" },
  { label: "Create a new invoice", action: "create_invoice", icon: Receipt, message: "Help me create a new invoice" },
  { label: "Schedule a new job", action: "create_job", icon: Briefcase, message: "Help me schedule a new job" },
  { label: "Log an expense", action: "log_expense", icon: DollarSign, message: "I need to log an expense" },
  { label: "What jobs do I have today?", action: "todays_jobs", icon: CalendarDays, message: "What jobs do I have scheduled for today?" },
  { label: "Show overdue invoices", action: "overdue", icon: Receipt, message: "Which invoices are overdue?" },
];

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandBar({ open, onOpenChange }: CommandBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSelect = useCallback((callback: () => void) => {
    onOpenChange(false);
    setQuery("");
    callback();
  }, [onOpenChange]);

  const handleNavigate = useCallback((url: string) => {
    handleSelect(() => navigate(url));
  }, [handleSelect, navigate]);

  const handleAIAction = useCallback((message: string) => {
    handleSelect(() => {
      navigate("/foreman-ai");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("foremanai-quick-action", {
          detail: { message, autoSend: true },
        }));
      }, 500);
    });
  }, [handleSelect, navigate]);

  const handleFreeformAI = useCallback(() => {
    if (!query.trim()) return;
    handleAIAction(query.trim());
  }, [query, handleAIAction]);

  // Reset query on close
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command shouldFilter={true} className="rounded-lg border-none">
        <CommandInput
          placeholder="Type a command, search, or ask Foreman AI..."
          value={query}
          onValueChange={setQuery}
          className="text-base"
        />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty className="py-6 text-center">
            <button
              onClick={handleFreeformAI}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Bot className="h-4 w-4" />
              Ask Foreman AI: "{query}"
            </button>
          </CommandEmpty>

          {/* AI-powered quick action when query looks like a command */}
          {query.trim().length > 3 && !isSlashCommand(query) && (
            <CommandGroup heading="Ask Foreman AI">
              <CommandItem onSelect={handleFreeformAI} className="gap-3">
                <Zap className="h-4 w-4 text-primary" />
                <span>Ask: "{query}"</span>
              </CommandItem>
            </CommandGroup>
          )}

          {/* Slash command hints */}
          {isSlashCommand(query) && getSlashHints(query).length > 0 && (
            <CommandGroup heading="Slash Commands">
              {getSlashHints(query).map((hint) => (
                <CommandItem
                  key={hint.command}
                  value={hint.command}
                  onSelect={() => setQuery(hint.command + " ")}
                  className="gap-3"
                >
                  <Zap className="h-4 w-4 text-primary" />
                  <div>
                    <span className="font-medium">{hint.command}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{hint.example}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Quick Actions">
            {QUICK_ACTIONS.map((action) => (
              <CommandItem
                key={action.action}
                value={action.label}
                onSelect={() => handleAIAction(action.message)}
                className="gap-3"
              >
                <action.icon className="h-4 w-4 text-muted-foreground" />
                <span>{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Navigate">
            {NAV_ITEMS.map((item) => (
              <CommandItem
                key={item.url}
                value={`${item.label} ${item.keywords.join(" ")}`}
                onSelect={() => handleNavigate(item.url)}
                className="gap-3"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>

        <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground flex items-center justify-between">
          <span>↑↓ Navigate · ↵ Select · Esc Close</span>
          <span className="hidden sm:inline">Type naturally to ask Foreman AI</span>
        </div>
      </Command>
    </CommandDialog>
  );
}

export function useCommandBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return { open, setOpen };
}
