

## The Core Problem

Your app is a **full-stack Express application** (10,600 lines of server routes) that was built to run on Replit. Lovable's preview environment **only runs the Vite client dev server** — it cannot run your Express backend. The `/api/auth/me` calls are returning 500 because the Vite proxy forwards to `localhost:5000` where no Express server exists.

**This is not a regression or data loss** — it's an architecture mismatch between where this app was built (Replit with Node.js runtime) and Lovable (client-only preview + Supabase backend).

## What "Connect to Lovable Cloud" Actually Means

Lovable Cloud provides: **Supabase database, Supabase Auth, Edge Functions, Storage**. It does NOT provide a persistent Express/Node.js server.

To make this app work in Lovable, the entire backend needs to be migrated:

| Current (Express/Replit) | Target (Lovable Cloud) |
|---|---|
| Express session auth (bcrypt, cookies) | Supabase Auth (email/password) |
| Drizzle ORM queries in Express routes | Supabase client queries from React |
| Express API endpoints (10,600 lines) | Direct Supabase queries + Edge Functions |
| `connect-pg-simple` sessions | Supabase JWT tokens |
| Server-side org middleware | RLS policies + client-side role checks |

## Proposed Migration Strategy (Phased)

This is a large migration. I recommend doing it in phases, each leaving the app functional:

### Phase 1 — Auth + Session (Highest Priority)
- Switch from Express session auth to Supabase Auth (email/password sign-up/login)
- Update `AuthContext.tsx` to use Supabase client instead of `/api/auth/*` endpoints
- Create database migration to align `users` table with Supabase Auth `auth.users`
- Add RLS policies to all tables

### Phase 2 — Core Data Reads (Dashboard, Clients, Invoices)
- Replace `/api/clients`, `/api/invoices`, `/api/dashboard` fetch calls with direct Supabase queries
- Move org-scoping from Express middleware to RLS policies

### Phase 3 — Core Data Writes (Create/Update/Delete)
- Replace POST/PUT/DELETE API calls with Supabase `insert`/`update`/`delete`
- Move complex business logic (invoice numbering, org codes) to Edge Functions

### Phase 4 — Advanced Features
- Migrate AI agent, Stripe webhooks, email sending, file uploads to Edge Functions
- Migrate receipt scanning, time tracking, team features

## Scope Warning

This is a **significant rewrite** — the Express backend has 10,600 lines of business logic. A full migration will take many iterations. Phase 1 alone will get the app loading and authenticating in Lovable's preview.

## Recommended Next Step

Start with **Phase 1 only**: migrate authentication to Supabase Auth so you can log in and see your dashboard in the Lovable preview. This involves:

1. Database migration: create/align tables with RLS policies
2. Update `AuthContext.tsx` to use Supabase Auth
3. Update Login/SignUp pages to use Supabase Auth
4. Replace API data fetches with direct Supabase queries for the dashboard
5. Remove the Vite proxy (no longer needed)

