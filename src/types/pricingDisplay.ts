export type PricingDisplayMode = 'detailed' | 'grouped' | 'summary' | 'items_only';
export type LineGroup = 'Materials' | 'Labour' | 'Other';

export const LINE_GROUPS: LineGroup[] = ['Materials', 'Labour', 'Other'];

export const DISPLAY_MODE_LABELS: Record<PricingDisplayMode, { label: string; description: string }> = {
  detailed: { label: 'Detailed', description: 'Full itemised pricing' },
  grouped: { label: 'Grouped', description: 'Group totals only' },
  summary: { label: 'Summary', description: 'Single lump sum' },
  items_only: { label: 'Items Only', description: 'Items shown, prices hidden' },
};
