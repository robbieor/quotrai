# Quotr

## Overview
Quotr is a mobile-first invoicing and business intelligence platform designed for on-site use. It features AI-powered OCR receipt scanning, invoice creation with VAT support, client management, and financial analytics. Built with React Native/Expo, the platform aims for speed, clarity, and thumb-friendly interactions. It supports multi-tenancy with role-based access control, offering features like time tracking, quote creation, material tracking, and comprehensive reporting. The platform also includes premium features like AI-powered material intelligence and data consultation, positioning it for market leadership in business management solutions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend
- **Framework**: React Native with Expo SDK 54 (new architecture enabled)
- **Navigation**: React Navigation (drawer navigation, native stack)
- **State Management**: TanStack React Query (server state), React Context (auth state)
- **Styling**: Custom theme system with light/dark mode support, iOS 26 liquid glass style.
- **UI/UX**: Mobile-first, Euro currency formatting (en-IE locale), DD/MM/YYYY date format, safe area handling.
- **Key UI Components**: FilterChips, EmptyState, Card variants, StatusBadge, Glass Effects, Animated FAB, micro-animations (react-native-reanimated).
- **Branding**: Irish business aesthetic, teal primary (#0A7EA4), amber accent (#F59E0B).

### Backend
- **Runtime**: Node.js with Express.js
- **API**: RESTful endpoints (`/api/*`)
- **Security**: Helmet, bcryptjs for password hashing, rate limiting, Gzip compression.
- **Session Management**: PostgreSQL-backed sessions (`connect-pg-simple`).
- **Authentication**: Email/password, session-based with `express-session`, `requireAuth` and `requireOrganization` middleware.

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect.
- **Schema**: `shared/schema.ts` for type sharing.
- **Migrations**: Drizzle Kit.
- **Tables**: Users, clients, expenses, invoices, time entries, organizations, etc., with comprehensive indexing for performance.

### Multi-Tenancy & RBAC
- **Organization Model**: Users belong to organizations; data scoped by `organizationId`.
- **Roles**: Owner, Admin, Staff, Viewer with hierarchical permissions.
- **Access Control**: `loadOrganization` and `requireRole` middleware.
- **Invitation System**: Email-based invitations with 7-day expiry.

### AI Integration - "Foreman" Unified Consultant
- **Single unified AI agent**: "Foreman" consolidates all AI features (business intelligence, quote generation, materials advice, analytics) into one screen
- **Claude Sonnet 4.5** via Replit AI Integrations for Foreman chat (business intelligence, quote generation, analytics)
- **Google Gemini API** via Replit AI Integrations for receipt OCR extraction and voice transcription
- Models: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-image`.
- Batch processing with rate limiting and retry logic.
- **Voice Features** (Foreman): Text-to-speech output (expo-speech), voice input recording (expo-audio with AudioModule.requestRecordingPermissionsAsync), server-side transcription via Gemini.
- **Key File**: `client/screens/ForemanScreen.tsx` - unified AI consultant interface

### Agentic Command System
- **Slash Commands**: `/quote`, `/invoice`, `/expense`, `/client`, `/find` for rapid creation
- **Natural Language**: Fallback to Claude for ambiguous commands
- **Pattern Learning**: Tracks user behavior via `user_patterns` and `agent_command_history` tables
  - Pattern types: `command_usage`, `client_frequency`, `template_preference`, `time_of_day`, `typical_values`
  - Personalized suggestions scored by frequency and recency with time-of-day boosting
- **Draft System**: Creates quote/invoice drafts for user confirmation before saving
- **Key Files**: `server/agent/command-parser.ts`, `server/agent/tools.ts`, `server/agent/patterns.ts`, `client/components/AgentCommandInput.tsx`

### Key Design Decisions
- **Monorepo**: Client, server, and shared code in one repository.
- **Shared Schema**: Drizzle schema in `shared/` for type safety across client/server.
- **Mobile-First**: Drawer/sidebar navigation (matching Tradify's structure), floating action button for receipt scanning.
- **Navigation Structure**: Dark sidebar (#1E293B background) with hamburger menu; consistent DrawerHeader across all main screens showing hamburger (left), Quotr logo + text (center), bell notification (right).
- **Key Navigation Files**: `DrawerNavigator.tsx`, `DrawerContent.tsx`, `DrawerHeader.tsx`
- **Irish Market Focus**: EUR currency, Irish VAT rates (23%, 13.5%, 9%, 0%).
- **Features**: Dashboard analytics, client/invoice/expense/quote/material management, time tracking, comprehensive reports (P&L, VAT, Client Revenue), customizable invoice branding, GPS-verified time tracking, break tracking, onboarding wizard, legal compliance screens, data monetization foundation, job scheduling with map views, schedule calendar, service templates with price lists.
- **Premium Features**: AI-powered materials chat, supplier comparison reports, data consultation, Stripe-based subscription system.
- **Service Templates**: Pre-defined bundles of line items (e.g., "Kitchen Rewire", "Bathroom Fit-Out") for faster quote/invoice creation. Templates stored in `service_templates` and `service_template_items` tables.

## External Dependencies
### Database
- PostgreSQL (via `DATABASE_URL`)
- Drizzle ORM

### AI Services
- Replit AI Integrations (Gemini-compatible API)
  - `AI_INTEGRATIONS_GEMINI_API_KEY`
  - `AI_INTEGRATIONS_GEMINI_BASE_URL`

### Native Capabilities (Expo)
- `expo-camera`
- `expo-image-picker`
- `expo-file-system`
- `expo-haptics`

### App Storage (File Uploads)
- Replit App Storage (Google Cloud Storage backed) via `@replit/object-storage`.
- Endpoints for uploading receipts/logos, downloading, and deleting files.
- Files scoped by `organizationId/userId`.

### Stripe Integration
- Managed via Replit Stripe connector.
- `stripe-replit-sync` for webhooks and schema synchronization.

### Email Service
- Resend for transactional emails (verification, welcome, password reset, team invites)
- Branded HTML templates with Quotr styling (teal header, professional layout)
- Email service file: `server/email.ts`
- Functions: `sendVerificationEmail`, `sendWelcomeEmail`, `sendPasswordResetEmail`, `sendTeamInviteEmail`

### Environment Variables
- `DATABASE_URL`
- `SESSION_SECRET`
- `AI_INTEGRATIONS_GEMINI_API_KEY`
- `AI_INTEGRATIONS_GEMINI_BASE_URL`
- `EXPO_PUBLIC_DOMAIN`
- `RESEND_API_KEY` - Required for sending emails (get from resend.com)