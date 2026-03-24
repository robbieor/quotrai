import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Users, FileText, ClipboardList, Briefcase, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportToExcel } from "@/utils/exportToExcel";
import { format } from "date-fns";

type ExportEntity = "customers" | "invoices" | "quotes" | "jobs";

const EXPORT_OPTIONS: { value: ExportEntity; label: string; icon: React.ElementType; description: string }[] = [
  { value: "customers", label: "Customers", icon: Users, description: "Names, emails, phones, addresses" },
  { value: "invoices", label: "Invoices", icon: FileText, description: "Invoice numbers, totals, statuses, dates" },
  { value: "quotes", label: "Quotes", icon: ClipboardList, description: "Quote numbers, totals, statuses, dates" },
  { value: "jobs", label: "Jobs", icon: Briefcase, description: "Job titles, statuses, dates, values" },
];

async function fetchAllRows<T>(table: string, select: string, orderBy: string): Promise<T[]> {
  const PAGE = 1000;
  let all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(orderBy, { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data as T[]);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export function DataExportSection() {
  const [loading, setLoading] = useState<ExportEntity | null>(null);

  const handleExport = async (entity: ExportEntity) => {
    setLoading(entity);
    try {
      const timestamp = format(new Date(), "yyyy-MM-dd");

      switch (entity) {
        case "customers": {
          const rows = await fetchAllRows<Record<string, unknown>>("customers", "*", "created_at");
          exportToExcel(rows, [
            { header: "Client #", accessor: (r) => r.client_number as number },
            { header: "Name", accessor: (r) => r.name as string },
            { header: "Email", accessor: (r) => r.email as string },
            { header: "Phone", accessor: (r) => r.phone as string },
            { header: "Contact Person", accessor: (r) => r.contact_person as string },
            { header: "Address", accessor: (r) => r.address as string },
            { header: "City", accessor: (r) => r.city as string },
            { header: "Region", accessor: (r) => r.region as string },
            { header: "Postal Code", accessor: (r) => r.postal_code as string },
            { header: "Country", accessor: (r) => r.country as string },
            { header: "Notes", accessor: (r) => r.notes as string },
            { header: "Created", accessor: (r) => r.created_at ? format(new Date(r.created_at as string), "yyyy-MM-dd") : "" },
          ], `customers-export-${timestamp}`);
          break;
        }

        case "invoices": {
          const rows = await fetchAllRows<Record<string, unknown>>("invoices", "*, customer:customers(name, email)", "created_at");
          exportToExcel(rows, [
            { header: "Invoice #", accessor: (r) => r.invoice_number as string },
            { header: "Customer", accessor: (r) => (r.customer as Record<string, unknown>)?.name as string },
            { header: "Customer Email", accessor: (r) => (r.customer as Record<string, unknown>)?.email as string },
            { header: "Status", accessor: (r) => r.status as string },
            { header: "Issue Date", accessor: (r) => r.issue_date ? format(new Date(r.issue_date as string), "yyyy-MM-dd") : "" },
            { header: "Due Date", accessor: (r) => r.due_date ? format(new Date(r.due_date as string), "yyyy-MM-dd") : "" },
            { header: "Subtotal", accessor: (r) => r.subtotal as number },
            { header: "Tax Rate", accessor: (r) => r.tax_rate as number },
            { header: "Tax Amount", accessor: (r) => r.tax_amount as number },
            { header: "Total", accessor: (r) => r.total as number },
            { header: "Notes", accessor: (r) => r.notes as string },
            { header: "Created", accessor: (r) => r.created_at ? format(new Date(r.created_at as string), "yyyy-MM-dd") : "" },
          ], `invoices-export-${timestamp}`);
          break;
        }

        case "quotes": {
          const rows = await fetchAllRows<Record<string, unknown>>("quotes", "*, customer:customers(name, email)", "created_at");
          exportToExcel(rows, [
            { header: "Quote #", accessor: (r) => r.quote_number as string },
            { header: "Customer", accessor: (r) => (r.customer as Record<string, unknown>)?.name as string },
            { header: "Customer Email", accessor: (r) => (r.customer as Record<string, unknown>)?.email as string },
            { header: "Status", accessor: (r) => r.status as string },
            { header: "Valid Until", accessor: (r) => r.valid_until ? format(new Date(r.valid_until as string), "yyyy-MM-dd") : "" },
            { header: "Subtotal", accessor: (r) => r.subtotal as number },
            { header: "Tax Rate", accessor: (r) => r.tax_rate as number },
            { header: "Tax Amount", accessor: (r) => r.tax_amount as number },
            { header: "Total", accessor: (r) => r.total as number },
            { header: "Notes", accessor: (r) => r.notes as string },
            { header: "Created", accessor: (r) => r.created_at ? format(new Date(r.created_at as string), "yyyy-MM-dd") : "" },
          ], `quotes-export-${timestamp}`);
          break;
        }

        case "jobs": {
          const rows = await fetchAllRows<Record<string, unknown>>("jobs", "*, customers(name)", "created_at");
          exportToExcel(rows, [
            { header: "Title", accessor: (r) => r.title as string },
            { header: "Customer", accessor: (r) => (r.customers as Record<string, unknown>)?.name as string },
            { header: "Status", accessor: (r) => r.status as string },
            { header: "Scheduled Date", accessor: (r) => r.scheduled_date ? format(new Date(r.scheduled_date as string), "yyyy-MM-dd") : "" },
            { header: "Scheduled Time", accessor: (r) => r.scheduled_time as string },
            { header: "Estimated Value", accessor: (r) => r.estimated_value as number },
            { header: "Description", accessor: (r) => r.description as string },
            { header: "Created", accessor: (r) => r.created_at ? format(new Date(r.created_at as string), "yyyy-MM-dd") : "" },
          ], `jobs-export-${timestamp}`);
          break;
        }
      }

      toast.success(`${entity.charAt(0).toUpperCase() + entity.slice(1)} exported successfully`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Export failed";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
        </CardTitle>
        <CardDescription>
          Download your data as CSV files for backup, reporting, or migration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EXPORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isLoading = loading === opt.value;
            return (
              <Button
                key={opt.value}
                variant="outline"
                className="h-auto py-4 px-4 flex items-start gap-3 justify-start text-left"
                disabled={loading !== null}
                onClick={() => handleExport(opt.value)}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 mt-0.5 shrink-0 animate-spin text-primary" />
                ) : (
                  <Icon className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
