

# Proactive AI Nudges on George Screen Open

## What This Does

When the user opens the George AI screen, instead of just showing static cards and a generic greeting, the system runs a backend analysis that generates **personalized, data-driven nudges** — natural language insights like *"That quote for Murphy's kitchen has been sitting 11 days. Usually your win rate drops after 7."*

These appear as dismissable nudge cards above the chat, making George feel like he's already been watching the business.

## Approach

### 1. New edge function: `generate-nudges`

A lightweight edge function that queries the user's business data and uses Lovable AI (Gemini Flash) to generate 2–3 contextual nudges in George's voice.

**Data gathered:**
- Overdue invoices (amount, days overdue, customer name)
- Aging quotes (days since sent, customer name, amount)
- Scheduling conflicts (overlapping jobs, understaffed days)
- Recent patterns (win rate trends, payment velocity)

**AI prompt:** Pass the raw data snapshot to Gemini Flash with instructions to produce 2–3 short, specific nudges in George's Irish foreman tone — referencing actual names, amounts, and dates.

**Response format:**
```json
{
  "nudges": [
    {
      "id": "nudge-1",
      "text": "Morning. You've got 3 invoices overdue by more than 14 days — that's €8,400 sitting out there. Want me to draft reminders?",
      "action": "get_overdue_invoices",
      "action_label": "Chase them",
      "urgency": "high"
    }
  ]
}
```

### 2. Frontend: Nudge cards in GeorgeWelcome

- On mount, call `generate-nudges` (with a 60-second stale cache so it doesn't fire on every tab switch)
- Render nudges as dismissable cards between the greeting and quick actions
- Each nudge has a tap-to-act button that triggers the relevant George action
- Dismissed nudges stored in localStorage by date so they don't reappear

### 3. Styling

- Subtle left-border accent (red for high urgency, amber for medium, blue for low)
- George's avatar inline with the nudge text for personality
- Tap action routes through existing `onQuickAction` handler

## Files

| Action | File |
|--------|------|
| Create | `supabase/functions/generate-nudges/index.ts` — query data, call AI, return nudges |
| Edit | `src/components/george/GeorgeWelcome.tsx` — fetch and render nudge cards |

No database changes needed. Uses existing tables (invoices, quotes, jobs, team_members) for data queries.

