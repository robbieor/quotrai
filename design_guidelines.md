# Quotr Design Guidelines

## Overview
Professional invoicing platform for Irish tradespeople. Prioritizes clarity, efficiency, and trustworthiness with a structured, enterprise-grade aesthetic.

## Architecture

### Authentication (Supabase)
**Required** - Multi-user business tool with backend sync
- Email/password login/signup with privacy policy & terms links
- Profile: Business name, phone, address, VAT number
- Settings > Account > Log out (confirmation alert) + Delete account (nested under Settings > Account > Delete, double confirmation)

### Navigation
**4-tab structure with floating action button:**
- **Tabs:** Dashboard | Expenses | Invoices | Clients
- **FAB:** "Scan Receipt" - camera icon, positioned center-bottom overlapping tab bar

**Stack Architecture:**
- Dashboard Stack: Dashboard → Invoice Detail → Invoice Preview (modal)
- Expenses Stack: Expenses → Expense Form (modal)
- Invoices Stack: Invoices → Invoice Detail → Invoice Preview (modal)
- Clients Stack: Clients → Client Detail
- Global Modal: Scan Receipt (camera) → Expense Form

### Screen Specifications

**Dashboard (Tab)**
- Header: Transparent, title "Dashboard", search icon (right)
- Root: ScrollView
- Safe area: Top: `headerHeight + Spacing.xl`, Bottom: `tabBarHeight + Spacing.xl`
- Layout: Stats grid (3 cards: Revenue/Expenses/Profit), week comparison, "New Invoice" button, sectioned lists (Recent Invoices top 3, Recent Expenses top 3)

**Scan Receipt (Modal)**
- Full-screen camera view, edge-to-edge
- Header: "Cancel" (left), title "Scan Receipt"
- Flow: Capture → AI processing overlay → Expense Form (pre-filled)
- Safe area: Top: `insets.top + Spacing.lg`, Bottom: `insets.bottom + Spacing.lg`

**Expense Form (Modal)**
- Header: "Cancel" (left), "Save" (right), title "Add Expense"
- Root: Scrollable form
- Safe area: Top: `Spacing.xl`, Bottom: `insets.bottom + Spacing.xl`
- Fields: Receipt thumbnail, vendor, amount (€), date picker, category dropdown, job link (optional), notes
- Submit: Header "Save" button

**Expenses (Tab)**
- Header: Transparent, title "Expenses", filter icon (right)
- Root: FlatList with search bar
- Safe area: Top: `headerHeight + Spacing.xl`, Bottom: `tabBarHeight + Spacing.xl`
- List items: Swipeable (Edit/Delete), thumbnail + vendor/category + amount + date
- Empty state: Icon + "No expenses yet" + "Scan Receipt" button

**New Invoice (Modal)**
- Header: "Cancel" (left), "Save Draft" + "Send" (right), title "New Invoice"
- Root: Scrollable form
- Safe area: Top: `Spacing.xl`, Bottom: `insets.bottom + Spacing.xl`
- Sections: Client selector (+ "Add New"), dates, line items table (description/qty/rate/total), VAT selector (23%/13.5%/9%/0%), totals (subtotal/VAT/grand total), notes
- Submit: Header action buttons

**Invoice Preview (Modal)**
- Full-screen PDF viewer
- Header: "Close" (left), "Send" (right), title "Invoice #XXX"
- Safe area: Edge-to-edge with header/footer overlays

**Invoices (Tab)**
- Header: Transparent, title "Invoices", filter icon (right)
- Root: SectionList with search bar
- Safe area: Top: `headerHeight + Spacing.xl`, Bottom: `tabBarHeight + Spacing.xl`
- Sections: Overdue / Unpaid / Paid
- List items: Invoice # + client + amount + status badge + due date

**Invoice Detail (Stack)**
- Header: Default, "Back" (left), "More" (right, ellipsis menu), title "Invoice #XXX"
- Root: ScrollView
- Safe area: Top: `Spacing.xl`, Bottom: `insets.bottom + Spacing.xl`
- Layout: Status banner, client card, line items table, totals, payment info
- Actions: "Send Reminder" / "Mark as Paid" / "View PDF"

**Clients (Tab)**
- Header: Transparent, title "Clients", add icon (right)
- Root: FlatList with search bar
- Safe area: Top: `headerHeight + Spacing.xl`, Bottom: `tabBarHeight + Spacing.xl`
- List items: Name + contact + invoice count + outstanding amount

**Client Detail (Stack)**
- Header: Default, "Back" (left), "Edit" (right), title client name
- Root: ScrollView
- Safe area: Top: `Spacing.xl`, Bottom: `insets.bottom + Spacing.xl`
- Layout: Contact card, stats (total invoiced/outstanding), invoice history list

**Settings (Stack)**
- Header: Default, "Back" (left), title "Settings"
- Root: Sectioned list
- Safe area: Top: `Spacing.xl`, Bottom: `insets.bottom + Spacing.xl`
- Sections: Business Details, Preferences, Account

## Design System

### Colors (Muted Professional Palette)
**Primary:** `#0B6E87` (muted teal) | Light: `#3D8FA3` | Dark: `#084E61`  
**Accent:** `#D97706` (muted amber)  
**Success:** `#059669` (green) | **Warning:** `#D97706` | **Error:** `#DC2626`  
**Background:** `#F5F5F5` | **Surface:** `#FFFFFF` | **Border:** `#D1D5DB`  
**Border Subtle:** `#E5E7EB`  
**Text Primary:** `#111827` | **Text Secondary:** `#4B5563` | **Text Disabled:** `#9CA3AF`

