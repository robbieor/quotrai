import { useReadOnly } from "@/hooks/useReadOnly";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReadOnlyGuardProps {
  children: React.ReactNode;
  /** Optional custom tooltip text */
  message?: string;
}

/**
 * Wraps mutation triggers (buttons, forms).
 * When the account is in read-only mode (trial expired, no subscription),
 * disables children and shows a tooltip prompting subscription.
 */
export function ReadOnlyGuard({ children, message = "Subscribe to unlock" }: ReadOnlyGuardProps) {
  const isReadOnly = useReadOnly();

  if (!isReadOnly) return <>{children}</>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="opacity-50 pointer-events-none cursor-not-allowed inline-flex">
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
