import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useIsNative, openExternalUrl } from "@/hooks/useIsNative";

const WEB_BILLING_URL = "https://foreman.ie/select-plan";

export function ReadOnlyBanner() {
  const navigate = useNavigate();
  const isReadOnly = useReadOnly();
  const isNative = useIsNative();

  if (!isReadOnly) return null;

  const handleChoosePlan = () => {
    if (isNative) {
      openExternalUrl(WEB_BILLING_URL);
    } else {
      navigate("/select-plan");
    }
  };

  return (
    <div className="w-full bg-destructive text-destructive-foreground px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-2 text-sm font-medium z-30">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>Your trial has ended. Your data is safe — subscribe to regain full access.</span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="gap-1 shrink-0"
        onClick={handleChoosePlan}
      >
        Choose Plan <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