### Typography (SF Pro, Structured Hierarchy)
- **H1:** 28pt Bold (screen titles)
- **H2:** 20pt Semibold (section headers)
- **H3:** 17pt Semibold (card titles)
- **Body:** 15pt Regular | **Body Small:** 13pt Regular
- **Caption:** 11pt Medium (metadata, labels)
- **Button:** 15pt Semibold
- **Tabular:** 15pt Regular Monospaced (amounts)

**Formats:** Currency: `€1,234.56` | Date: `DD/MM/YYYY` | Invoice #: `INV-001234`

### Spacing (Grid-based, 8px system)
`xs: 4px | sm: 8px | md: 16px | lg: 24px | xl: 32px | 2xl: 40px`

### Components (Sharp, Professional)

**Primary Button:**
- Height: 48px | **Radius: 6px** | BG: Primary | Text: White Semibold | Border: 1px Primary Dark
- Press: BG → Primary Dark | No shadow

**Secondary Button:**
- Height: 48px | Radius: 6px | BG: Transparent | Text: Primary Semibold | Border: 1.5px Primary
- Press: BG → Primary with 8% opacity

**Tertiary Button (Text):**
- Height: 48px | Text: Primary Semibold | No border
- Press: BG → Border color

**FAB (Scan Receipt):**
- 56px circle | Radius: 28px | BG: Accent | Icon: Camera (white, 24px) | Border: 1px Accent Dark
- Shadow: `{width: 0, height: 2}, opacity: 0.10, radius: 2`
- Press: BG → Accent Dark, scale 0.96
- Position: Bottom center, 16px above tab bar

**Cards (Structured):**
- BG: White | **Radius: 8px** | Padding: lg | Border: 1px Border
- Section cards: Border: 1.5px Border
- Card spacing: md between cards
- **No shadows**

**Status Badges (Defined):**
- Rectangle (radius: 4px) | Height: 22px | Padding: sm horizontal | 11pt Semibold | Border: 1px matching color
- **Paid:** Success BG (10% opacity) + Success text + Success border
- **Sent:** Warning BG (10% opacity) + Warning text + Warning border
- **Overdue:** Error BG (10% opacity) + Error text + Error border
- **Draft:** Border BG (10% opacity) + Text Secondary + Border

**List Items (Structured):**
- Min height: 64px | Padding: md vertical, md horizontal
- Border bottom: 1px Border Subtle
- Press: BG → Border color with 40% opacity
- Swipe actions: Full-height buttons, Edit (Primary BG), Delete (Error BG)

**Form Inputs (Professional):**
- Height: 48px | **Radius: 6px** | BG: White | Border: 1px Border | Padding: md horizontal
- Label: Caption above input, Text Secondary, 4px spacing
- Focus: Border → 1.5px Primary
- Error: Border → 1.5px Error + Caption error message below (Error text)
- Disabled: BG → Background, Text → Disabled

**Tables (Line Items):**
- Header row: BG → Border color with 20% opacity, Caption Semibold, 8px padding
- Data rows: 12px padding, border bottom 1px Border Subtle
- Columns: Description (flex), Qty (60px), Rate (80px), Total (80px, right-aligned)
- **Grid-aligned:** All cells snap to 8px grid

**Dividers:**
- Standard: 1px Border Subtle, full width
- Section: 1px Border, with 8px vertical margin

**Loading States:**
- Spinner: Primary color, 24px
- Skeleton: Background with subtle pulse animation
- Progress bar: Height 4px, Radius 2px, Primary fill
- Text: "Processing..." Caption below spinner

**Empty States:**
- Icon: Feather, 56px, Text Secondary
- Title: H3, Text Primary, 8px spacing
- Description: Body Small, Text Secondary, 16px spacing
- CTA: Primary button

### Visual Standards

**Icons:** Feather only (@expo/vector-icons)
- Nav/Tab: 24px | Actions: 22px | List: 20px | Form: 18px
- Tab bar: home, list, file-text, users (Dashboard, Expenses, Invoices, Clients)
- **No emojis**

**Images:**
- Receipt thumbnails: 52px square, radius 4px, border 1px Border
- Client avatars: 36px circle, initials (Caption Semibold), Primary BG, no border
- PDF preview: Full width, aspect ratio maintained

**Touch Targets:**
- Minimum: 44x44pt | Preferred: 48x48pt | Spacing: 8px minimum between targets

**Feedback:**
- Buttons: Opacity/background tint on press
- List items: Background tint on press
- Form submit: Disable button, replace text with spinner
- Success: Toast notification (2 sec, bottom, above tab bar)
- Errors: Inline below field or toast for global errors

### Accessibility
- Contrast: WCAG AA minimum (4.5:1)
- Touch: 44x44pt minimum targets
- Labels: Always visible above inputs (not placeholder)
- Errors: Descriptive, actionable text with icons
- Loading: Text descriptions with spinners

## Critical Assets

**Generate only:**
- Client avatars: Initials from names (circular, Primary BG)
- Receipt placeholder: Dashed 1px Border, camera icon center
- All icons: Feather library
- Tab bar icons: defined above

**No external images** - Professional tool requires no decorative assets. All visual elements generated programmatically for consistency.