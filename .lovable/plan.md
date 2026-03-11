

## Build Fix & Security Hardening Plan

### Root Cause of Build Errors

Lovable's build system expects a standard Vite project at the root level. This project is a **monorepo** with the client in `client/` and a custom Express server in `server/`. The build fails because:

1. **"Script not found: build:dev"** -- Lovable looks for a `build:dev` script in `package.json` which doesn't exist
2. **Missing modules** -- Dependencies like `react-router-dom`, `lucide-react` are in `client/package.json` but Lovable builds from root `package.json`
3. **Wrong entry point** -- `index.html` is at `client/index.html`, not root

### Architecture Reality Check

This app has a **10,600-line Express server** with custom auth, Drizzle ORM, bcrypt sessions, Stripe, AI integrations, and 1,544 lines of schema. Migrating the entire backend to Supabase Auth + Edge Functions would be a multi-week rewrite. 

The pragmatic path: **fix the build so Lovable can serve the frontend**, keep the Express server running separately, and address the security vulnerabilities now.

---

### Phase 1: Fix Build Errors (Immediate)

**1. Create root `index.html`** pointing to `client/src/main.tsx`

**2. Update root `package.json`:**
- Add `build:dev` script: `vite build --mode development`
- Add missing client dependencies: `react-router-dom`, `lucide-react`, `vite`
- Add `dev` script pointing to Vite

**3. Create root `vite.config.ts`** that resolves paths from the client directory

**4. Update root `tsconfig.json`** to include `client/src` with JSX support

---

### Phase 2: Security Vulnerabilities (Critical)

**Issues identified:**

1. **Exposed credentials in `.env`** -- Database password (`Nitabarimbing2025!`), service role key, and session secret are all visible. The `.env` file content was shown in the conversation. These credentials should be rotated immediately.

2. **Weak session secret** -- `quotr-local-dev-session-secret-2026` is a guessable string. Should be a cryptographically random value.

3. **CORS is too permissive** -- Only localhost origins are whitelisted but the production domain (`quotrai.lovable.app`) is not included, meaning the app may not work in production, while also not properly restricting origins.

4. **`isSuperAdmin` stored on user table** -- Line 25 of `shared/schema.ts` has `isSuperAdmin` directly on the users table. This is a privilege escalation risk -- roles should be in a separate table.

5. **No CSRF protection** -- Express sessions without CSRF tokens are vulnerable to cross-site request forgery.

6. **Password reset tokens in same table as users** -- `passwordResetToken` on the users table means any query that returns user data could leak reset tokens.

**Fixes:**
- Rotate all credentials (user action required)
- Add CORS entry for production domain
- Flag `isSuperAdmin` as a known risk (separate table migration is a larger effort)
- Add `sameSite: 'strict'` to session cookie config if not already set

---

### Phase 3: Supabase Alignment (Recommended)

The Lovable Cloud Supabase project (`leojhjynyxhpfyrbcabf`) already has a full schema with RLS policies, team memberships, and proper security. The Express server connects to a **different** Supabase project (`ulkidffzcqethfjvyxfu`) via direct PostgreSQL.

**Recommendation:** Gradually migrate the client to use the Lovable Cloud Supabase client directly for reads, while keeping the Express server for complex operations. This is not part of the immediate fix but the strategic direction.

---

### Files to Create/Modify

| File | Action |
|------|--------|
| `index.html` | Create -- root entry point for Vite |
| `package.json` | Edit -- add `build:dev`, missing deps |
| `vite.config.ts` | Create -- root Vite config |
| `tsconfig.json` | Edit -- include client/src |
| `server/index.ts` | Edit -- add production CORS origin |

