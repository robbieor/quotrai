import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { CalendarIcon, RefreshCw } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCustomers } from "@/hooks/useCustomers";
import { useCreateRecurringInvoice, useUpdateRecurringInvoice, RecurringInvoice } from "@/hooks/useRecurringInvoices";
import { InvoiceLineItems, LineItem } from "./InvoiceLineItems";
import { getCurrencyFromCountry, formatCurrencyValue } from "@/utils/currencyUtils";

const schema = z.object({
  customer_id: z.string().min(1, "Select a customer"),
  frequency: z.string().min(1),
  next_run_date: z.date(),
  auto_send: z.boolean(),
  tax_rate: z.number().min(0).max(100),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: RecurringInvoice | null;
}

const frequencyOptions = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Every 2 Weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export function RecurringInvoiceFormDialog({ open, onOpenChange, schedule }: Props) {
  const { data: customers } = useCustomers();
  const createSchedule = useCreateRecurringInvoice();
  const updateSchedule = useUpdateRecurringInvoice();
  const isEditing = !!schedule;

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0 },
  ]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_id: "",
      frequency: "monthly",
      next_run_date: addDays(new Date(), 1),
      auto_send: false,
      tax_rate: 0,
      notes: "",
    },
  });

  const selectedCustomerId = form.watch("customer_id");
  const selectedCurrency = useMemo(() => {
    const customer = customers?.find((c) => c.id === selectedCustomerId);
    return getCurrencyFromCountry(customer?.country_code);
  }, [customers, selectedCustomerId]);

  useEffect(() => {
    if (schedule) {
      form.reset({
        customer_id: schedule.customer_id,
        frequency: schedule.frequency,
        next_run_date: new Date(schedule.next_run_date),
        auto_send: schedule.auto_send,
        tax_rate: Number(schedule.tax_rate) || 0,
        notes: schedule.notes || "",
      });
      setLineItems(
        schedule.recurring_invoice_items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        }))
      );
    } else {
      form.reset({
        customer_id: "",
        frequency: "monthly",
        next_run_date: addDays(new Date(), 1),
        auto_send: false,
        tax_rate: 0,
        notes: "",
      });
      setLineItems([{ id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0 }]);
    }
  }, [schedule, form]);

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxRate = form.watch("tax_rate") || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const onSubmit = async (values: FormValues) => {
    const validItems = lineItems.filter((item) => item.description.trim() !== "");
    if (validItems.length === 0) {
      form.setError("root", { message: "Add at least one line item" });
      return;
    }

    const scheduleData = {
      customer_id: values.customer_id,
      frequency: values.frequency,
      next_run_date: format(values.next_run_date, "yyyy-MM-dd"),
      auto_send: values.auto_send,
      tax_rate: values.tax_rate,
      notes: values.notes || undefined,
    };

    const itemsData = validItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    if (isEditing) {
      await updateSchedule.mutateAsync({ id: schedule.id, schedule: scheduleData, items: itemsData });
    } else {
      await createSchedule.mutateAsync({ schedule: scheduleData, items: itemsData });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {isEditing ? "Edit Recurring Invoice" : "New Recurring Invoice"}
          </DialogTitle>
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
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {frequencyOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="next_run_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Next Invoice Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
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

              <FormField
                control={form.control}
                name="auto_send"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Auto-send to customer</FormLabel>
                    <div className="flex items-center gap-2 h-10">
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                      <Label className="text-sm text-muted-foreground">
                        {field.value ? "Yes" : "No"}
                      </Label>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-4">Line Items</h3>
              <InvoiceLineItems items={lineItems} onChange={setLineItems} currencyCode={selectedCurrency} />
            </div>

            <Separator />

            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrencyValue(subtotal, selectedCurrency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                  <span>{formatCurrencyValue(taxAmount, selectedCurrency)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total per invoice</span>
                  <span>{formatCurrencyValue(total, selectedCurrency)}</span>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes included on each generated invoice..." className="resize-none" {...field} />
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
              <Button type="submit" disabled={createSchedule.isPending || updateSchedule.isPending}>
                {isEditing ? "Save Changes" : "Create Schedule"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
