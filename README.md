# Revamo

The AI operating system for field service businesses — quotes, invoices, jobs, GPS time tracking, and Revamo AI.

## Prerequisites

- **Node.js** 22+ and **npm**
- **Xcode** 16+ (for iOS development, macOS only)
- A Supabase project (or use the existing Lovable Cloud backend)

## Quick Start

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd revamo

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Start development server
npm run dev
```

The app will be available at `http://localhost:8080`.

## Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

## iOS Development (Capacitor)

### First-Time Setup

```bash
# 1. Build the web app
npm run build

# 2. Add iOS platform
npx cap add ios

# 3. Sync web assets to native project
npx cap sync ios

# 4. Open in Xcode
npx cap open ios
```

### Required Info.plist Permissions

After opening in Xcode, add these entries to `ios/App/App/Info.plist`:

| Key | Value |
|-----|-------|
| `NSMicrophoneUsageDescription` | Revamo uses the microphone for Revamo AI voice commands |
| `NSLocationWhenInUseUsageDescription` | Revamo uses your location to verify job site attendance |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | Revamo tracks your location in the background for GPS time tracking |
| `NSCameraUsageDescription` | Revamo uses the camera for site visit verification photos |

### Ongoing Development

After pulling new changes:

```bash
npm install
npm run build
npx cap sync ios
npx cap open ios
```

### Production Build

For a production iOS build, comment out or remove the `server.url` in `capacitor.config.ts` so the app loads from the bundled `dist/` folder instead of the dev server.

## Android Development

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android   # opens in Android Studio
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial Revamo export from Lovable"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Project Structure

```
├── src/
│   ├── components/       # React UI components
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # Supabase client & types
│   ├── lib/              # Utilities, offline queue, Capacitor helpers
│   ├── pages/            # Route pages
│   └── App.tsx           # Root component
├── supabase/
│   ├── functions/        # Edge functions (auto-deployed)
│   └── migrations/       # Database migrations
├── public/               # Static assets, PWA manifest
├── capacitor.config.ts   # Capacitor native config
├── vite.config.ts        # Vite build config
└── package.json
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Lovable Cloud) — Postgres, Auth, Edge Functions, Storage
- **Native**: Capacitor (iOS & Android)
- **Build**: Vite
- **Maps**: Leaflet / react-leaflet
- **PDF**: jsPDF + jspdf-autotable
