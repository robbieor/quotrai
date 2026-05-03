import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActionCommandHeader } from "./ActionCommandHeader";
import { ActionUnderstandingPanel } from "./ActionUnderstandingPanel";
import { ActionTimeline } from "./ActionTimeline";
import { ActionOutputPreview } from "./ActionOutputPreview";
import { ActionConfirmationGate } from "./ActionConfirmationGate";
import { ActionMemoryBar } from "./ActionMemoryBar";
import type { AIActionPlan } from "@/types/foreman-actions";
import { Loader2 } from "lucide-react";
import { ForemanAvatar } from "@/components/shared/ForemanAvatar";

interface ActionPlanCardProps {
  plan: AIActionPlan;
  onConfirmation?: (planId: string, action: "confirm" | "review" | "cancel") => void;
  onOutputAction?: (planId: string, action: string) => void;
}

function ActionPlanCard({ plan, onConfirmation, onOutputAction }: ActionPlanCardProps) {
  const showTimeline = plan.steps.length > 0 && plan.status !== "listening";
  const showUnderstanding = plan.entities.length > 0;
  const showOutput = plan.output && (plan.status === "completed" || plan.status === "needs_confirmation");
  const showConfirmation = plan.confirmation_gate && plan.status === "needs_confirmation";
  const showMemory = plan.memory_context && (
    plan.memory_context.current_customer || 
    plan.memory_context.current_job ||
    plan.memory_context.current_quote ||
    plan.memory_context.current_invoice
  );
  // Show text_response as a fallback when action completed but no output card
  const showTextFallback = !showOutput && !showConfirmation && plan.status === "completed" && plan.text_response;

  return (
    <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <ActionCommandHeader
        commandText={plan.command_text}
        inputSource={plan.input_source}
        status={plan.status}
        timestamp={plan.timestamp}
      />
      {showUnderstanding && (
        <ActionUnderstandingPanel intentLabel={plan.intent_label} entities={plan.entities} />
      )}
      {showTimeline && <ActionTimeline steps={plan.steps} />}
      {showConfirmation && plan.confirmation_gate && (
        <ActionConfirmationGate
          gate={plan.confirmation_gate}
          onAction={(action) => onConfirmation?.(plan.action_id, action)}
        />
      )}
      {showOutput && plan.output && (
        <ActionOutputPreview
          output={plan.output}
          onAction={(action) => onOutputAction?.(plan.action_id, action)}
        />
      )}
      {showTextFallback && (
        <div className="flex gap-3">
          <ForemanAvatar size="md" />
          <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{plan.text_response}</p>
          </div>
        </div>
      )}
      {showMemory && plan.memory_context && <ActionMemoryBar memory={plan.memory_context} />}
    </div>
  );
}

/** A text-only message (for non-action AI responses) */
interface TextMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/** Union of display items in the chat */
export type DisplayItem =
  | { type: "message"; data: TextMessage }
  | { type: "action_plan"; data: AIActionPlan };

interface LiveActionFeedProps {
  items: DisplayItem[];
  isProcessing?: boolean;
  lastError?: string | null;
  onConfirmation?: (planId: string, action: "confirm" | "review" | "cancel") => void;
  onOutputAction?: (planId: string, action: string) => void;
  onRetry?: () => void;
}

export function LiveActionFeed({ items, isProcessing, lastError, onConfirmation, onOutputAction, onRetry }: LiveActionFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items, isProcessing]);

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {items.map((item) => {
          if (item.type === "action_plan") {
            return (
              <ActionPlanCard
                key={item.data.action_id}
                plan={item.data}
                onConfirmation={onConfirmation}
                onOutputAction={onOutputAction}
              />
            );
          }

          const msg = item.data;
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[85%] shadow-sm">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex gap-3">
              <ForemanAvatar size="md" />
              <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex gap-3">
            <ForemanAvatar size="md" />
            <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">revamo AI is working...</span>
              </div>
            </div>
          </div>
        )}

        {lastError && !isProcessing && (
          <div className="flex gap-3">
            <ForemanAvatar size="md" />
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl rounded-tl-md px-4 py-3">
              <p className="text-sm text-destructive font-medium">{lastError}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-xs text-primary font-medium mt-1 hover:underline"
                >
                  Tap to retry
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
