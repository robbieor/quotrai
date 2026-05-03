import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommsSettings } from "@/hooks/useCommsSettings";
import { CommsAuditLog } from "./CommsAuditLog";
import { toast } from "sonner";
import {
  Bell,
  Clock,
  FileText,
  MessageSquare,
  Star,
  Truck,
  Receipt,
  CreditCard,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

interface CommToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  children?: React.ReactNode;
}

function CommToggle({ icon, label, description, checked, onCheckedChange, children }: CommToggleProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <Label className="font-medium text-foreground">{label}</Label>
          <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        {checked && children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}

export function CommunicationsSettings() {
  const { settings, isLoading, updateSettings } = useCommsSettings();

  const handleToggle = (field: string, value: boolean) => {
    updateSettings.mutate({ [field]: value } as any, {
      onSuccess: () => toast.success("Preference updated"),
      onError: () => toast.error("Failed to update"),
    });
  };

  const handleNumber = (field: string, value: number) => {
    if (value < 1) return;
    updateSettings.mutate({ [field]: value } as any, {
      onError: () => toast.error("Failed to update"),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
        <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Manual-send architecture</p>
          <p className="text-sm text-muted-foreground">
            Revamo never sends emails to your clients automatically. Enabling a category below allows you to manually send those emails with a preview and confirmation step.
          </p>
        </div>
      </div>

      {/* Global confirmation gate */}
      <Card>
        <CardContent className="pt-6">
          <CommToggle
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Require confirmation before any client communication"
            description="When enabled, every outbound email (manual or scheduled) requires an explicit confirmation step before sending. Default: ON."
            checked={settings.require_confirmation_all_comms}
            onCheckedChange={(v) => handleToggle("require_confirmation_all_comms", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client Communications</CardTitle>
          <CardDescription>Choose which types of emails you can send to clients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CommToggle
            icon={<Bell className="h-5 w-5" />}
            label="Visit Reminders"
            description="Remind clients about upcoming appointments"
            checked={settings.visit_reminder_enabled}
            onCheckedChange={(v) => handleToggle("visit_reminder_enabled", v)}
          >
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Send</Label>
              <Input
                type="number"
                className="w-16 h-8 text-sm"
                value={settings.visit_reminder_hours}
                onChange={(e) => handleNumber("visit_reminder_hours", parseInt(e.target.value))}
                min={1}
              />
              <Label className="text-xs text-muted-foreground whitespace-nowrap">hours before</Label>
            </div>
          </CommToggle>

          <CommToggle
            icon={<FileText className="h-5 w-5" />}
            label="Quote Follow-ups"
            description="Follow up on quotes that haven't been responded to"
            checked={settings.quote_followup_enabled}
            onCheckedChange={(v) => handleToggle("quote_followup_enabled", v)}
          >
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Follow up after</Label>
              <Input
                type="number"
                className="w-16 h-8 text-sm"
                value={settings.quote_followup_days}
                onChange={(e) => handleNumber("quote_followup_days", parseInt(e.target.value))}
                min={1}
              />
              <Label className="text-xs text-muted-foreground whitespace-nowrap">days</Label>
            </div>
          </CommToggle>

          <CommToggle
            icon={<Clock className="h-5 w-5" />}
            label="Job Completion Notifications"
            description="Notify clients when their job is marked as complete"
            checked={settings.job_complete_enabled}
            onCheckedChange={(v) => handleToggle("job_complete_enabled", v)}
          >
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Send</Label>
              <Input
                type="number"
                className="w-16 h-8 text-sm"
                value={settings.job_complete_hours}
                onChange={(e) => handleNumber("job_complete_hours", parseInt(e.target.value))}
                min={1}
              />
              <Label className="text-xs text-muted-foreground whitespace-nowrap">hours after completion</Label>
            </div>
          </CommToggle>

          <CommToggle
            icon={<Truck className="h-5 w-5" />}
            label="On My Way Notifications"
            description="Let clients know when you're heading to their location"
            checked={settings.on_my_way_enabled}
            onCheckedChange={(v) => handleToggle("on_my_way_enabled", v)}
          />

          <CommToggle
            icon={<MessageSquare className="h-5 w-5" />}
            label="Enquiry Acknowledgement"
            description="Send automatic acknowledgement when a new enquiry comes in"
            checked={settings.enquiry_ack_enabled ?? false}
            onCheckedChange={(v) => handleToggle("enquiry_ack_enabled", v)}
          />

          <CommToggle
            icon={<Star className="h-5 w-5" />}
            label="Review Requests"
            description="Ask clients for a review after job completion"
            checked={settings.review_request_enabled ?? false}
            onCheckedChange={(v) => handleToggle("review_request_enabled", v)}
          >
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Send</Label>
              <Input
                type="number"
                className="w-16 h-8 text-sm"
                value={settings.review_request_hours ?? 24}
                onChange={(e) => handleNumber("review_request_hours", parseInt(e.target.value))}
                min={1}
              />
              <Label className="text-xs text-muted-foreground whitespace-nowrap">hours after completion</Label>
            </div>
          </CommToggle>

          <CommToggle
            icon={<Receipt className="h-5 w-5" />}
            label="Invoice Payment Reminders"
            description="Remind clients about unpaid invoices"
            checked={settings.invoice_reminder_enabled}
            onCheckedChange={(v) => handleToggle("invoice_reminder_enabled", v)}
          >
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Remind after</Label>
              <Input
                type="number"
                className="w-16 h-8 text-sm"
                value={settings.invoice_reminder_days}
                onChange={(e) => handleNumber("invoice_reminder_days", parseInt(e.target.value))}
                min={1}
              />
              <Label className="text-xs text-muted-foreground whitespace-nowrap">days overdue</Label>
            </div>
          </CommToggle>

          <CommToggle
            icon={<CreditCard className="h-5 w-5" />}
            label="Payment Receipts"
            description="Send a receipt confirmation when a payment is recorded"
            checked={settings.payment_receipt_enabled}
            onCheckedChange={(v) => handleToggle("payment_receipt_enabled", v)}
          />
        </CardContent>
      </Card>

      <CommsAuditLog />
    </div>
  );
}
