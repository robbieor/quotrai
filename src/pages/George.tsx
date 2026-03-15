import { useState, useCallback, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GeorgeChatArea } from "@/components/george/GeorgeChatArea";
import { GeorgeAgentInput } from "@/components/george/GeorgeAgentInput";
import { GeorgeMobileInput } from "@/components/george/GeorgeMobileInput";
import { GeorgeLoginDialog } from "@/components/george/GeorgeLoginDialog";
import { GeorgeSidebar } from "@/components/george/GeorgeSidebar";
import { GeorgeUsageWarning } from "@/components/george/GeorgeUsageWarning";
import { VoiceFallbackBanner } from "@/components/george/VoiceFallbackBanner";
import { PhotoQuoteCard } from "@/components/george/PhotoQuoteCard";
import { LiveActionFeed, type DisplayItem } from "@/components/george/action-mode/LiveActionFeed";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import { useAuth } from "@/hooks/useAuth";
import { useGeorgeMessages } from "@/hooks/useGeorge";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { Link } from "react-router-dom";
import type { PhotoQuoteSuggestion } from "@/components/george/PhotoQuoteButton";
import type { AIActionPlan, MemoryContext } from "@/types/foreman-actions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function George() {
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [photoQuoteSuggestion, setPhotoQuoteSuggestion] = useState<PhotoQuoteSuggestion | null>(null);
  const [memoryContext, setMemoryContext] = useState<MemoryContext>({});
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const { callWebhook, setContext, status } = useGlobalVoiceAgent();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const focusTextInput = useCallback(() => {
    textInputRef.current?.focus();
  }, []);

  const isCallActive = status === "connected";

  const { data: dbMessages = [] } = useGeorgeMessages(activeConversationId);

  // Load messages from database when conversation changes
  useEffect(() => {
    if (dbMessages.length > 0) {
      const msgs = dbMessages.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at),
      }));
      setMessages(msgs);
      // Convert existing messages to display items (no action plans for historical)
      setDisplayItems(msgs.map(m => ({ type: "message" as const, data: m })));
    } else if (!activeConversationId) {
      setMessages([]);
      setDisplayItems([]);
      setMemoryContext({});
    }
  }, [dbMessages, activeConversationId]);

  useEffect(() => {
    if (!isMobile) setSidebarOpen(true);
    else setSidebarOpen(false);
  }, [isMobile]);

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
    setDisplayItems(prev => [...prev, { type: "message", data: msg }]);
  }, []);

  const addActionPlan = useCallback((plan: AIActionPlan) => {
    setDisplayItems(prev => [...prev, { type: "action_plan", data: plan }]);
    // Update memory context from action plan
    if (plan.memory_context) {
      setMemoryContext(prev => ({ ...prev, ...plan.memory_context }));
    }
  }, []);

  // Listen for demo responses
  useEffect(() => {
    const handleDemoUserMessage = (e: CustomEvent<{ message: string }>) => {
      addMessage("user", e.detail.message);
    };
    const handleDemoResponse = (e: CustomEvent<{ message: string; conversationId?: string }>) => {
      addMessage("assistant", e.detail.message);
      if (e.detail.conversationId && !activeConversationId) {
        setActiveConversationId(e.detail.conversationId);
      }
      queryClient.invalidateQueries({ queryKey: ["george-conversations"] });
    };
    window.addEventListener("demo-user-message", handleDemoUserMessage as EventListener);
    window.addEventListener("demo-assistant-response", handleDemoResponse as EventListener);
    return () => {
      window.removeEventListener("demo-user-message", handleDemoUserMessage as EventListener);
      window.removeEventListener("demo-assistant-response", handleDemoResponse as EventListener);
    };
  }, [activeConversationId, queryClient, addMessage]);

  const handleUserMessage = useCallback((message: string) => {
    addMessage("user", message);
  }, [addMessage]);

  const handleAssistantMessage = useCallback((message: string, conversationId?: string) => {
    addMessage("assistant", message);
    if (conversationId && !activeConversationId) {
      setActiveConversationId(conversationId);
    }
    queryClient.invalidateQueries({ queryKey: ["george-conversations"] });
    if (conversationId || activeConversationId) {
      queryClient.invalidateQueries({ queryKey: ["george-messages", conversationId || activeConversationId] });
    }
  }, [addMessage, activeConversationId, queryClient]);

  /** Enhanced handler that processes structured action plans */
  const handleStructuredResponse = useCallback((responseData: any, conversationId?: string) => {
    if (responseData.action_plan) {
      addActionPlan(responseData.action_plan);
    }
    // The text message is still added separately via handleAssistantMessage
  }, [addActionPlan]);

  const handleQuickAction = useCallback(async (action: string, message: string) => {
    addMessage("user", message);
    setIsProcessing(true);

    try {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      const { data: userData } = await supabase.auth.getUser();
      setContext({ userId: userData.user?.id, teamId: teamId || undefined });
      const result = await callWebhook(action);
      addMessage("assistant", result);
    } catch (error) {
      console.error("Quick action error:", error);
      addMessage("assistant", "Sorry, something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [addMessage, callWebhook, setContext]);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setDisplayItems([]);
    setPhotoQuoteSuggestion(null);
    setMemoryContext({});
  }, []);

  const handleSelectConversation = useCallback((conversationId: string | null) => {
    setActiveConversationId(conversationId);
    setPhotoQuoteSuggestion(null);
    setMemoryContext({});
  }, []);

  const handlePhotoQuote = useCallback((suggestion: PhotoQuoteSuggestion) => {
    setPhotoQuoteSuggestion(suggestion);
    addMessage("assistant", `📸 I've analysed your photo and identified this as a **${suggestion.job_type}** job. Here's my suggested quote breakdown — review it and tap "Create Quote" to proceed.`);
  }, [addMessage]);

  const handleCreateQuoteFromPhoto = useCallback((suggestion: PhotoQuoteSuggestion) => {
    const params = new URLSearchParams({
      photo_quote: JSON.stringify({
        items: suggestion.line_items,
        notes: suggestion.notes,
        job_type: suggestion.job_type,
      }),
    });
    navigate(`/quotes?${params.toString()}`);
    setPhotoQuoteSuggestion(null);
  }, [navigate]);

  const handleConfirmation = useCallback((planId: string, action: "confirm" | "review" | "cancel") => {
    // Update the action plan status in display items
    setDisplayItems(prev =>
      prev.map(item => {
        if (item.type === "action_plan" && item.data.action_id === planId) {
          return {
            ...item,
            data: {
              ...item.data,
              status: action === "confirm" ? "completed" as const : action === "cancel" ? "failed" as const : item.data.status,
              confirmation_gate: undefined,
            },
          };
        }
        return item;
      })
    );

    if (action === "confirm") {
      addMessage("assistant", "✅ Action confirmed and completed.");
    } else if (action === "cancel") {
      addMessage("assistant", "❌ Action cancelled.");
    } else {
      addMessage("assistant", "Opening for review...");
    }
  }, [addMessage]);

  const handleOutputAction = useCallback((planId: string, action: string) => {
    if (action === "edit") {
      // Find the record and navigate
      const plan = displayItems.find(i => i.type === "action_plan" && i.data.action_id === planId);
      if (plan && plan.type === "action_plan") {
        const output = plan.data.output;
        if (output?.record_id) {
          if (output.type === "quote") navigate(`/quotes`);
          else if (output.type === "invoice") navigate(`/invoices`);
          else if (output.type === "job") navigate(`/jobs`);
        }
      }
    }
  }, [displayItems, navigate]);

  const showLoginDialog = !loading && !user;
  const hasDisplayItems = displayItems.length > 0;

  // Mobile layout
  if (isMobile) {
    return (
      <DashboardLayout>
        <div className="flex flex-col bg-background -m-3 h-[100dvh] max-h-[100dvh] overflow-hidden">
          <GeorgeSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            selectedConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            isMobile={true}
          />

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 pt-2">
              <GeorgeUsageWarning />
            </div>
            <VoiceFallbackBanner onFocusTextInput={focusTextInput} />

            {hasDisplayItems ? (
              <LiveActionFeed
                items={displayItems}
                isProcessing={isProcessing}
                onConfirmation={handleConfirmation}
                onOutputAction={handleOutputAction}
              />
            ) : (
              <GeorgeChatArea
                messages={messages}
                isProcessing={isProcessing}
                onQuickAction={handleQuickAction}
                onMenuClick={() => setSidebarOpen(true)}
              />
            )}

            {photoQuoteSuggestion && (
              <div className="px-4 pb-2">
                <PhotoQuoteCard
                  suggestion={photoQuoteSuggestion}
                  onCreateQuote={handleCreateQuoteFromPhoto}
                  onDismiss={() => setPhotoQuoteSuggestion(null)}
                />
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            <GeorgeMobileInput
              onUserMessage={handleUserMessage}
              onAssistantMessage={handleAssistantMessage}
              onStructuredResponse={handleStructuredResponse}
              onPhotoQuote={handlePhotoQuote}
              conversationId={activeConversationId}
              memoryContext={memoryContext}
            />
          </div>
        </div>
        <GeorgeLoginDialog open={showLoginDialog} />
      </DashboardLayout>
    );
  }

  // Desktop layout
  return (
    <DashboardLayout>
      <div className="flex bg-background overflow-hidden -m-6 -mt-[22px] h-[calc(100vh-3.5rem)]">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {sidebarOpen && (
            <>
              <ResizablePanel defaultSize={22} minSize={15} maxSize={40} className="min-w-[200px]">
                <GeorgeSidebar
                  isOpen={sidebarOpen}
                  onClose={() => setSidebarOpen(false)}
                  selectedConversationId={activeConversationId}
                  onSelectConversation={handleSelectConversation}
                  onNewChat={handleNewChat}
                  isMobile={false}
                />
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-colors" />
            </>
          )}

          <ResizablePanel defaultSize={sidebarOpen ? 78 : 100} minSize={50}>
            <div className="flex flex-col h-full">
              <div className="px-4 pt-2 flex items-center justify-between">
                <GeorgeUsageWarning />
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                  <Link to="/ai-audit">
                    <History className="h-4 w-4 mr-1.5" />
                    Activity
                  </Link>
                </Button>
              </div>
              <VoiceFallbackBanner onFocusTextInput={focusTextInput} />

              {hasDisplayItems ? (
                <LiveActionFeed
                  items={displayItems}
                  isProcessing={isProcessing}
                  onConfirmation={handleConfirmation}
                  onOutputAction={handleOutputAction}
                />
              ) : (
                <GeorgeChatArea
                  messages={messages}
                  isProcessing={isProcessing}
                  onQuickAction={handleQuickAction}
                  onMenuClick={() => setSidebarOpen(true)}
                />
              )}

              {photoQuoteSuggestion && (
                <div className="px-4 pb-2 max-w-3xl mx-auto w-full">
                  <PhotoQuoteCard
                    suggestion={photoQuoteSuggestion}
                    onCreateQuote={handleCreateQuoteFromPhoto}
                    onDismiss={() => setPhotoQuoteSuggestion(null)}
                  />
                </div>
              )}

              <GeorgeAgentInput
                onUserMessage={handleUserMessage}
                onAssistantMessage={handleAssistantMessage}
                onStructuredResponse={handleStructuredResponse}
                onPhotoQuote={handlePhotoQuote}
                conversationId={activeConversationId}
                textareaRef={textInputRef}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <GeorgeLoginDialog open={showLoginDialog} />
    </DashboardLayout>
  );
}
