import { useState, useCallback, useEffect, useRef } from "react";
import { VoiceDebugPanel } from "@/components/george/VoiceDebugPanel";
import { VoiceDiagnosticStrip } from "@/components/george/VoiceDiagnosticStrip";
import { useAgentTask } from "@/contexts/AgentTaskContext";
import { QUOTE_CREATION_STEPS, INVOICE_CREATION_STEPS } from "@/components/shared/AgentWorkingPanel";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GeorgeChatArea } from "@/components/george/GeorgeChatArea";
import { GeorgeAgentInput } from "@/components/george/GeorgeAgentInput";
import { GeorgeMobileInput } from "@/components/george/GeorgeMobileInput";
import { GeorgeMobileHeader } from "@/components/george/GeorgeMobileHeader";
import { GeorgeLoginDialog } from "@/components/george/GeorgeLoginDialog";
import { GeorgeSidebar } from "@/components/george/GeorgeSidebar";
import { GeorgeUsageWarning } from "@/components/george/GeorgeUsageWarning";
import { VoiceFallbackBanner } from "@/components/george/VoiceFallbackBanner";
import { ContextIndicator } from "@/components/george/ContextIndicator";
import { PhotoQuoteCard } from "@/components/george/PhotoQuoteCard";
import { LiveActionFeed, type DisplayItem } from "@/components/george/action-mode/LiveActionFeed";
import { MemoryContextPanel } from "@/components/george/action-mode/MemoryContextPanel";
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import { useAuth } from "@/hooks/useAuth";
import { useGeorgeMessages } from "@/hooks/useGeorge";
import { useForemanMemory } from "@/hooks/useForemanMemory";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceTopupVerification } from "@/hooks/useVoiceTopupVerification";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { Link } from "react-router-dom";
import type { PhotoQuoteSuggestion } from "@/components/george/PhotoQuoteButton";
import type { AIActionPlan } from "@/types/foreman-actions";

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
  const [streamingText, setStreamingText] = useState("");
  const [lastChatError, setLastChatError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [photoQuoteSuggestion, setPhotoQuoteSuggestion] = useState<PhotoQuoteSuggestion | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const { callWebhook, setContext, status } = useGlobalVoiceAgent();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Verify voice top-up payment on redirect from Stripe
  useVoiceTopupVerification();

  // Foreman AI memory system
  const {
    taskContext,
    sessionEntities,
    hasActiveContext,
    updateFromActionPlan,
    buildMemoryPayload,
    clearContext,
  } = useForemanMemory();

  const focusTextInput = useCallback(() => {
    textInputRef.current?.focus();
  }, []);

  const isCallActive = status === "connected";

  const { data: dbMessages = [] } = useGeorgeMessages(activeConversationId);

  // Track whether user explicitly selected a conversation from sidebar
  const [hydrateFromDb, setHydrateFromDb] = useState(false);

  // Auto-load most recent conversation on first mount (persistent chat feel)
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  useEffect(() => {
    if (initialLoadDone || activeConversationId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("george_conversations")
          .select("id")
          .order("updated_at", { ascending: false })
          .limit(1);
        if (data?.length) {
          setActiveConversationId(data[0].id);
          setHydrateFromDb(true);
        }
      } catch { /* ignore */ }
      setInitialLoadDone(true);
    })();
  }, [initialLoadDone, activeConversationId]);

  // Load messages from database when hydrating (sidebar pick or auto-load)
  useEffect(() => {
    if (!hydrateFromDb) return;
    if (dbMessages.length > 0) {
      const msgs = dbMessages.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at),
      }));
      setMessages(msgs);
      setDisplayItems(msgs.map(m => ({ type: "message" as const, data: m })));
      setHydrateFromDb(false);
    }
  }, [dbMessages, hydrateFromDb]);

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
    updateFromActionPlan(plan.memory_context);
  }, [updateFromActionPlan]);

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
    setStreamingText("");
    setLastChatError(null);
  }, [addMessage]);

  const handleAssistantMessage = useCallback((message: string, conversationId?: string) => {
    setStreamingText("");
    // Detect error messages from chat hook and surface as lastChatError
    if (message.startsWith("❌") || message.startsWith("⏳") || message.startsWith("💳")) {
      setLastChatError(message);
    } else {
      setLastChatError(null);
    }
    addMessage("assistant", message);
    if (conversationId && !activeConversationId) {
      setActiveConversationId(conversationId);
    }
    queryClient.invalidateQueries({ queryKey: ["george-conversations"] });
    if (conversationId || activeConversationId) {
      queryClient.invalidateQueries({ queryKey: ["george-messages", conversationId || activeConversationId] });
    }
  }, [addMessage, activeConversationId, queryClient]);

  const handleStreamingUpdate = useCallback((text: string) => {
    setStreamingText(text);
  }, []);

  const { startTask: globalStartTask, completeTask: globalCompleteTask } = useAgentTask();

  /** Enhanced handler that processes structured action plans */
  const handleStructuredResponse = useCallback((responseData: any, conversationId?: string) => {
    // Persist conversation ID so state doesn't get wiped
    if (conversationId && !activeConversationId) {
      setActiveConversationId(conversationId);
    }

    // If action_plan is null/undefined, the backend signalled a pure chat response — skip action plan rendering
    if (responseData.action_plan) {
      addActionPlan(responseData.action_plan);

      // Start global task for cross-page visibility
      const plan = responseData.action_plan;
      const intent = plan.intent || "";
      if (intent.includes("quote")) {
        globalStartTask("create_quote", "Creating quote…", QUOTE_CREATION_STEPS);
      } else if (intent.includes("invoice")) {
        globalStartTask("create_invoice", "Creating invoice…", INVOICE_CREATION_STEPS);
      }
    }
    // Invalidate data caches so new records appear on other pages
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  }, [addActionPlan, queryClient, globalStartTask, activeConversationId]);

  const handleQuickAction = useCallback(async (action: string | null, message: string) => {
    // Always route through george-chat text endpoint — voice webhook is unreliable
    // when voice call isn't active. The george-chat edge function handles all intents.
    window.dispatchEvent(new CustomEvent("foremanai-quick-action", {
      detail: { message, autoSend: true },
    }));
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setDisplayItems([]);
    setPhotoQuoteSuggestion(null);
    setHydrateFromDb(false);
    clearContext("all");
  }, [clearContext]);

  const handleSelectConversation = useCallback((conversationId: string | null) => {
    setActiveConversationId(conversationId);
    setPhotoQuoteSuggestion(null);
    clearContext("all");
    if (conversationId) {
      setHydrateFromDb(true); // trigger DB hydration for sidebar-selected conversations
    } else {
      setMessages([]);
      setDisplayItems([]);
    }
  }, [clearContext]);

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

  // Route map for inline navigation after confirmation
  const routeMap: Record<string, string> = {
    create_quote: "/quotes",
    create_invoice: "/invoices",
    create_invoice_from_template: "/invoices",
    use_template_for_quote: "/quotes",
    create_job: "/jobs",
    log_expense: "/expenses",
  };

  const handleConfirmation = useCallback(async (planId: string, action: "confirm" | "review" | "cancel") => {
    const plan = displayItems.find(i => i.type === "action_plan" && i.data.action_id === planId);
    
    if (action === "confirm" && plan?.type === "action_plan" && plan.data.pending_tool_calls?.length) {
      // Execute deferred tool calls
      setIsProcessing(true);
      try {
        for (const tc of plan.data.pending_tool_calls) {
          await supabase.functions.invoke("george-webhook", {
            body: { function_name: tc.function_name, parameters: tc.parameters },
          });
        }
        // Invalidate caches after executing
        queryClient.invalidateQueries({ queryKey: ["quotes"] });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      } catch (err) {
        console.error("Failed to execute confirmed action:", err);
        addMessage("assistant", "❌ Something went wrong executing the action. Please try again.");
        setIsProcessing(false);
        return;
      }
      setIsProcessing(false);
    }

    // Determine the navigation target for inline link
    const firstTool = plan?.type === "action_plan" ? plan.data.pending_tool_calls?.[0]?.function_name : null;
    const targetRoute = firstTool ? routeMap[firstTool] : null;

    setDisplayItems(prev =>
      prev.map(item => {
        if (item.type === "action_plan" && item.data.action_id === planId) {
          const updatedOutput = item.data.output ? {
            ...item.data.output,
            // Add inline navigation action after confirmation
            quick_actions: action === "confirm" && targetRoute
              ? [
                  { label: `View ${item.data.intent_label || "Record"}`, action: `navigate:${targetRoute}`, variant: "default" as const },
                  { label: "Edit", action: "edit", variant: "outline" as const },
                ]
              : item.data.output.quick_actions,
          } : item.data.output;

          return {
            ...item,
            data: {
              ...item.data,
              status: action === "confirm" ? "completed" as const : action === "cancel" ? "failed" as const : item.data.status,
              confirmation_gate: undefined,
              pending_tool_calls: undefined,
              output: updatedOutput,
            },
          };
        }
        return item;
      })
    );

    if (action === "confirm") {
      addMessage("assistant", "✅ Done! Your record has been created.");
      globalCompleteTask("Record created successfully");
    } else if (action === "cancel") {
      addMessage("assistant", "❌ Action cancelled. No records were created.");
    } else {
      addMessage("assistant", "Opening for review...");
    }
  }, [addMessage, displayItems, queryClient, globalCompleteTask]);

  const handleOutputAction = useCallback((planId: string, action: string) => {
    // Handle inline navigation links (navigate:/quotes etc.)
    if (action.startsWith("navigate:")) {
      navigate(action.replace("navigate:", ""));
      return;
    }
    if (action === "edit") {
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

  // Build memory payload for inputs
  const memoryPayload = buildMemoryPayload();

  // Memory context panel (shared between mobile and desktop)
  const memoryPanel = (
    <MemoryContextPanel
      taskContext={taskContext}
      sessionEntities={sessionEntities}
      hasActiveContext={hasActiveContext}
      onClear={clearContext}
    />
  );

  // Mobile layout — full-screen, no DashboardLayout (avoids double header)
  if (isMobile) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col bg-background h-[100dvh] max-h-[100dvh] overflow-hidden">
          <GeorgeSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            selectedConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            isMobile={true}
          />

          <GeorgeMobileHeader onMenuClick={() => setSidebarOpen(true)} />

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ContextIndicator />
            <GeorgeUsageWarning />
            <VoiceFallbackBanner onFocusTextInput={focusTextInput} />
            <VoiceDiagnosticStrip />

            {memoryPanel}

            {hasDisplayItems ? (
              <LiveActionFeed
                items={displayItems}
                isProcessing={isProcessing}
                lastError={lastChatError}
                onConfirmation={handleConfirmation}
                onOutputAction={handleOutputAction}
              />
            ) : (
              <GeorgeChatArea
                messages={messages}
                isProcessing={isProcessing}
                streamingText={streamingText}
                lastError={lastChatError}
                onQuickAction={handleQuickAction}
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
              onStreamingUpdate={handleStreamingUpdate}
              conversationId={activeConversationId}
              memoryContext={memoryPayload}
            />
          </div>
        </div>
        <GeorgeLoginDialog open={showLoginDialog} />
      </ProtectedRoute>
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
              <ContextIndicator />
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
              <VoiceDiagnosticStrip />

              {memoryPanel}

              {hasDisplayItems ? (
                <LiveActionFeed
                  items={displayItems}
                  isProcessing={isProcessing}
                  lastError={lastChatError}
                  onConfirmation={handleConfirmation}
                  onOutputAction={handleOutputAction}
                />
              ) : (
                <GeorgeChatArea
                  messages={messages}
                  isProcessing={isProcessing}
                  streamingText={streamingText}
                  lastError={lastChatError}
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
                onStreamingUpdate={handleStreamingUpdate}
                conversationId={activeConversationId}
                textareaRef={textInputRef}
                memoryContext={memoryPayload}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <GeorgeLoginDialog open={showLoginDialog} />
      <VoiceDebugPanel />
    </DashboardLayout>
  );
}
