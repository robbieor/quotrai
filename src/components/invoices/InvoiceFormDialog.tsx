import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RewriteButton } from "@/components/ai/RewriteButton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCustomers } from "@/hooks/useCustomers";
import { useCreateInvoice, useUpdateInvoice, Invoice } from "@/hooks/useInvoices";
import { useXeroSync } from "@/hooks/useXeroSync";
import { InvoiceLineItems, LineItem } from "./InvoiceLineItems";
import { Constants } from "@/integrations/supabase/types";
import { PricingDisplayModeSelector } from "@/components/shared/PricingDisplayModeSelector";
import type { PricingDisplayMode } from "@/types/pricingDisplay";
import { getCurrencyFromCountry, formatCurrencyValue, getCurrencySymbol } from "@/utils/currencyUtils";
import { calculateTotals, getDefaultLineRate, getTaxName, hasVatConfig } from "@/utils/vatRates";
import { useProfile } from "@/hooks/useProfile";

const invoiceStatuses = Constants.public.Enums.invoice_status;

const invoiceSchema = z.object({
  customer_id: z.string().min(1, "Please select a customer"),
  status: z.enum(invoiceStatuses),
  issue_date: z.date(),
  due_date: z.date(),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
}

export function InvoiceFormDialog({ open, onOpenChange, invoice }: InvoiceFormDialogProps) {
  const { data: customers } = useCustomers();
  const { profile } = useProfile();
  const { syncInvoice } = useXeroSync();
  const createInvoice = useCreateInvoice(syncInvoice);
  const updateInvoice = useUpdateInvoice(syncInvoice);
  const isEditing = !!invoice;

  const country = profile?.country ?? "IE";
  const taxName = getTaxName(country);
  const showTax = hasVatConfig(country);

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unit_price: 0,
      line_group: "Materials",
      visible: true,
      tax_rate: getDefaultLineRate(country, "Materials"),
    },
  ]);
  const [displayMode, setDisplayMode] = useState<PricingDisplayMode>("detailed");

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customer_id: "",
      status: "draft",
      issue_date: new Date(),
      due_date: addDays(new Date(), 14),
      notes: "",
    },
  });

  // Watch customer_id to auto-select currency
  const selectedCustomerId = form.watch("customer_id");
  
  // Get currency based on selected customer's country
  const selectedCurrency = useMemo(() => {
    const customer = customers?.find(c => c.id === selectedCustomerId);
    return getCurrencyFromCountry(customer?.country_code);
  }, [customers, selectedCustomerId]);

  // Get selected customer for display
  const selectedCustomer = useMemo(() => {
    return customers?.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  useEffect(() => {
    if (invoice) {
      form.reset({
        customer_id: invoice.customer_id,
        status: invoice.status,
        issue_date: new Date(invoice.issue_date),
        due_date: new Date(invoice.due_date),
        notes: invoice.notes || "",
      });
      setLineItems(
        invoice.invoice_items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          line_group: (item as any).line_group || "Materials",
          visible: (item as any).visible !== false,
          tax_rate:
            (item as any).tax_rate !== null && (item as any).tax_rate !== undefined
              ? Number((item as any).tax_rate)
              : Number(invoice.tax_rate) || getDefaultLineRate(country, (item as any).line_group),
        }))
      );
      setDisplayMode((invoice as any).pricing_display_mode || "detailed");
    } else {
      form.reset({
        customer_id: "",
        status: "draft",
        issue_date: new Date(),
        due_date: addDays(new Date(), 14),
        notes: "",
      });
      setLineItems([
        {
          id: crypto.randomUUID(),
          description: "",
          quantity: 1,
          unit_price: 0,
          line_group: "Materials",
          visible: true,
          tax_rate: getDefaultLineRate(country, "Materials"),
        },
      ]);
      setDisplayMode("detailed");
    }
  }, [invoice, form, country]);

  const totals = useMemo(() => calculateTotals(lineItems), [lineItems]);
  const { subtotal, taxAmount, total, breakdown, uniformRate } = totals;

  const formatCurrency = (value: number) => {
    return formatCurrencyValue(value, selectedCurrency);
  };

  const onSubmit = async (values: InvoiceFormValues) => {
    const validItems = lineItems.filter((item) => item.description.trim() !== "");

    if (validItems.length === 0) {
      form.setError("root", { message: "Please add at least one line item" });
      return;
    }

    const docTaxRate = uniformRate ?? 0;

    const invoiceData = {
      customer_id: values.customer_id,
      status: values.status,
      issue_date: format(values.issue_date, "yyyy-MM-dd"),
      due_date: format(values.due_date, "yyyy-MM-dd"),
      tax_rate: docTaxRate,
      notes: values.notes || null,
      pricing_display_mode: displayMode,
    };

    const itemsData = validItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_group: item.line_group || "Materials",
      visible: item.visible !== false,
      tax_rate: item.tax_rate ?? getDefaultLineRate(country, item.line_group),
    }));

    if (isEditing) {
      await updateInvoice.mutateAsync({ id: invoice.id, invoice: invoiceData, items: itemsData });
    } else {
      await createInvoice.mutateAsync({ invoice: invoiceData, items: itemsData });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            <div className="flex items-center gap-2">
                              <span>{customer.name}</span>
                              {customer.country_code && (
                                <span className="text-xs text-muted-foreground">
                                  ({getCurrencySymbol(getCurrencyFromCountry(customer.country_code))})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCustomer?.country_code && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Currency: <Badge variant="outline" className="ml-1 text-xs py-0">{selectedCurrency}</Badge>
                        {vatInfo && (
                          <span className="ml-2">VAT: <Badge variant="outline" className="ml-1 text-xs py-0">{vatInfo.label}</Badge></span>
                        )}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="issue_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Issue Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-4">Line Items</h3>
              <PricingDisplayModeSelector value={displayMode} onChange={setDisplayMode} />
              <div className="mt-4">
                <InvoiceLineItems items={lineItems} onChange={setLineItems} currencyCode={selectedCurrency} />
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Notes</FormLabel>
                    <RewriteButton
                      value={field.value ?? ""}
                      onAccept={(v) => field.onChange(v)}
                      context="overdue_chase"
                    />
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Payment terms, instructions, etc..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createInvoice.isPending || updateInvoice.isPending}
              >
                {isEditing ? "Save Changes" : "Create Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
