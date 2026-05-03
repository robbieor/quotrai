import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Button } from "@/components/ui/button";
import { X, Download, Share } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function PwaInstallBanner() {
  const { canShowBanner, install, dismiss, isIos } = usePwaInstall();
  const isMobile = useIsMobile();

  // Only show on mobile devices
  if (!canShowBanner || !isMobile) return null;

  return (
    <div className="fixed bottom-14 left-0 right-0 z-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-card shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Install revamo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isIos
                ? "Tap Share then \"Add to Home Screen\" for the full app experience."
                : "Add revamo to your home screen for quick access — works offline too."}
            </p>
            {!isIos && (
              <Button size="sm" className="mt-2.5 gap-1.5" onClick={install}>
                <Download className="h-3.5 w-3.5" />
                Install App
              </Button>
            )}
            {isIos && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <Share className="h-3.5 w-3.5" />
                <span>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground"
            onClick={dismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
