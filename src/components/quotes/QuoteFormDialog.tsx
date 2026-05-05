import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { CalendarIcon, FileText, Briefcase } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCustomers } from "@/hooks/useCustomers";
import { useJobs } from "@/hooks/useJobs";
import { useCreateQuote, useUpdateQuote, Quote } from "@/hooks/useQuotes";
import { QuoteLineItems, LineItem } from "./QuoteLineItems";
import { TemplatePicker } from "./TemplatePicker";
import { Constants } from "@/integrations/supabase/types";
import { PricingDisplayModeSelector } from "@/components/shared/PricingDisplayModeSelector";
import type { PricingDisplayMode } from "@/types/pricingDisplay";
import { getCurrencyFromCountry, formatCurrencyValue, getCurrencySymbol } from "@/utils/currencyUtils";
import { calculateTotals, getDefaultLineRate, getTaxName, hasVatConfig } from "@/utils/vatRates";
import { useProfile } from "@/hooks/useProfile";
import { safeFormatDate } from "@/lib/pdf/dateUtils";
import { RewriteButton } from "@/components/ai/RewriteButton";

const quoteStatuses = Constants.public.Enums.quote_status;

const quoteSchema = z.object({
  customer_id: z.string().min(1, "Please select a customer"),
  job_id: z.string().optional(),
  status: z.enum(quoteStatuses),
  valid_until: z.date().optional(),
  notes: z.string().optional(),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface QuoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote?: Quote | null;
}

export function QuoteFormDialog({ open, onOpenChange, quote }: QuoteFormDialogProps) {
  const { data: customers } = useCustomers();
  const { data: jobs } = useJobs();
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  const isEditing = !!quote;
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, line_group: "Materials", visible: true },
  ]);
  const [displayMode, setDisplayMode] = useState<PricingDisplayMode>("detailed");

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customer_id: "",
      job_id: "",
      status: "draft",
      valid_until: addDays(new Date(), 30),
      tax_rate: 0,
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

  // Get VAT info for display
  const vatInfo = useMemo(() => {
    return getCountryVatInfo(selectedCustomer?.country_code);
  }, [selectedCustomer]);

  // Auto-populate tax rate when customer changes (only for new quotes)
  useEffect(() => {
    if (!isEditing && selectedCustomer?.country_code) {
      const vatRate = getVatRateFromCountry(selectedCustomer.country_code);
      form.setValue("tax_rate", vatRate);
    }
  }, [selectedCustomer?.country_code, isEditing, form]);

  // Filter jobs by selected customer
  const filteredJobs = useMemo(() => {
    if (!jobs || !selectedCustomerId) return [];
    return jobs.filter(j => j.customer_id === selectedCustomerId);
  }, [jobs, selectedCustomerId]);

  useEffect(() => {
    if (quote) {
      form.reset({
        customer_id: quote.customer_id,
        job_id: quote.job_id || "",
        status: quote.status,
        valid_until: quote.valid_until ? new Date(quote.valid_until) : undefined,
        tax_rate: Number(quote.tax_rate) || 0,
        notes: quote.notes || "",
      });
      setLineItems(
        quote.quote_items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          line_group: (item as any).line_group || "Materials",
          visible: (item as any).visible !== false,
        }))
      );
      setDisplayMode((quote as any).pricing_display_mode || "detailed");
    } else {
      form.reset({
        customer_id: "",
        job_id: "",
        status: "draft",
        valid_until: addDays(new Date(), 30),
        tax_rate: 0,
        notes: "",
      });
      setLineItems([
        { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, line_group: "Materials", visible: true },
      ]);
      setDisplayMode("detailed");
    }
  }, [quote, form]);

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const taxRate = form.watch("tax_rate") || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const formatCurrency = (value: number) => {
    return formatCurrencyValue(value, selectedCurrency);
  };

  const onSubmit = async (values: QuoteFormValues) => {
    const validItems = lineItems.filter((item) => item.description.trim() !== "");
    
    if (validItems.length === 0) {
      form.setError("root", { message: "Please add at least one line item" });
      return;
    }

    const quoteData = {
      customer_id: values.customer_id,
      job_id: values.job_id && values.job_id !== "none" ? values.job_id : null,
      status: values.status,
      valid_until: values.valid_until ? format(values.valid_until, "yyyy-MM-dd") : null,
      tax_rate: values.tax_rate,
      notes: values.notes || null,
      pricing_display_mode: displayMode,
    };

    const itemsData = validItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_group: item.line_group || "Materials",
      visible: item.visible !== false,
    }));

    if (isEditing) {
      await updateQuote.mutateAsync({ id: quote.id, quote: quoteData, items: itemsData });
    } else {
      await createQuote.mutateAsync({ quote: quoteData, items: itemsData });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Quote" : "Create New Quote"}</DialogTitle>
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
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Job Link */}
            <FormField
              control={form.control}
              name="job_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    Link to Job
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedCustomerId ? (filteredJobs.length > 0 ? "Select a job (optional)" : "No jobs for this customer") : "Select a customer first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No linked job</SelectItem>
                      {filteredJobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.title} {job.scheduled_date ? `(${safeFormatDate(job.scheduled_date, "MMM d")})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Valid Until</FormLabel>
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
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Line Items</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setTemplatePickerOpen(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              </div>
              <PricingDisplayModeSelector value={displayMode} onChange={setDisplayMode} />
              <div className="mt-4">
                <QuoteLineItems items={lineItems} onChange={setLineItems} currencyCode={selectedCurrency} />
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
                      context="quote_followup"
                    />
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes or terms..."
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
                disabled={createQuote.isPending || updateQuote.isPending}
              >
                {isEditing ? "Save Changes" : "Create Quote"}
              </Button>
            </div>
          </form>
        </Form>

        <TemplatePicker
          open={templatePickerOpen}
          onOpenChange={setTemplatePickerOpen}
          onSelect={(items) => {
            const newItems = items.map((item) => ({
              id: crypto.randomUUID(),
              ...item,
            }));
            setLineItems(newItems);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
