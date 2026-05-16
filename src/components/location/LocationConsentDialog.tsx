import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface Props {
  open: boolean;
  onGrant: () => void;
  onDecline: () => void;
}

export function LocationConsentDialog({ open, onGrant, onDecline }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDecline(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Use your location?
          </DialogTitle>
          <DialogDescription className="pt-2 text-foreground/80">
            revamo uses your location to:
          </DialogDescription>
        </DialogHeader>

        <ul className="text-sm space-y-2 text-muted-foreground list-disc pl-5">
          <li>Verify clock-ins and clock-outs at job sites</li>
          <li>Auto-track business mileage between jobs</li>
        </ul>

        <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">
          Raw GPS pings are deleted after 90 days. You can turn this off any
          time in <span className="font-medium text-foreground">Settings → Privacy</span>.
          See our{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" className="text-primary underline">
            Privacy Policy
          </a>.
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onDecline}>Not now</Button>
          <Button onClick={onGrant}>Allow location</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
