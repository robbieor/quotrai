import { useState, useRef, useEffect } from "react";
import { Plus, MessageSquare, Trash2, FolderPlus, Folder, ChevronDown, ChevronRight, Search, X, Pencil, MoreHorizontal, Share, Archive, Pin, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useGeorgeConversations,
  useGeorgeProjects,
  useDeleteGeorgeConversation,
  useClearAllGeorgeConversations,
  useCreateGeorgeProject,
  useDeleteGeorgeProject,
  useSearchGeorgeHistory,
  useUpdateGeorgeConversation,
  groupConversationsByDate,
  type GeorgeConversation,
  type GeorgeProject,
} from "@/hooks/useGeorge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface GeorgeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  onNewChat: () => void;
  isMobile: boolean;
}

export function GeorgeSidebar({
  isOpen,
  onClose,
  selectedConversationId,
  onSelectConversation,
  onNewChat,
  isMobile,
}: GeorgeSidebarProps) {
  const { data: conversations = [] } = useGeorgeConversations();
  const { data: projects = [] } = useGeorgeProjects();
  const deleteConversation = useDeleteGeorgeConversation();
  const clearAllConversations = useClearAllGeorgeConversations();
  const updateConversation = useUpdateGeorgeConversation();
  const createProject = useCreateGeorgeProject();
  const deleteProject = useDeleteGeorgeProject();

  const [projectsOpen, setProjectsOpen] = useState(true);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const { data: searchResults, isLoading: isSearching } = useSearchGeorgeHistory(searchQuery);
  const isSearchActive = searchQuery.trim().length >= 2;

  const groupedConversations = groupConversationsByDate(conversations);

  const handleClearAll = () => {
    clearAllConversations.mutate(undefined, {
      onSuccess: () => {
        onSelectConversation(null);
        setClearDialogOpen(false);
      },
    });
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    createProject.mutate(
      { name: newProjectName, description: newProjectDescription || undefined },
      {
        onSuccess: () => {
          setNewProjectOpen(false);
          setNewProjectName("");
          setNewProjectDescription("");
        },
      }
    );
  };

  const handleSelectConversation = (id: string) => {
    onSelectConversation(id);
    if (isMobile) onClose();
  };

  const handleNewChat = () => {
    onNewChat();
    if (isMobile) onClose();
  };

  if (!isOpen) return null;

  // Mobile: Full-screen overlay sidebar
  if (isMobile) {
    return (
      <>
        {/* Dark overlay */}
        <div
          className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
          onClick={onClose}
        />

        {/* Sidebar panel */}
        <div className="fixed left-0 top-0 bottom-0 z-50 w-[85vw] max-w-xs bg-background flex flex-col animate-in slide-in-from-left duration-200 safe-area-pt overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold">Conversations</span>
            <div className="flex items-center gap-1">
              {conversations.length > 0 && (
                <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-destructive hover:text-destructive" title="Clear all chats">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all conversations?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleClearAll}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {clearAllConversations.isPending ? "Clearing..." : "Clear all"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* New Chat Button */}
          <div className="p-3 space-y-3">
            <Button
              onClick={handleNewChat}
              variant="outline"
              className="w-full justify-start gap-2 h-11 rounded-xl"
            >
              <Plus className="h-4 w-4" />
              New chat
            </Button>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-10 rounded-xl"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-3 pb-3 space-y-3">
              {/* Empty state */}
              {conversations.length === 0 && !isSearchActive && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No conversations yet
                </p>
              )}

              {/* Search Results */}
              {isSearchActive ? (
                <SearchResults
                  results={searchResults}
                  isLoading={isSearching}
                  searchQuery={searchQuery}
                  selectedConversationId={selectedConversationId}
                  onSelectConversation={handleSelectConversation}
                />
              ) : (
                <>
                  {/* Conversations grouped by date */}
                  {groupedConversations.map((group) => (
                    <div key={group.label}>
                      <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
                        {group.label}
                      </h3>
                      <div className="space-y-1">
                        {group.conversations.map((conv) => (
                          <ConversationItem
                            key={conv.id}
                            conversation={conv}
                            isSelected={conv.id === selectedConversationId}
                            onSelect={() => handleSelectConversation(conv.id)}
                            onClose={() => onSelectConversation(null)}
                            onDelete={() => {
                              deleteConversation.mutate(conv.id);
                              if (conv.id === selectedConversationId) {
                                onSelectConversation(null);
                              }
                            }}
                            onRename={(newTitle) => {
                              updateConversation.mutate({ id: conv.id, title: newTitle });
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>

        </div>
      </>
    );
  }

  // Desktop: Original sidebar design
  return (
    <div className="flex flex-col bg-muted/50 border-r border-border h-full w-full">
      {/* Header with actions */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={onNewChat}
            variant="outline"
            className="flex-1 justify-start gap-2"
          >
            <Plus className="h-4 w-4" />
            New chat
          </Button>
          {conversations.length > 0 && (
            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10" title="Clear all chats">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all conversations?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {clearAllConversations.isPending ? "Clearing..." : "Clear all"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Search Results */}
          {isSearchActive ? (
            <SearchResults
              results={searchResults}
              isLoading={isSearching}
              searchQuery={searchQuery}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
            />
          ) : (
            <>
              {/* Conversations grouped by date */}
              {groupedConversations.map((group) => (
                <div key={group.label}>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.conversations.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isSelected={conv.id === selectedConversationId}
                        onSelect={() => handleSelectConversation(conv.id)}
                        onClose={() => onSelectConversation(null)}
                        onDelete={() => {
                          deleteConversation.mutate(conv.id);
                          if (conv.id === selectedConversationId) {
                            onSelectConversation(null);
                          }
                        }}
                        onRename={(newTitle) => {
                          updateConversation.mutate({ id: conv.id, title: newTitle });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {conversations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No conversations yet
                </p>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Projects Section */}
      <div className="border-t border-border">
        <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-3 py-2 h-auto"
            >
              <span className="text-sm font-medium">Projects</span>
              {projectsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3 space-y-1">
              {projects.map((project) => (
                <ProjectItem
                  key={project.id}
                  project={project}
                  onDelete={() => deleteProject.mutate(project.id)}
                />
              ))}

              <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-muted-foreground"
                  >
                    <FolderPlus className="h-4 w-4" />
                    New project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Project name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (optional)</Label>
                      <Textarea
                        id="description"
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        placeholder="What is this project about?"
                      />
                    </div>
                    <Button
                      onClick={handleCreateProject}
                      disabled={!newProjectName.trim() || createProject.isPending}
                      className="w-full"
                    >
                      Create Project
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  onClose,
  onDelete,
  onRename,
}: {
  conversation: GeorgeConversation;
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayTitle =
    conversation.title ||
    conversation.first_message?.slice(0, 30) ||
    "New conversation";

  const hasDescription = !!conversation.first_message && conversation.first_message.length > 0;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditValue(conversation.title || "");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== conversation.title) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 px-2 py-1">
        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm bg-background border border-input rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Conversation name"
        />
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          "group flex items-center gap-2 px-3 rounded-xl cursor-pointer transition-colors min-h-[48px]",
          isSelected
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent/50"
        )}
        onClick={onSelect}
        onDoubleClick={handleStartEdit}
      >
        {/* Expand/collapse button for description */}
        {hasDescription ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 p-0"
            onClick={toggleExpand}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : (
          <MessageSquare className="h-4 w-4 shrink-0" />
        )}
        
        <span className="text-sm truncate flex-1">{displayTitle}</span>
        
        {/* Close button when selected */}
        {isSelected && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close chat"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        
        {/* Context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 shrink-0",
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                const shareUrl = `${window.location.origin}/george?chat=${conversation.id}`;
                navigator.clipboard.writeText(shareUrl);
                toast.success("Link copied to clipboard");
              }}
            >
              <Share className="h-4 w-4 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleStartEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(displayTitle);
                toast.success("Title copied to clipboard");
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                toast.info("Archive feature coming soon");
              }}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Expandable description */}
      {isExpanded && hasDescription && (
        <div className="ml-8 mr-3 px-2 py-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg">
          {conversation.first_message}
        </div>
      )}
    </div>
  );
}

function ProjectItem({
  project,
  onDelete,
}: {
  project: GeorgeProject;
  onDelete: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-accent/50 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Folder className="h-4 w-4 shrink-0" />
      <span className="text-sm truncate flex-1">{project.name}</span>
      {isHovered && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function SearchResults({
  results,
  isLoading,
  searchQuery,
  selectedConversationId,
  onSelectConversation,
}: {
  results: { conversations: GeorgeConversation[]; messageMatches: any[] } | undefined;
  isLoading: boolean;
  searchQuery: string;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Searching...
      </div>
    );
  }

  if (!results || (results.conversations.length === 0 && results.messageMatches.length === 0)) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No results for "{searchQuery}"
      </div>
    );
  }

  const highlightMatch = (text: string, query: string) => {
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-4">
      {results.conversations.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
            Conversations
          </h3>
          <div className="space-y-1">
            {results.conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors",
                  conv.id === selectedConversationId
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
                onClick={() => onSelectConversation(conv.id)}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="text-sm truncate">
                  {highlightMatch(conv.title || "Untitled", searchQuery)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.messageMatches.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
            Messages
          </h3>
          <div className="space-y-1">
            {results.messageMatches.map((match) => (
              <div
                key={match.id}
                className={cn(
                  "flex flex-col gap-1 px-3 py-2.5 rounded-xl cursor-pointer transition-colors",
                  match.conversation_id === selectedConversationId
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
                onClick={() => onSelectConversation(match.conversation_id)}
              >
                <span className="text-xs text-muted-foreground truncate">
                  {match.conversation_title || "Untitled"}
                </span>
                <span className="text-sm truncate">
                  {highlightMatch(match.content.slice(0, 100), searchQuery)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
