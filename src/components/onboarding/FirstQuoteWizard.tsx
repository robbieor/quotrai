import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  ArrowLeft,
  FileText,
  User,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { track } from "@/utils/analytics";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

const SAMPLE_CUSTOMERS: Record<string, { name: string; email: string; address: string }> = {
  Electrician: { name: "Sarah Patterson", email: "sarah@example.com", address: "12 Oak Lane, London" },
  Plumber: { name: "James Miller", email: "james@example.com", address: "8 River Road, Manchester" },
  "HVAC Technician": { name: "Karen Davis", email: "karen@example.com", address: "45 Elm Street, Birmingham" },
  default: { name: "Alex Johnson", email: "alex@example.com", address: "7 High Street, Dublin" },
};

const SAMPLE_ITEMS: Record<string, LineItem[]> = {
  Electrician: [
    { description: "Consumer unit upgrade (17th edition)", quantity: 1, unit_price: 450 },
    { description: "Additional socket installation", quantity: 3, unit_price: 85 },
    { description: "EICR testing & certificate", quantity: 1, unit_price: 180 },
  ],
  Plumber: [
    { description: "Boiler service & safety check", quantity: 1, unit_price: 120 },
    { description: "Radiator flush & bleed (per radiator)", quantity: 5, unit_price: 35 },
    { description: "Thermostat replacement", quantity: 1, unit_price: 95 },
  ],
  "HVAC Technician": [
    { description: "AC unit installation (split system)", quantity: 1, unit_price: 1200 },
    { description: "Ductwork inspection & clean", quantity: 1, unit_price: 250 },
    { description: "Refrigerant top-up", quantity: 1, unit_price: 150 },
  ],
  default: [
    { description: "Site survey & consultation", quantity: 1, unit_price: 150 },
    { description: "Labour (per hour)", quantity: 4, unit_price: 55 },
    { description: "Materials & supplies", quantity: 1, unit_price: 200 },
  ],
};

interface FirstQuoteWizardProps {
  tradeType: string;
  onBack: () => void;
}

export function FirstQuoteWizard({ tradeType, onBack }: FirstQuoteWizardProps) {
  const navigate = useNavigate();
  const sample = SAMPLE_CUSTOMERS[tradeType] || SAMPLE_CUSTOMERS.default;
  const defaultItems = SAMPLE_ITEMS[tradeType] || SAMPLE_ITEMS.default;

  const [wizardStep, setWizardStep] = useState<"customer" | "items" | "review">("customer");
  const [customer, setCustomer] = useState(sample);
  const [items, setItems] = useState<LineItem[]>(defaultItems);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const handleSkip = () => {
    track("onboarding_first_quote_skipped");
    navigate("/dashboard");
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      // Get team_id
      const { data: teamId, error: teamError } = await supabase.rpc("get_user_team_id");
      if (teamError) throw teamError;

      // Create customer
      const { data: newCustomer, error: custError } = await supabase
        .from("customers")
        .insert({ name: customer.name, email: customer.email, address: customer.address, team_id: teamId })
        .select()
        .single();
      if (custError) throw custError;

      // Generate quote number
      const { data: existingQuotes } = await supabase
        .from("quotes")
        .select("display_number")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(1);

      let nextNumber = 1001;
      if (existingQuotes && existingQuotes.length > 0) {
        const lastNum = parseInt(existingQuotes[0].display_number.replace(/\D/g, ""), 10);
        if (!isNaN(lastNum)) nextNumber = lastNum + 1;
      }

      const taxRate = 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      // Create quote
      const { data: newQuote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          display_number: `Q-${nextNumber}`,
          customer_id: newCustomer.id,
          team_id: teamId,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          notes: notes || null,
          status: "draft",
        })
        .select()
        .single();
      if (quoteError) throw quoteError;

      // Create line items
      const quoteItems = items
        .filter((i) => i.description.trim())
        .map((i) => ({
          quote_id: newQuote.id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
        }));

      if (quoteItems.length > 0) {
        const { error: itemsError } = await supabase.from("quote_items").insert(quoteItems);
        if (itemsError) throw itemsError;
      }

      track("onboarding_first_quote_created", { items: quoteItems.length, total });
      toast.success("Your first quote is ready! 🎉");
      navigate("/quotes");
    } catch (error: any) {
      console.error("First quote error:", error);
      toast.error("Failed to create quote. You can create one later from the Quotes page.");
      navigate("/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-up">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {["customer", "items", "review"].map((s) => (
          <div
            key={s}
            className={`h-2 w-8 rounded-full transition-all duration-300 ${
              s === wizardStep ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {wizardStep === "customer" && (
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <User className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Your First Customer</CardTitle>
            <CardDescription>
              We've pre-filled a sample — edit or keep it to see how quoting works
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      )}

      {wizardStep === "items" && (
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Quote Line Items</CardTitle>
            <CardDescription>
              We've added typical {tradeType || "trade"} items — customise as needed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 rounded-lg border border-border p-3">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <div className="w-20">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                        className="text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="Unit price"
                        value={item.unit_price}
                        onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-1 w-full" onClick={addItem}>
              <Plus className="h-3.5 w-3.5" /> Add Item
            </Button>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Payment terms, warranty info, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {wizardStep === "review" && (
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(160,100%,45%)] flex items-center justify-center mb-2">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle>Looking Good!</CardTitle>
            <CardDescription>Here's your first quote preview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium text-foreground">{customer.name}</p>
                <p className="text-sm text-muted-foreground">{customer.email}</p>
              </div>
              <div className="border-t border-border pt-3 space-y-1.5">
                {items.filter((i) => i.description.trim()).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {item.description} <span className="text-muted-foreground">×{item.quantity}</span>
                    </span>
                    <span className="font-medium text-foreground">
                      {(item.quantity * item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold text-foreground">
                <span>Total</span>
                <span className="text-primary">
                  {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>You can edit, send, or convert this to an invoice later</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={() => {
            if (wizardStep === "customer") onBack();
            else if (wizardStep === "items") setWizardStep("customer");
            else setWizardStep("items");
          }}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
            Skip for now
          </Button>
          {wizardStep === "customer" && (
            <Button onClick={() => setWizardStep("items")} disabled={!customer.name.trim()} className="gap-2">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {wizardStep === "items" && (
            <Button onClick={() => setWizardStep("review")} disabled={items.filter((i) => i.description.trim()).length === 0} className="gap-2">
              Review <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {wizardStep === "review" && (
            <Button onClick={handleCreate} disabled={submitting} className="gap-2">
              {submitting ? "Creating..." : "Create Quote"} <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
