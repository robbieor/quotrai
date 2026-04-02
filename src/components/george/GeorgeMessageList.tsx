import { useEffect, useRef } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { ForemanAvatar } from "@/components/shared/ForemanAvatar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface QuickActionChip {
  label: string;
  message: string;
}

interface GeorgeMessageListProps {
  messages: Message[];
  isProcessing?: boolean;
  streamingText?: string;
  lastError?: string | null;
  onRetry?: () => void;
  onQuickAction?: (message: string) => void;
}

function MarkdownContent({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="mb-1.5 last:mb-0 pl-4 list-disc space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-1.5 last:mb-0 pl-4 list-decimal space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          h1: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
          h2: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
          h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/30 pl-3 italic text-muted-foreground">{children}</blockquote>,
          code: ({ children, className: codeClassName }) => {
            const isInline = !codeClassName;
            if (isInline) return <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>;
            return <pre className="bg-muted rounded-lg p-3 overflow-x-auto"><code className="text-xs font-mono">{children}</code></pre>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Detect contextual quick actions from message content
function getQuickActions(content: string): QuickActionChip[] {
  const chips: QuickActionChip[] = [];
  const lower = content.toLowerCase();
  if (lower.includes("overdue") || lower.includes("unpaid") || lower.includes("outstanding")) {
    chips.push({ label: "Send Reminders", message: "Send payment reminders for all overdue invoices" });
    chips.push({ label: "View Invoices", message: "Show me the overdue invoices" });
  }
  if (lower.includes("quote") && (lower.includes("draft") || lower.includes("created") || lower.includes("ready"))) {
    chips.push({ label: "Send Quote", message: "Send the quote to the customer" });
  }
  if (lower.includes("job") && (lower.includes("today") || lower.includes("scheduled"))) {
    chips.push({ label: "View Calendar", message: "Show me my calendar for today" });
  }
  if (lower.includes("invoice") && lower.includes("created")) {
    chips.push({ label: "View Invoice", message: "Show me the invoice" });
  }
  return chips.slice(0, 3);
}

export function GeorgeMessageList({ messages, isProcessing, streamingText, lastError, onRetry, onQuickAction }: GeorgeMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing, streamingText]);
  const lastAssistantIdx = [...messages].reverse().findIndex(m => m.role === "assistant");
  const lastAssistantId = lastAssistantIdx >= 0 ? messages[messages.length - 1 - lastAssistantIdx]?.id : null;

  // Mobile: Clean ChatGPT-style messages
  if (isMobile) {
    return (
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-6">
          {messages.map((message) => (
            <div key={message.id}>
              <MobileMessageBubble message={message} />
              {message.id === lastAssistantId && !isProcessing && !streamingText && (
                <QuickActionChips content={message.content} onAction={onQuickAction} />
              )}
            </div>
          ))}

          {/* Streaming text — progressive render */}
          {streamingText && !isProcessing && (
            <div className="flex items-start gap-3">
              <ForemanAvatar size="md" className="bg-white border border-border shadow-sm" />
              <div className="flex-1 pt-1">
                <MarkdownContent content={streamingText} className="text-foreground" />
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-start gap-3">
              <ForemanAvatar size="md" className="bg-white border border-border shadow-sm" />
              <div className="flex items-center gap-2 pt-2">
                <span className="text-sm text-muted-foreground">George is thinking</span>
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}

          {/* Inline error with retry */}
          {lastError && !isProcessing && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
                <span className="text-destructive text-xs font-bold">!</span>
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm text-destructive">{lastError}</p>
                {onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 h-7 text-xs">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>
    );
  }

  // Desktop: Bubble style with timestamps
  return (
    <ScrollArea className="flex-1">
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            <DesktopMessageBubble message={message} />
            {message.id === lastAssistantId && !isProcessing && !streamingText && (
              <QuickActionChips content={message.content} onAction={onQuickAction} />
            )}
          </div>
        ))}

        {/* Streaming text — progressive render */}
        {streamingText && !isProcessing && (
          <div className="flex gap-3">
            <ForemanAvatar size="md" />
            <div className="bg-muted/50 border border-border rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
              <MarkdownContent content={streamingText} className="text-foreground" />
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex gap-3">
            <ForemanAvatar size="md" />
            <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">George is thinking</span>
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Inline error with retry */}
        {lastError && !isProcessing && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <span className="text-destructive text-xs font-bold">!</span>
            </div>
            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl rounded-tl-md px-4 py-3">
              <p className="text-sm text-destructive">{lastError}</p>
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 h-7 text-xs">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}

// Mobile: ChatGPT-style message layout
function MobileMessageBubble({ message }: { message: Message }) {
  const isAssistant = message.role === "assistant";

  if (isAssistant) {
    return (
      <div className="flex items-start gap-3">
        <ForemanAvatar size="md" className="bg-white border border-border shadow-sm" />
        <div className="flex-1 pt-1">
          <div className="bg-muted/50 border border-border rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
            <MarkdownContent content={message.content} className="text-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="bg-primary text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
        <p className="text-sm whitespace-pre-wrap leading-relaxed text-white">{message.content}</p>
      </div>
    </div>
  );
}

// Desktop: Bubble style with timestamps
function DesktopMessageBubble({ message }: { message: Message }) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={cn("flex gap-3", isAssistant ? "justify-start" : "justify-end")}>
      {isAssistant && (
        <ForemanAvatar size="md" />
      )}

      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5",
          isAssistant
            ? "bg-muted/50 border border-border text-foreground rounded-tl-md"
            : "bg-primary text-white rounded-tr-md"
        )}
      >
        {isAssistant ? (
          <MarkdownContent content={message.content} className="text-foreground" />
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-white">{message.content}</p>
        )}
        <p
          className={cn(
            "text-[10px] mt-1 opacity-70",
            isAssistant ? "text-muted-foreground" : "text-white/70"
          )}
        >
          {format(message.timestamp, "h:mm a")}
        </p>
      </div>
    </div>
  );
}
