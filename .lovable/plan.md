

# Foreman AI — Mobile Sidebar Fix + Trade-Aware Consultation Mode

## Two Problems

### 1. Mobile Sidebar Squashed
The screenshot shows the conversations sidebar overlapping the main content with text cramped. Issues:
- The sidebar takes `w-[85vw] max-w-xs` (max 320px) which is fine, but the conversation items and the "Projects" section at the bottom consume too much vertical space
- The sidebar doesn't have enough padding and the conversation row has no truncation on long titles like "Give me a summary of my week ahead" — it wraps and pushes content
- The "Projects" collapsible section at the bottom wastes space for most users who won't use it

### 2. Trade-Specific Consultation (the "Manus AI" experience)
Currently, `george-chat` system prompt says "trade-specific knowledge" but provides zero actual trade context. The user's `trade_type` from their profile is available but never injected into the AI prompt. The AI has no grounding in:
- Trade regulations (BS 7671 for electricians, Gas Safe for plumbers, etc.)
- Pricing benchmarks for the user's region
- Common job scopes and materials
- Compliance and certification requirements

**The fix**: Inject the user's `trade_type` into the system prompt with deep, trade-specific context so every response is contextually relevant to their trade. This transforms Foreman AI from a generic business assistant into a **trade-aware operating system**.

---

## Fix Plan

### Fix 1: Mobile Sidebar Layout
**Edit: `src/components/george/GeorgeSidebar.tsx`**
- Truncate conversation titles to single line with `truncate` class
- Remove the "Projects" collapsible section on mobile (it adds complexity users don't need in the AI chat sidebar)
- Increase conversation item touch targets to 48px minimum
- Add better spacing between header, search, and conversation list
- Make the conversation item row more compact: icon + truncated title + action menu in one line

### Fix 2: Trade-Aware System Prompt
**Edit: `supabase/functions/george-chat/index.ts`**
- The profile query already fetches `full_name` — extend it to also fetch `trade_type`
- Build a `tradeContext` string based on the user's trade type with:
  - Industry-specific regulations and standards
  - Common job types and pricing structures
  - Materials and supplier knowledge
  - Certification requirements
  - Regional compliance (Ireland/UK focused)
- Inject this into the system prompt so every AI response is trade-contextualized

Trade context map (examples):
- **Electrician**: BS 7671, RECI (Ireland), NICEIC, Safe Electric, EICRs, CU upgrades, EV charger regs, Part P
- **Plumber**: Gas Safe, RGII, unvented cylinders, water regs, boiler servicing standards
- **HVAC**: F-Gas, refrigerant handling, BER ratings, heat pump installation regs
- **General/Builder**: Building regs, planning permission awareness, structural standards

### Fix 3: Also Update `foreman-chat/index.ts`
This simpler edge function also serves as a chat endpoint. Apply the same trade-context enhancement here so both paths are consistent. Currently it has no profile/trade context at all — add a profile fetch and trade prompt injection.

---

## File Summary

| Action | File | Change |
|--------|------|--------|
| Edit | `src/components/george/GeorgeSidebar.tsx` | Mobile: compact conversation rows, truncate titles, remove Projects on mobile, better touch targets |
| Edit | `supabase/functions/george-chat/index.ts` | Fetch `trade_type` from profile, inject trade-specific context into system prompt |
| Edit | `supabase/functions/foreman-chat/index.ts` | Same trade-context injection for consistency |

No database changes. No new files. The trade knowledge is embedded in the system prompt — no external API or additional LLM needed. The existing Lovable AI gateway (Gemini 3 Flash) already has strong domain knowledge about trade regulations; it just needs to be told what trade the user operates in.

