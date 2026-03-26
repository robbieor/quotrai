

## Add Template Pricing Step to Onboarding

### Problem
New users complete onboarding without setting up their templates/pricing. This means the AI agent (Foreman) has no templates to pull from for quick quoting, making the app feel empty on first use.

### Solution
Add a new **Step 5: "Set Your Prices"** to the onboarding modal (between current Step 4 "Preferences" and Step 5 "Comms", making it a 6-step flow). This step will:

1. **Auto-seed trade templates** — call `seed_team_templates` RPC based on the user's selected trade (from Step 2)
2. **Show a list of seeded templates** with editable labour rate per template
3. **Let users add a custom template** inline (name + labour rate)
4. Users can skip or continue — templates are already saved, this step just lets them review/tweak pricing

### UI Design
- Header: "Set Your Prices" with a price tag icon
- Subtitle: "Review your default templates and set your labour rates. Foreman uses these to create quotes instantly."
- A scrollable list of template cards showing: template name, default labour rate (editable inline input), estimated duration
- An "Add Template" button at the bottom for custom additions
- All changes save directly to the database as the user edits

### Files to Change

| File | Change |
|------|--------|
| `src/components/onboarding/OnboardingModal.tsx` | Increase `totalSteps` to 6. Add new Step 5 component. Move current Comms step to Step 6. After profile save in `handleComplete`, call `seed_team_templates` RPC before seeding sample data. In new Step 5, fetch and display seeded templates with editable labour rates. |
| `src/components/onboarding/OnboardingTemplatesStep.tsx` | **New file.** Standalone component showing the user's seeded templates with inline-editable labour rates and an "Add Template" button. Uses `useTemplates` hook to fetch and `supabase` to update rates. |

### Step Labels Update
`["Profile", "Trade", "Workflow", "Preferences", "Prices", "Comms"]`

### Flow
1. User completes Steps 1-4 (unchanged)
2. On entering Step 5, templates are auto-seeded for the user's trade (if not already seeded)
3. User sees their templates, adjusts labour rates, optionally adds custom templates
4. Step 6 is the existing Comms preferences step
5. "Get Started" completes onboarding as before

### Technical Details
- Template seeding uses the existing `seed_team_templates` RPC — no new migrations needed
- Labour rate updates use `supabase.from("templates").update({ labour_rate_default }).eq("id", templateId)`
- The step needs the `team_id` which is created during profile save — so we'll trigger `handleComplete`'s profile save logic earlier (on Step 4 → 5 transition) or seed templates eagerly using the team_id from the profile query
- Adding a new template inline will insert into `templates` table with the user's trade category

