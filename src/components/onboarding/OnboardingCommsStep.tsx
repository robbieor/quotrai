import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, FileText, Clock, Truck, MessageSquare, Star, Receipt, CreditCard, ShieldCheck } from "lucide-react";

interface CommsPrefs {
  visit_reminder_enabled: boolean;
  quote_followup_enabled: boolean;
  job_complete_enabled: boolean;
  on_my_way_enabled: boolean;
  enquiry_ack_enabled: boolean;
  review_request_enabled: boolean;
  invoice_reminder_enabled: boolean;
  payment_receipt_enabled: boolean;
}

interface OnboardingCommsStepProps {
  prefs: CommsPrefs;
  onChange: (prefs: CommsPrefs) => void;
}

const COMM_OPTIONS: { key: keyof CommsPrefs; icon: React.ReactNode; label: string; desc: string }[] = [
  { key: "visit_reminder_enabled", icon: <Bell className="h-4 w-4" />, label: "Visit Reminders", desc: "Remind clients about upcoming appointments" },
  { key: "quote_followup_enabled", icon: <FileText className="h-4 w-4" />, label: "Quote Follow-ups", desc: "Follow up on unanswered quotes" },
  { key: "job_complete_enabled", icon: <Clock className="h-4 w-4" />, label: "Job Complete", desc: "Notify when a job is done" },
  { key: "on_my_way_enabled", icon: <Truck className="h-4 w-4" />, label: "On My Way", desc: "Let clients know you're heading over" },
  { key: "enquiry_ack_enabled", icon: <MessageSquare className="h-4 w-4" />, label: "Enquiry Ack", desc: "Acknowledge new enquiries" },
  { key: "review_request_enabled", icon: <Star className="h-4 w-4" />, label: "Review Requests", desc: "Ask for reviews after jobs" },
  { key: "invoice_reminder_enabled", icon: <Receipt className="h-4 w-4" />, label: "Invoice Reminders", desc: "Remind about unpaid invoices" },
  { key: "payment_receipt_enabled", icon: <CreditCard className="h-4 w-4" />, label: "Payment Receipts", desc: "Confirm when payments are recorded" },
];

export function OnboardingCommsStep({ prefs, onChange }: OnboardingCommsStepProps) {
  const toggle = (key: keyof CommsPrefs) => {
    onChange({ ...prefs, [key]: !prefs[key] });
  };

  return (
    <div className="animate-fade-up space-y-3">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          Foreman never sends emails automatically. You always preview and confirm before anything goes out.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {COMM_OPTIONS.map(({ key, icon, label, desc }) => (
          <div key={key} className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <div className="text-muted-foreground">{icon}</div>
            <div className="flex-1 min-w-0">
              <Label className="font-medium text-sm text-foreground">{label}</Label>
              <p className="text-xs text-muted-foreground truncate">{desc}</p>
            </div>
            <Switch checked={prefs[key]} onCheckedChange={() => toggle(key)} />
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center pt-1">
        You can change these anytime in Settings → Comms
      </p>
    </div>
  );
}
