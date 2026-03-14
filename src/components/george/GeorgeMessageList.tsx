import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import tomAvatar from "@/assets/tom-avatar.png";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface GeorgeMessageListProps {
  messages: Message[];
  isProcessing?: boolean;
}

export function GeorgeMessageList({ messages, isProcessing }: GeorgeMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing]);

  // Mobile: Clean ChatGPT-style messages
  if (isMobile) {
    return (
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-6">
          {messages.map((message) => (
            <MobileMessageBubble key={message.id} message={message} />
          ))}

          {isProcessing && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white border border-border shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>
    );
  }

  // Desktop: Original bubble style
  return (
    <ScrollArea className="flex-1">
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <DesktopMessageBubble key={message.id} message={message} />
        ))}

        {isProcessing && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
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
        <div className="w-8 h-8 rounded-full bg-white border border-border shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
          <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 pt-1">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-2.5 max-w-[85%] shadow-sm">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
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
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
          <img src={tomAvatar} alt="Foreman AI" className="w-full h-full object-cover" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5",
          isAssistant
            ? "bg-muted text-foreground rounded-tl-md"
            : "bg-primary text-primary-foreground rounded-tr-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        <p
          className={cn(
            "text-[10px] mt-1 opacity-70",
            isAssistant ? "text-muted-foreground" : "text-primary-foreground"
          )}
        >
          {format(message.timestamp, "h:mm a")}
        </p>
      </div>
    </div>
  );
}
