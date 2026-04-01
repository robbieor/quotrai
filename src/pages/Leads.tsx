import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, UserPlus, FileText, Phone, Mail, Globe, Users, Share2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, type Lead, type LeadInsert } from "@/hooks/useLeads";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserPlus as UserPlusIcon } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

const statusBadgeVariant: Record<string, "default" | "warning" | "secondary" | "success" | "destructive"> = {
  new: "default",
  contacted: "warning",
  quoted: "secondary",
  won: "success",
  lost: "destructive",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  urgent: "bg-red-500 text-white",
};

const sourceIcons: Record<string, React.ReactNode> = {
  phone: <Phone className="h-3 w-3" />,
  email: <Mail className="h-3 w-3" />,
  website: <Globe className="h-3 w-3" />,
  referral: <Users className="h-3 w-3" />,
  social: <Share2 className="h-3 w-3" />,
  manual: <UserPlus className="h-3 w-3" />,
};

export default function Leads() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const { data: leads, isLoading } = useLeads();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const { formatCurrency } = useCurrency();

  const filtered = leads?.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = (values: LeadInsert) => {
    createLead.mutate(values, { onSuccess: () => setFormDialogOpen(false) });
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setFormDialogOpen(true);
  };

  const handleUpdate = (values: LeadInsert) => {
    if (!selectedLead) return;
    updateLead.mutate({ id: selectedLead.id, ...values }, {
      onSuccess: () => {
        setFormDialogOpen(false);
        setSelectedLead(null);
      },
    });
  };

  const handleStatusChange = (lead: Lead, status: string) => {
    updateLead.mutate({ id: lead.id, status });
  };

  const handleDelete = () => {
    if (selectedLead) {
      deleteLead.mutate(selectedLead.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSelectedLead(null);
        },
      });
    }
  };

  // Stats
  const stats = {
    total: leads?.length || 0,
    new: leads?.filter((l) => l.status === "new").length || 0,
    quoted: leads?.filter((l) => l.status === "quoted").length || 0,
    won: leads?.filter((l) => l.status === "won").length || 0,
    pipeline: leads?.filter((l) => !["won", "lost"].includes(l.status)).reduce((sum, l) => sum + (l.estimated_value || 0), 0) || 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">Leads</h1>
          {isMobile ? (
            <button
              onClick={() => { setSelectedLead(null); setFormDialogOpen(true); }}
              className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
            >
              <Plus className="h-5 w-5" />
            </button>
          ) : (
            <Button onClick={() => { setSelectedLead(null); setFormDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              New Lead
            </Button>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-primary">{stats.new}</p>
            <p className="text-xs text-muted-foreground">New</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-primary">{stats.won}</p>
            <p className="text-xs text-muted-foreground">Won</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold tabular-nums truncate">{formatCurrency(stats.pipeline)}</p>
            <p className="text-xs text-muted-foreground">Pipeline Value</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search leads..." className={cn("pl-9", isMobile && "rounded-[22px] bg-[hsl(240,10%,96%)] border-0 h-11")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lead cards */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} shimmer className="h-20 w-full rounded-[14px]" />
            ))}
          </div>
        ) : filtered?.length === 0 ? (
          <EmptyState
            icon={UserPlusIcon}
            title={searchQuery || statusFilter !== "all" ? "No leads match your filters" : "Never lose a lead again"}
            description={searchQuery || statusFilter !== "all" ? "Try adjusting your search or status filter." : "Capture enquiries from calls, emails, and referrals — then convert them into quotes and jobs with one click."}
            actionLabel={!searchQuery && statusFilter === "all" ? "Add Your First Lead" : undefined}
            onAction={!searchQuery && statusFilter === "all" ? () => { setSelectedLead(null); setFormDialogOpen(true); } : undefined}
          />
        ) : (
          <div className="space-y-3">
            {filtered?.map((lead) => (
              <Card key={lead.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{lead.name}</h3>
                        <Badge variant={statusBadgeVariant[lead.status] || "secondary"}>
                          {lead.status}
                        </Badge>
                        {lead.priority && lead.priority !== "medium" && (
                          <Badge className={priorityColors[lead.priority] || ""} variant="secondary">
                            {lead.priority}
                          </Badge>
                        )}
                        {lead.source && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            {sourceIcons[lead.source]}
                            {lead.source}
                          </Badge>
                        )}
                      </div>
                      {lead.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{lead.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {lead.email && <span>{lead.email}</span>}
                        {lead.phone && <span>{lead.phone}</span>}
                        {lead.estimated_value && <span className="font-medium text-foreground">{formatCurrency(lead.estimated_value)}</span>}
                        {lead.follow_up_date && <span>Follow-up: {new Date(lead.follow_up_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Quick status change */}
                      <Select value={lead.status} onValueChange={(s) => handleStatusChange(lead, s)}>
                        <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="quoted">Quoted</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(lead)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedLead(lead); setDeleteDialogOpen(true); }} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <LeadFormDialog
        open={formDialogOpen}
        onOpenChange={(o) => { setFormDialogOpen(o); if (!o) setSelectedLead(null); }}
        lead={selectedLead}
        onSubmit={selectedLead ? handleUpdate : handleCreate}
        isLoading={createLead.isPending || updateLead.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedLead?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
