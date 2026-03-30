

# Foreman Product Audit — Brutally Honest Assessment

---

## 1. WHAT WE HAVE TODAY

**What it currently feels like:** A well-structured CRUD management tool with an AI chatbot bolted onto the side. It's closer to "Jobber with an AI tab" than "an AI operating system for field service."

**Strengths:**
- Sidebar navigation is well-organized with outcome-oriented naming (Revenue, Job Intelligence, Client Intelligence) — this is above average
- Dashboard has genuine operational intelligence: ControlHeader with AI recommendations, ActionPanel with severity-ranked alerts, KPI strip with drill-through — this is real product thinking
- Data model is solid: teams, seats, roles, RLS — production-grade multi-tenant architecture
- Foreman AI has a meaningful foundation: structured action plans, confirmation gates, memory context, streaming SSE, photo quoting
- Currency localization, geo-IP detection, offline sync — these signal a serious product
- The landing page copy ("Talk to your business. It talks back.") is strong positioning

**What's already working well:**
- ControlHeader → ActionPanel → KPIStrip flow on the dashboard is genuinely useful
- InsightAlerts on individual pages (jobs, quotes) surface contextual intelligence
- The structured action plan system (intent detection → confirmation gate → execution) is architecturally sound
- Quick actions on the Foreman AI welcome screen that pull live data (overdue invoices, today's jobs) show real operational awareness

---

## 2. WHAT IT FEELS LIKE TO A USER

**First impression:** "This is a nicely built dashboard tool." Not "this is going to run my business."

**Where it feels AI-generated / template-based:**
- Jobs page: generic CRUD table with search/filter/status dropdown — identical to every SaaS template. The page title literally says "Manage and track all your jobs" which contradicts your own microcopy guidelines
- Quotes page: same pattern — table, search, filter, "+ New" button. No intelligence visible until you scroll
- Every data page follows the exact same layout: H1 → subtitle → KPI cards → search bar → table. This screams "template"
- The sidebar has 13+ nav items visible at once. No hierarchy, no progressive disclosure. A plumber seeing "AI Activity", "Price Book", "Templates", "Enquiries" on day one is overwhelmed
- Foreman AI is buried as one sidebar item among many, under its own "AI" section — completely contradicting the "AI operating system" positioning

**Where it feels premium / real:**
- Dashboard ControlHeader with real-time AI recommendations
- ActionPanel with severity-coded alerts and click-to-resolve
- The confirmation gate pattern in Foreman AI
- Landing page design and positioning copy

---

## 3. WHAT IS MISSING (CRITICAL GAPS)

### Planning
- **No "Today" view.** There is no single screen that answers "What do I need to do today?" The dashboard shows analytics. The calendar shows dates. Neither is a planning tool.
- **No weekly planning.** No way to see workload distribution, identify gaps, spot overbooked days, or plan the week ahead.
- **No morning routine.** The `EndOfDaySummary` exists but there's no equivalent "Start of Day" flow that walks the user through priorities.

### Command-driven workflows
- Foreman AI is a separate page (`/foreman-ai`) — a destination, not a layer. Users must leave their current context to use it.
- The quick action buttons dispatch messages to a chat interface. The response is text. There's no inline execution — "Create quote" takes you to a chat, not a quote builder.
- No command palette / keyboard shortcut (Cmd+K). No way to take action without navigating.
- Actions require multiple clicks: navigate to page → click "New" → fill form → save. The AI should collapse this.

### Foreman AI integration
- AI is a tab in the sidebar, not the operating layer. It should be everywhere — on the dashboard, on job detail sheets, on invoice pages.
- The "Ask AI" button on the ControlHeader navigates away to `/foreman-ai` instead of opening an inline panel.
- No contextual AI on any data page. When viewing a quote, there's no "What should I do with this?" prompt.
- The FloatingTomButton exists but it's just a link — not a command interface.

### Operational awareness
- No notification system that groups and prioritizes (the NotificationCenter exists but isn't prominently surfaced)
- No "attention required" state on sidebar items (e.g., red dot on Revenue when invoices are overdue)
- No proactive nudges — the system waits for you to visit pages

### Differentiation vs competitors
- Strip away the AI chat tab and this is Jobber. Same tables, same forms, same flows.
- The intelligence layer (InsightAlerts, ActionPanel) is genuinely differentiating but it's subtle and easy to miss
- No competitor has a command-driven interface — this is the opportunity, but it's not built yet

---

## 4. HOW TO MAKE THIS CATEGORY-LEADING

### UI/UX Changes (specific)

1. **Replace the Dashboard with a "Today" command center.** The current analytics-heavy dashboard should become a secondary "Reports" view. The default view should show:
   - Morning briefing (3 priority actions)
   - Today's schedule (timeline, not calendar grid)
   - Items needing attention (overdue, stuck, unanswered)
   - Inline action buttons that execute, not navigate

2. **Add a global command bar (Cmd+K / tap search).** This is the single highest-impact change. It should:
   - Open from anywhere with a keyboard shortcut or persistent search icon in the header
   - Accept natural language: "quote for Murphy 3500 bathroom refit"
   - Show recent commands, suggested actions, quick navigation
   - Execute inline — no page navigation required

3. **Make the FloatingTomButton a real AI panel.** Instead of navigating to `/foreman-ai`, clicking it should open a slide-over panel (like Intercom) that works from any page, with full context of where the user is.

4. **Add badge indicators to sidebar items.** Red dot or count badges showing: overdue invoices count on Revenue, stuck jobs on Job Intelligence, draft quotes on Quote Pipeline. This creates urgency without requiring page visits.

5. **Collapse the sidebar.** Reduce to 6-7 primary items. Move Templates, Price Book, AI Activity, Certificates into Settings or a "More" dropdown. First-time users should see: Today, Jobs, Quotes, Revenue, Foreman AI, Settings.

6. **Kill generic page subtitles.** "Manage and track all your jobs" → remove entirely. "Jobs" is enough. Use that space for contextual insight instead.

### Features to increase daily usage

1. **Morning Briefing Flow** — On first login each day, show a 3-card briefing: (1) your schedule, (2) money at risk, (3) recommended actions. Dismissible but persistent.

2. **Inline AI on every detail sheet** — JobDetailSheet, QuoteDetailSheet, InvoiceDetailSheet should all have a small AI section: "Foreman suggests: Follow up — this quote is 5 days old with no response."

3. **Smart notifications with actions** — "Invoice #247 is 14 days overdue (€2,400). [Send Reminder] [Call Client] [Escalate]" — not just "You have overdue invoices."

### What to remove or simplify
- Remove the `DemoOverlay` system — it adds complexity without value at this stage
- Remove `VoiceFallbackBanner` from the main AI page — voice is a nice-to-have, not core
- Remove investor deck routes from the main app (`/investor/*`) — these belong in a separate deployment
- Consolidate "AI Activity" into the Foreman AI page as a tab, not a separate sidebar item

### Reducing "AI-built SaaS template" feel
- Break the "H1 → KPI cards → search → table" pattern. Not every page needs KPI cards at the top.
- Add micro-interactions: status changes should animate, creating a quote should feel satisfying
- Use contextual empty states that guide action, not just "No data here"
- Make the AI visible on every page, not hidden in a tab

---

## 5. COMMAND LAYER DESIGN

### What the command bar should do
- **Global access**: Cmd+K on desktop, search icon in header on mobile
- **Natural language input**: "quote murphy bathroom 3500" → creates draft quote
- **Slash commands**: `/quote`, `/invoice`, `/job`, `/expense` for power users (you already have the parser)
- **Navigation**: "go to invoices", "show overdue", "open job 247"
- **Contextual**: On the Jobs page, typing "reschedule" should know you mean a job

### Example daily commands
- "What do I need to do today?"
- "Create quote for O'Brien, kitchen rewire, 4200"
- "Chase all overdue invoices"
- "Schedule Murphy job for Thursday 9am"
- "How much revenue this month?"
- "Mark job 312 as complete"

### Response structure
Responses should NOT be paragraphs. They should be:

```text
┌─────────────────────────────────────┐
│ ✅ Quote #Q-089 created             │
│ Client: Murphy Bros                 │
│ Amount: €3,500                      │
│                                     │
│ [Send to Client]  [Edit]  [View]    │
└─────────────────────────────────────┘
```

Action cards, not chat messages. The current `ActionOutputPreview` component is close — extend it.

### Surfacing across the app
- Global command bar in the header (always visible)
- Contextual "Ask Foreman" button on detail sheets
- Proactive suggestion chips on dashboard ("Chase €4,200 overdue" → one click)
- The current `ActionPanel` alerts should be clickable and execute directly

---

## 6. PLANNING SYSTEM

### "Today" view (replaces current dashboard as default)

```text
┌──────────────────────────────────────────┐
│  GOOD MORNING, SEAN          Mon 31 Mar  │
│                                          │
│  ⚠️  3 items need attention              │
│  • €4,200 overdue (Murphy Bros) [Chase]  │
│  • Quote #Q-082 unanswered 7d  [Follow]  │
│  • Job stuck: Bathroom refit    [Update]  │
│                                          │
│  📅 TODAY'S SCHEDULE                      │
│  09:00  Kitchen install — O'Brien         │
│  13:00  Site visit — Walsh (new)          │
│  15:30  Finish snag list — Murphy         │
│                                          │
│  💰 QUICK STATS                           │
│  Revenue MTD: €18,400  |  Jobs active: 7  │
│  Cash due this week: €6,200               │
└──────────────────────────────────────────┘
```

### Weekly planning
- A simple 5-day row showing job count per day, with color coding for overloaded days
- Drag to reschedule (you already have `DraggableJobCard`)
- AI suggestion: "Thursday is empty — move Walsh site visit from Friday?"

### Gap/overload detection
- Highlight days with 0 jobs (gap) or 4+ jobs (overload)
- Show estimated hours vs available hours
- Flag scheduling conflicts (overlapping times)

### AI-assisted planning
- "Plan my week" command → Foreman suggests optimal schedule based on job locations, priorities, deadlines
- "I have a cancellation Thursday morning" → suggests what to fill it with
- End-of-week review: "You completed 12 jobs worth €8,400 this week. 3 invoices still unsent."

---

## 7. PRIORITISED ROADMAP

### TOP 5 — Implement immediately (highest impact)

1. **Global command bar (Cmd+K)** — This is the single feature that transforms the product from "tool" to "operating system." Use the existing slash command parser as a foundation.

2. **"Today" view as default landing page** — Replace the analytics dashboard as the default. Show schedule + attention items + quick actions. Move current dashboard to a "Reports" or "Analytics" tab.

3. **Floating AI panel instead of AI page** — Convert FloatingTomButton to open a slide-over panel with the full Foreman AI chat, accessible from any page. Keep `/foreman-ai` as a full-page fallback.

4. **Sidebar badge indicators** — Add count/dot badges to sidebar items showing items needing attention. 30 minutes of work, massive impact on engagement.

5. **Kill template patterns on key pages** — Remove generic subtitles, remove KPI cards from Jobs/Quotes pages (they add noise), make the table the hero. Add one contextual AI insight at the top instead.

### NEXT 5 — After the above

6. **Contextual AI on detail sheets** — Add a small "Foreman suggests..." section to JobDetailSheet, QuoteDetailSheet, InvoiceDetailSheet with one actionable recommendation.

7. **Smart notification actions** — Make notifications actionable (send reminder, reschedule, mark complete) instead of just informational.

8. **Weekly planning view** — 5-day strip with job counts, drag-to-reschedule, overload warnings.

9. **Inline command execution** — When the command bar creates a quote, show the result inline with edit/send actions — don't navigate to the quotes page.

10. **Morning briefing flow** — On first daily login, show a focused 3-item briefing card that requires acknowledgment before showing the full UI.

### IGNORE FOR NOW

- Voice agent (ElevenLabs integration) — nice-to-have, not core
- Photo quoting — clever but not daily usage
- Investor deck pages — move to separate deployment
- Demo overlay system — remove
- Certificates module — niche, not differentiating
- Customer portal — important later, not now
- Xero/QuickBooks sync — integration, not differentiation

---

## BOTTOM LINE

You have a solid $5M product trying to be a $100M product. The gap is not features — you have too many. The gap is **interaction model**. Every competitor lets users fill forms and view tables. Nobody lets users *command* their business. The command bar + Today view + floating AI panel are the three changes that redefine what this product is. Everything else is polish.

