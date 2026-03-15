

## Emergency Unbrick + Parity Core

### Root Cause (confirmed)
The preview is blank because `@dnd-kit/sortable@^10.0.0` is incompatible with `@dnd-kit/core@^6.3.1`. This crashes Vite during module resolution. Everything else in the code is structurally sound — the stub for ElevenLabs works, routes are correct, VitePWA config is valid.

### Fix (single change)
**package.json line 21**: Change `"@dnd-kit/sortable": "^10.0.0"` to `"@dnd-kit/sortable": "^8.0.0"`

That one line is the entire build blocker. The stub import in VoiceAgentContext is already pointing to `./elevenlabs-stub` which exists and compiles fine.

### Parity Pass (same message, after unbrick)
Once the preview renders, apply sidebar grouping to match quotr.work:

**AppSidebar.tsx** — Replace flat "Main Menu" with grouped sections:
- **WORK**: Dashboard, Calendar, Jobs, Time Tracking
- **MONEY**: Invoices, Expenses  
- **PEOPLE**: Customers
- **INSIGHTS**: Foreman AI
- **MORE**: Templates

Remove Leads, Quotes, Reports from sidebar nav (accessible via other flows, not pinned in production).

### What stays unchanged
- App.tsx route wrapping (already correct with DashboardLayout + RoleGuard)
- All 39 edge functions (already restored)
- VoiceAgentContext stub pattern
- All other dependencies

