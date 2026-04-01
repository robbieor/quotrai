

# Customers Screen — Mobile iOS Contacts Redesign

## What Changes

On mobile (`md:` breakpoint), replace the data table with an iOS Contacts-style card list. Desktop keeps the existing table. The page header becomes compact with a circular "+" button instead of a full-width banner.

## Plan

### 1. Create `CustomerListItem.tsx` component
**New file: `src/components/customers/CustomerListItem.tsx`**

A single customer row component:
- 72px height, full width, flex layout
- Left: 40px circle avatar with initials, pastel background generated from name hash (use simple hash → hue mapping)
- Center: Company name `text-[16px] font-semibold` (line 1), email `text-[13px] text-muted-foreground truncate` (line 2)
- Right: `ChevronRight` icon in muted color
- Bottom: 1px divider `border-b border-[#F0F0F5]` indented with `ml-[56px]` (aligned past avatar)
- On tap: open the customer detail (trigger `onClick` prop)

### 2. Edit `Customers.tsx` — responsive header + mobile list
- Import `useIsMobile` hook
- **Header**: Replace `flex-col sm:flex-row` layout:
  - Title "Customers" stays `text-[28px] font-bold`
  - Below title: `{count} customers` in `text-[13px] text-muted-foreground`
  - "+" button: on mobile, render as a 44px circle icon button (green outline) instead of full-width "Add Customer"
  - Remove subtitle text
- **Search**: Add `rounded-[22px]` pill shape class override on mobile
- **List vs Table**: When `isMobile`, render `CustomerListItem` mapped list instead of `CustomersTable`. When desktop, keep `CustomersTable` unchanged.
- Customer tap on mobile: open `CustomerFormDialog` in edit mode (reuse existing dialog with selected customer)
- **Empty state**: Update search empty text to "No customers found" / "Try a different search term"

### 3. Keep desktop unchanged
`CustomersTable` remains for `md:` and above — no changes to the table component itself.

## Files

| Action | File |
|--------|------|
| Create | `src/components/customers/CustomerListItem.tsx` — mobile list item with avatar, name, email, chevron |
| Edit | `src/pages/Customers.tsx` — responsive header, mobile list rendering, pill search |

No database changes. No functionality changes — only mobile layout.

