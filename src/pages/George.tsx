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
import { useGlobalVoiceAgent } from "@/contexts/VoiceAgentContext";
import { useAuth } from "@/hooks/useAuth";
import { useGeorgeMessages } from "@/hooks/useGeorge";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import type { PhotoQuoteSuggestion } from "@/components/george/PhotoQuoteButton";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function George() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [photoQuoteSuggestion, setPhotoQuoteSuggestion] = useState<PhotoQuoteSuggestion | null>(null);
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

  // Fetch messages for active conversation
  const { data: dbMessages = [] } = useGeorgeMessages(activeConversationId);

  // Load messages from database when conversation changes
  useEffect(() => {
    if (dbMessages.length > 0) {
      setMessages(dbMessages.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at),
      })));
    } else if (!activeConversationId) {
      setMessages([]);
    }
  }, [dbMessages, activeConversationId]);

  // Open sidebar by default on desktop only
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role,
        content,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Listen for demo responses
  useEffect(() => {
    const handleDemoUserMessage = (e: CustomEvent<{ message: string }>) => {
      addMessage("user", e.detail.message);
    };

    const handleDemoResponse = (e: CustomEvent<{ message: string; conversationId?: string }>) => {
      const { message, conversationId } = e.detail;
      addMessage("assistant", message);
      
      if (conversationId && !activeConversationId) {
        setActiveConversationId(conversationId);
      }
      
      queryClient.invalidateQueries({ queryKey: ["george-conversations"] });
      if (conversationId || activeConversationId) {
        queryClient.invalidateQueries({ queryKey: ["george-messages", conversationId || activeConversationId] });
      }
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

  const handleQuickAction = useCallback(async (action: string, message: string) => {
    addMessage("user", message);
    setIsProcessing(true);
    
    try {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      const { data: userData } = await supabase.auth.getUser();
      
      setContext({
        userId: userData.user?.id,
        teamId: teamId || undefined,
      });
      
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
    setPhotoQuoteSuggestion(null);
  }, []);

  const handleSelectConversation = useCallback((conversationId: string | null) => {
    setActiveConversationId(conversationId);
    setPhotoQuoteSuggestion(null);
  }, []);

  const handlePhotoQuote = useCallback((suggestion: PhotoQuoteSuggestion) => {
    setPhotoQuoteSuggestion(suggestion);
    addMessage("assistant", `📸 I've analysed your photo and identified this as a **${suggestion.job_type}** job. Here's my suggested quote breakdown — review it and tap "Create Quote" to proceed.`);
  }, [addMessage]);

  const handleCreateQuoteFromPhoto = useCallback((suggestion: PhotoQuoteSuggestion) => {
    // Navigate to quotes page with pre-filled data via URL params
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

  const showLoginDialog = !loading && !user;

  // Mobile: Full-screen chat experience
  if (isMobile) {
    return (
      <DashboardLayout>
        <div className="flex flex-col bg-background -m-3 h-[100dvh] max-h-[100dvh] overflow-hidden">
          {/* Sidebar */}
          <GeorgeSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            selectedConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            isMobile={true}
          />

          {/* Scrollable Chat Area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 pt-2">
              <GeorgeUsageWarning />
            </div>
            <VoiceFallbackBanner onFocusTextInput={focusTextInput} />
            <GeorgeChatArea
              messages={messages}
              isProcessing={isProcessing}
              onQuickAction={handleQuickAction}
              onMenuClick={() => setSidebarOpen(true)}
            />
            {/* Photo Quote Suggestion */}
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
          
          {/* Sticky Input */}
          <div className="flex-shrink-0">
            <GeorgeMobileInput
              onUserMessage={handleUserMessage}
              onAssistantMessage={handleAssistantMessage}
              onPhotoQuote={handlePhotoQuote}
              conversationId={activeConversationId}
            />
          </div>
        </div>

        <GeorgeLoginDialog open={showLoginDialog} />
      </DashboardLayout>
    );
  }

  // Desktop layout with resizable sidebar
  return (
    <DashboardLayout>
      <div className="flex bg-background overflow-hidden -m-6 -mt-[22px] h-[calc(100vh-3.5rem)]">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Resizable Sidebar */}
          {sidebarOpen && (
            <>
              <ResizablePanel 
                defaultSize={22} 
                minSize={15} 
                maxSize={40}
                className="min-w-[200px]"
              >
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

          {/* Main Chat Area */}
          <ResizablePanel defaultSize={sidebarOpen ? 78 : 100} minSize={50}>
            <div className="flex flex-col h-full">
              <div className="px-4 pt-2">
                <GeorgeUsageWarning />
              </div>
              <VoiceFallbackBanner onFocusTextInput={focusTextInput} />
              <GeorgeChatArea
                messages={messages}
                isProcessing={isProcessing}
                onQuickAction={handleQuickAction}
                onMenuClick={() => setSidebarOpen(true)}
              />

              {/* Photo Quote Suggestion */}
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
