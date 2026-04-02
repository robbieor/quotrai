import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, X, MessageSquare } from "lucide-react";
import { ForemanAvatar } from "@/components/shared/ForemanAvatar";

const DISMISSED_KEY = "foreman_exit_intent_dismissed";

interface ExitIntentPopupProps {
  onTryDemo: () => void;
}

export function ExitIntentPopup({ onTryDemo }: ExitIntentPopupProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    let scrollTriggered = false;
    const handleScroll = () => {
      const scrollPercent = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
      if (scrollPercent > 0.7 && !scrollTriggered) {
        scrollTriggered = true;
        // Delay showing by 2 seconds after scroll threshold
        setTimeout(() => {
          if (!sessionStorage.getItem(DISMISSED_KEY)) {
            setShow(true);
          }
        }, 2000);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem(DISMISSED_KEY, "true");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-40 max-w-sm animate-fade-up">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-5 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 text-muted-foreground"
          onClick={dismiss}
        >
          <X className="h-3.5 w-3.5" />
        </Button>

        <div className="flex items-start gap-3 mb-4">
          <ForemanAvatar size="md" />
          <div>
            <p className="font-semibold text-sm text-foreground">Before you go...</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Want to see how George can run your business?
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              dismiss();
              onTryDemo();
            }}
            className="w-full gap-2"
            size="sm"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat with George now
          </Button>
          <Link to="/signup" onClick={dismiss}>
            <Button variant="outline" className="w-full gap-2" size="sm">
              Start Free Trial
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
