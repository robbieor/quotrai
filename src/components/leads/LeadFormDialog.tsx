import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RewriteButton } from "@/components/ai/RewriteButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Lead, LeadInsert } from "@/hooks/useLeads";

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onSubmit: (values: LeadInsert) => void;
  isLoading: boolean;
}

export function LeadFormDialog({ open, onOpenChange, lead, onSubmit, isLoading }: LeadFormDialogProps) {
  const [name, setName] = useState(lead?.name || "");
  const [email, setEmail] = useState(lead?.email || "");
  const [phone, setPhone] = useState(lead?.phone || "");
  const [address, setAddress] = useState(lead?.address || "");
  const [source, setSource] = useState(lead?.source || "manual");
  const [description, setDescription] = useState(lead?.description || "");
  const [priority, setPriority] = useState(lead?.priority || "medium");
  const [estimatedValue, setEstimatedValue] = useState(lead?.estimated_value?.toString() || "");
  const [followUpDate, setFollowUpDate] = useState(lead?.follow_up_date || "");
  const [notes, setNotes] = useState(lead?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      source,
      description: description || null,
      status: lead?.status || "new",
      priority,
      estimated_value: estimatedValue ? Number(estimatedValue) : null,
      customer_id: lead?.customer_id || null,
      job_id: lead?.job_id || null,
      quote_id: lead?.quote_id || null,
      notes: notes || null,
      follow_up_date: followUpDate || null,
    });
  };

  // Reset form when dialog opens with new data
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName(lead?.name || "");
      setEmail(lead?.email || "");
      setPhone(lead?.phone || "");
      setAddress(lead?.address || "");
      setSource(lead?.source || "manual");
      setDescription(lead?.description || "");
      setPriority(lead?.priority || "medium");
      setEstimatedValue(lead?.estimated_value?.toString() || "");
      setFollowUpDate(lead?.follow_up_date || "");
      setNotes(lead?.notes || "");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit Lead" : "New Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Est. Value</Label>
              <Input id="value" type="number" step="0.01" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="followUp">Follow-up Date</Label>
            <Input id="followUp" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "Saving..." : lead ? "Update" : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
