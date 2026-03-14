

## What Happened

You're right — this was always a Lovable project. Here's the sequence:

1. You built Quotr in Lovable with Tailwind/shadcn, 40+ pages, ROI calculator, George AI, etc.
2. You connected GitHub for bidirectional sync
3. You pulled the repo into Replit and Google Antigravity for testing
4. One of those tools restructured the project — added `client/` subdirectory, replaced Tailwind with CSS Modules, added Express/Drizzle backend, `.replit` config, etc.
5. Those changes pushed back to GitHub, which synced back to Lovable via bidirectional sync, overwriting your working frontend

The Replit tool essentially replaced your entire frontend architecture. The `.replit` file, `server/` directory with Express, `drizzle.config.ts`, `shared/schema.ts`, and the `client/` subdirectory structure are all Replit artifacts.

## Recovery Plan

Your original working code still exists intact in the **Remix of Quotr** project. The plan is to copy all frontend files from there back into this project, removing the Replit artifacts.

### Phase 1 — Replace root config files
- Copy `package.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `components.json`, `index.html`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` from Remix project
- Remove Replit-specific files: `.replit`, `replit.md`, `AGENTS.md`, `drizzle.config.ts`, `DESIGN_SYSTEM.md`, `design_guidelines.md`, `quotr.db`

### Phase 2 — Restore `src/` directory
Copy from Remix project:
- `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/App.css`
- All 39 page files from `src/pages/`
- All 25+ component directories from `src/components/` (ui/, landing/, george/, invoices/, jobs/, layout/, auth/, etc.)
- All 50+ hooks from `src/hooks/`
- Contexts, utils, config, constants, lib, assets
- Keep existing `src/integrations/supabase/` (auto-generated for this project's Cloud connection)

### Phase 3 — Remove Replit artifacts
- Delete `client/` directory entirely (Replit's restructured frontend)
- Delete `server/` directory (Express backend — not needed, backend is Lovable Cloud)
- Delete `shared/` directory (Drizzle schema)
- Delete `migrations/` directory (Drizzle migrations)
- Delete `scripts/` directory

### Phase 4 — Restore edge functions and public assets
- Copy `public/` assets from Remix project
- Reconcile `supabase/functions/` — keep current `foreman-chat`, `stripe-webhook`, `send-email`; check Remix project for any additional functions

### Phase 5 — Verify and fix Supabase integration
- The Remix project's `src/integrations/supabase/types.ts` may differ from this project's auto-generated one — this project's version is the correct one since it reflects the current Cloud database
- Update any hook imports that reference Supabase types to match current schema
- Verify auth flow works with Lovable Cloud

### Estimated scope
- ~200+ files to copy from Remix project
- ~50+ files to delete (Replit artifacts)
- ~10 config files to replace
- This is a large operation but straightforward since the source code is intact in the other project

### Risk
- The Remix project may reference Supabase tables/types that don't exist in this project's Cloud database — will need to reconcile
- Some hooks or components may need minor updates if the database schema diverged

