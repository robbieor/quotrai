import { GeorgeWelcome } from "./GeorgeWelcome";
import { GeorgeMessageList } from "./GeorgeMessageList";
import { GeorgeMobileHeader } from "./GeorgeMobileHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface GeorgeChatAreaProps {
  messages: Message[];
  isProcessing?: boolean;
  streamingText?: string;
  lastError?: string | null;
  onRetry?: () => void;
  onQuickAction?: (action: string, message: string) => void;
  onMenuClick?: () => void;
}

export function GeorgeChatArea({ 
  messages, 
  isProcessing, 
  streamingText,
  lastError,
  onRetry,
  onQuickAction,
  onMenuClick
}: GeorgeChatAreaProps) {
  const isMobile = useIsMobile();

  const handleQuickAction = (action: string | null, message: string) => {
    if (onQuickAction && action) {
      onQuickAction(action, message);
    } else {
      window.dispatchEvent(
        new CustomEvent("foremanai-quick-action", {
          detail: { message, action },
        })
      );
    }
  };

  const handleChipAction = (message: string) => {
    window.dispatchEvent(
      new CustomEvent("foremanai-quick-action", {
        detail: { message, autoSend: true },
      })
    );
  };

  // Mobile layout — header is now rendered by George.tsx, not here
  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {messages.length === 0 ? (
          <GeorgeWelcome onQuickAction={handleQuickAction} isProcessing={isProcessing} />
        ) : (
          <GeorgeMessageList
            messages={messages}
            isProcessing={isProcessing}
            streamingText={streamingText}
            lastError={lastError}
            onRetry={onRetry}
            onQuickAction={handleChipAction}
          />
        )}
      </div>
    );
  }

  // Desktop layout
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <GeorgeWelcome onQuickAction={handleQuickAction} isProcessing={isProcessing} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <span className="font-medium">revamo AI</span>
        <Badge variant="secondary" className="text-xs">
          AI Operating System
        </Badge>
      </div>

      <GeorgeMessageList
        messages={messages}
        isProcessing={isProcessing}
        streamingText={streamingText}
        lastError={lastError}
        onRetry={onRetry}
        onQuickAction={handleChipAction}
      />
    </div>
  );
}