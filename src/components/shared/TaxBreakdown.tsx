import { calculateTotals, type LineForTotals } from "@/utils/vatRates";

interface TaxBreakdownProps {
  items: LineForTotals[];
  /** Fallback rate when items don't carry per-line tax_rate (legacy docs). */
  fallbackRate?: number;
  /** Fallback tax amount for legacy docs. */
  fallbackTaxAmount?: number;
  formatCurrency: (n: number) => string;
  taxLabel?: string;
}

/**
 * Renders a tax summary. If lines have a single rate, renders one
 * "Tax (X%)" row. If mixed, renders per-rate breakdown rows.
 */
export function TaxBreakdown({
  items,
  fallbackRate,
  fallbackTaxAmount,
  formatCurrency,
  taxLabel = "Tax",
}: TaxBreakdownProps) {
  const hasPerLineRates = items.some(
    (i) => i.tax_rate !== undefined && i.tax_rate !== null
  );

  if (!hasPerLineRates) {
    const rate = fallbackRate ?? 0;
    const amount = fallbackTaxAmount ?? 0;
    if (rate <= 0 && amount <= 0) return null;
    return (
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          {taxLabel} ({Number(rate)}%)
        </span>
        <span>{formatCurrency(amount)}</span>
      </div>
    );
  }

  const { breakdown, uniformRate, taxAmount } = calculateTotals(items);
  const visible = breakdown.filter((b) => b.tax > 0 || b.rate > 0);

  if (uniformRate !== null) {
    if (taxAmount <= 0 && uniformRate <= 0) return null;
    return (
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          {taxLabel} ({uniformRate}%)
        </span>
        <span>{formatCurrency(taxAmount)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {visible.map((b) => (
        <div key={b.rate} className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {taxLabel} ({b.rate}%) on {formatCurrency(b.base)}
          </span>
          <span>{formatCurrency(b.tax)}</span>
        </div>
      ))}
      <div className="flex justify-between text-sm font-medium">
        <span className="text-muted-foreground">Total {taxLabel.toLowerCase()}</span>
        <span>{formatCurrency(taxAmount)}</span>
      </div>
    </div>
  );
}
