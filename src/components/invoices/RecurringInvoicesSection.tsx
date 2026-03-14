import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, RefreshCw, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import {
  useRecurringInvoices,
  useToggleRecurringInvoice,
  useDeleteRecurringInvoice,
  RecurringInvoice,
} from "@/hooks/useRecurringInvoices";
import { RecurringInvoiceFormDialog } from "./RecurringInvoiceFormDialog";
import { useCurrency } from "@/hooks/useCurrency";

const frequencyLabels: Record<string, string> = {
  weekly: "Weekly",
  fortnightly: "Every 2 Weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function RecurringInvoicesSection() {
  const { data: schedules, isLoading } = useRecurringInvoices();
  const toggleActive = useToggleRecurringInvoice();
  const deleteSchedule = useDeleteRecurringInvoice();
  const { formatCurrency } = useCurrency();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<RecurringInvoice | null>(null);

  const handleEdit = (schedule: RecurringInvoice) => {
    setSelectedSchedule(schedule);
    setFormOpen(true);
  };

  const handleNew = () => {
    setSelectedSchedule(null);
    setFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Recurring Invoices</h2>
          {schedules && schedules.length > 0 && (
            <Badge variant="secondary">{schedules.filter((s) => s.is_active).length} active</Badge>
          )}
        </div>
        <Button size="sm" onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" />
          New Schedule
        </Button>
      </div>

      {!schedules || schedules.length === 0 ? (
        <div className="text-center py-10 rounded-lg border border-dashed border-border">
          <RefreshCw className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <h3 className="font-medium text-foreground">No recurring invoices</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Set up automatic invoice generation for repeat customers
          </p>
          <Button size="sm" className="mt-4 gap-2" onClick={handleNew}>
            <Plus className="h-4 w-4" />
            Create Schedule
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Next Invoice</TableHead>
                <TableHead>Auto-send</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => {
                const subtotal = schedule.recurring_invoice_items.reduce(
                  (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
                  0
                );
                const taxAmount = subtotal * (Number(schedule.tax_rate) / 100);
                const total = subtotal + taxAmount;

                return (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      {schedule.customer?.name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{frequencyLabels[schedule.frequency] || schedule.frequency}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(total)}</TableCell>
                    <TableCell>
                      {format(new Date(schedule.next_run_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={schedule.auto_send ? "default" : "secondary"}>
                        {schedule.auto_send ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: schedule.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteSchedule.mutate(schedule.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <RecurringInvoiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        schedule={selectedSchedule}
      />
    </div>
  );
}
