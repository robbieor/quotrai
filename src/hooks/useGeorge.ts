import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GeorgeProject {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeorgeConversation {
  id: string;
  team_id: string;
  user_id: string;
  project_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
  first_message?: string;
}

export interface GeorgeMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// Projects
export function useGeorgeProjects() {
  return useQuery({
    queryKey: ["george-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("george_projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GeorgeProject[];
    },
  });
}

export function useCreateGeorgeProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: { name: string; description?: string }) => {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      
      const { data, error } = await supabase
        .from("george_projects")
        .insert({ ...project, team_id: teamId })
        .select()
        .single();

      if (error) throw error;
      return data as GeorgeProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["george-projects"] });
      toast.success("Project created");
    },
    onError: (error) => {
      toast.error("Failed to create project: " + error.message);
    },
  });
}

export function useDeleteGeorgeProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("george_projects")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["george-projects"] });
      queryClient.invalidateQueries({ queryKey: ["george-conversations"] });
      toast.success("Project deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete project: " + error.message);
    },
  });
}

// Conversations
export function useGeorgeConversations() {
  return useQuery({
    queryKey: ["george-conversations"],
    queryFn: async () => {
      const { data: conversations, error } = await supabase
        .from("george_conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Get first message for each conversation
      const conversationsWithPreview = await Promise.all(
        (conversations || []).map(async (conv) => {
          const { data: messages } = await supabase
            .from("george_messages")
            .select("content")
            .eq("conversation_id", conv.id)
            .eq("role", "user")
            .order("created_at", { ascending: true })
            .limit(1);

          return {
            ...conv,
            first_message: messages?.[0]?.content || null,
          };
        })
      );

      return conversationsWithPreview as GeorgeConversation[];
    },
  });
}

export function useCreateGeorgeConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data?: { title?: string; project_id?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: teamId } = await supabase.rpc("get_user_team_id");

      const { data: conversation, error } = await supabase
        .from("george_conversations")
        .insert({
          team_id: teamId,
          user_id: user.user?.id,
          title: data?.title || null,
          project_id: data?.project_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return conversation as GeorgeConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["george-conversations"] });
    },
    onError: (error) => {
      toast.error("Failed to create conversation: " + error.message);
    },
  });
}

export function useDeleteGeorgeConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("george_conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["george-conversations"] });
      toast.success("Conversation deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete conversation: " + error.message);
    },
  });
}

export function useClearAllGeorgeConversations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: teamId } = await supabase.rpc("get_user_team_id");
      
      const { error } = await supabase
        .from("george_conversations")
        .delete()
        .eq("team_id", teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["george-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["george-messages"] });
      toast.success("All conversations cleared");
    },
    onError: (error) => {
      toast.error("Failed to clear conversations: " + error.message);
    },
  });
}

export function useUpdateGeorgeConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; project_id?: string | null }) => {
      const { data, error } = await supabase
        .from("george_conversations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as GeorgeConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["george-conversations"] });
    },
  });
}

// Messages
export function useGeorgeMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["george-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("george_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as GeorgeMessage[];
    },
    enabled: !!conversationId,
  });
}

export function useAddGeorgeMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: { conversation_id: string; role: "user" | "assistant"; content: string }) => {
      const { data, error } = await supabase
        .from("george_messages")
        .insert(message)
        .select()
        .single();

      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from("george_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", message.conversation_id);

      return data as GeorgeMessage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["george-messages", variables.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["george-conversations"] });
    },
  });
}

// Search conversations and messages
export function useSearchGeorgeHistory(searchQuery: string) {
  return useQuery({
    queryKey: ["george-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { conversations: [], messageMatches: [] };

      const query = searchQuery.toLowerCase().trim();

      // Search conversations by title
      const { data: conversations, error: convError } = await supabase
        .from("george_conversations")
        .select("*")
        .or(`title.ilike.%${query}%`)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (convError) throw convError;

      // Search messages by content
      const { data: messages, error: msgError } = await supabase
        .from("george_messages")
        .select("*, george_conversations!inner(id, title, updated_at)")
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (msgError) throw msgError;

      // Group message matches by conversation
      const messageMatches = messages?.map((msg: any) => ({
        message: msg as GeorgeMessage,
        conversation: {
          id: msg.george_conversations.id,
          title: msg.george_conversations.title,
          updated_at: msg.george_conversations.updated_at,
        },
        snippet: getSnippet(msg.content, query),
      })) || [];

      return {
        conversations: (conversations || []) as GeorgeConversation[],
        messageMatches,
      };
    },
    enabled: searchQuery.trim().length >= 2,
    staleTime: 30000,
  });
}

function getSnippet(content: string, query: string): string {
  const lowerContent = content.toLowerCase();
  const index = lowerContent.indexOf(query.toLowerCase());
  if (index === -1) return content.slice(0, 80) + "...";
  
  const start = Math.max(0, index - 30);
  const end = Math.min(content.length, index + query.length + 50);
  let snippet = content.slice(start, end);
  
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";
  
  return snippet;
}

// Group conversations by date
export function groupConversationsByDate(conversations: GeorgeConversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups: { label: string; conversations: GeorgeConversation[] }[] = [
    { label: "Today", conversations: [] },
    { label: "Yesterday", conversations: [] },
    { label: "Previous 7 days", conversations: [] },
    { label: "Older", conversations: [] },
  ];

  conversations.forEach((conv) => {
    const convDate = new Date(conv.updated_at);
    if (convDate >= today) {
      groups[0].conversations.push(conv);
    } else if (convDate >= yesterday) {
      groups[1].conversations.push(conv);
    } else if (convDate >= lastWeek) {
      groups[2].conversations.push(conv);
    } else {
      groups[3].conversations.push(conv);
    }
  });

  return groups.filter((g) => g.conversations.length > 0);
}
