

## Diagnosis

**Your code is NOT lost.** All 25 pages, 19 components, 10,600-line `server/routes.ts`, and full schema are present and intact.

There are two separate problems:

### 1. Build error: `Script not found "build:dev"`
Lovable's preview system is looking for a `build:dev` script in `package.json` which doesn't exist. The root `package.json` only has `dev`, `build`, `client:dev`, etc.

**Fix:** Add `"build:dev": "cd client && npm run build"` to root `package.json` scripts.

### 2. Login returns 404 — no backend server
Your app has a full Express backend (`server/routes.ts` with auth, sessions, etc.). Lovable's preview only runs the Vite client dev server (`cd client && npm run dev`). When you try to log in, the client calls `/api/auth/login` which hits a 404 because there's no Express server running.

This is why you see the landing page and "nothing works" — the app is fully there, but the backend that powers login/data is not running in Lovable's preview.

**Fix:** Add a Vite proxy in `client/vite.config.ts` to forward `/api` requests to your actual Express server (running on Replit or wherever your backend is hosted). Alternatively, set `VITE_API_URL` in the client `.env` to point to your deployed server URL.

### Plan

1. **Add `build:dev` script** to root `package.json` → fixes the build error
2. **Configure Vite proxy or `VITE_API_URL`** → allows the preview to reach your Express backend

### What I need from you
Where is your Express server running? (Replit URL, custom domain, etc.) I need the backend URL to configure the API proxy so login and all features work in the Lovable preview.

