import { useState } from "react";
import { X, BookOpen, Globe, Upload, Package, Sparkles, ArrowRight, CheckCircle2, Receipt, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: BookOpen,
    title: "What is the Price Book?",
    body: "Your Price Book is a centralised library of products, materials, and services from your suppliers. It feeds directly into quotes, invoices, and job costing — so pricing is always accurate and consistent.",
  },
  {
    icon: Globe,
    title: "Import from any supplier website",
    body: "Use 'Import from Any Website' to paste a supplier domain. Revamo's AI scans the site, groups products into families, and lets you pick exactly what to import. Works with any supplier — no special setup needed.",
  },
  {
    icon: Upload,
    title: "Upload a CSV price list",
    body: "Got a spreadsheet from your supplier? Upload it as a CSV. Map your columns to Revamo's fields and import hundreds of products in seconds.",
  },
  {
    icon: Package,
    title: "Add items manually",
    body: "Create a manual catalog for custom services, labour rates, or products you price yourself. Add items one by one with your own cost and sell prices.",
  },
  {
    icon: Sparkles,
    title: "Smart pricing & margins",
    body: "Set discount and markup percentages per supplier in Supplier Settings. Revamo automatically calculates your sell price from the supplier's list price — keeping your margins consistent across every quote.",
  },
  {
    icon: Receipt,
    title: "Use in quotes & invoices",
    body: "When creating a quote or invoice, pull items directly from your Price Book. Choose whether to show detailed line items or a single bundled price to the customer — you control what they see.",
  },
  {
    icon: FileText,
    title: "Link to templates",
    body: "Build job templates with Price Book items pre-attached. When Revamo AI creates a job from a template, it automatically includes the right materials at the right prices.",
  },
  {
    icon: BarChart3,
    title: "Compare prices across suppliers",
    body: "Add products from multiple suppliers to see side-by-side pricing. Revamo matches identical products using manufacturer part numbers and suggests the cheapest option — saving you money on every job.",
  },
];

export function PricebookOnboarding() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("pricebook_onboarding_dismissed") === "true"; } catch { return false; }
  });
  const [currentStep, setCurrentStep] = useState(0);

  if (dismissed) return null;

  const step = STEPS[currentStep];
  const Icon = step.icon;

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem("pricebook_onboarding_dismissed", "true"); } catch {}
  };

  return (
    <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss guide"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 sm:gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <p className="font-semibold text-sm">{step.title}</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.body}</p>
        </div>
      </div>

      {/* Progress + navigation */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-primary/10">
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep ? "w-6 bg-primary" : "w-1.5 bg-primary/20 hover:bg-primary/40"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{currentStep + 1}/{STEPS.length}</span>
          {currentStep < STEPS.length - 1 ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCurrentStep(currentStep + 1)}>
              Next <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleDismiss}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Got it
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
