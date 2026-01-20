/**
 * Quotr Design Tokens
 * Canonical source of truth for all design values
 * Based on design_guidelines.md
 */

// =============================================================================
// COLORS - Muted Professional Palette
// =============================================================================

export const colors = {
    // Primary - Revamo Marketing Teal
    primary: {
        DEFAULT: '#00FFB2',
        light: '#33FFC1',
        dark: '#00CC8E',
    },

    // Accent
    accent: {
        DEFAULT: '#00FFB2',
        light: '#33FFC1',
        dark: '#00CC8E',
    },

    // Semantic
    success: '#22c55e', // Green
    warning: '#fbbf24', // Amber
    error: '#ef4444',   // Red

    // Background & Surface - Detailed Mapping
    background: '#0f172a',      // Primary dark background
    surface: {
        canvas: '#0f172a',      // Main canvas
        darker: '#0a0f1a',      // Navigation / Sidebar
        DEFAULT: '#1e293b',      // Card backgrounds
        elevated: 'rgba(30, 41, 59, 0.8)', // Modals / Overlays
        navigation: '#0a0f1a',   // Navigation background
        light: '#f1f5f9',       // Light theme section backgrounds
    },

    // Borders
    border: {
        DEFAULT: 'rgba(255, 255, 255, 0.08)',
        subtle: 'rgba(255, 255, 255, 0.05)',
        light: 'rgba(15, 23, 42, 0.08)',
    },

    // Text
    text: {
        primary: '#e2e8f0',     // Light primary text
        secondary: '#94a3b8',   // Muted secondary text
        dark: '#0f172a',        // Headings / Primary text in light context
        gray: '#64748b',        // Secondary text in light context
        disabled: '#4A5568',
    },

    // Status badge backgrounds (10% opacity versions)
    statusBg: {
        paid: 'rgba(34, 197, 94, 0.1)',      // success
        sent: 'rgba(251, 191, 36, 0.1)',      // warning
        overdue: 'rgba(239, 68, 68, 0.1)',    // error
        draft: 'rgba(0, 255, 178, 0.1)',     // primary/teal
    },
} as const;

// =============================================================================
// TYPOGRAPHY - Manrope (Marketing Grade)
// =============================================================================

export const typography = {
    // Font families
    fontFamily: {
        sans: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        mono: '"SF Mono", "Fira Code", "Consolas", monospace',
    },

    // Font sizes (clamp-based for liquid scale)
    fontSize: {
        h1: 'clamp(2.5rem, 6vw, 4.5rem)',
        h2: 'clamp(2rem, 4vw, 3rem)',
        h3: 'clamp(1.5rem, 2.5vw, 2rem)',
        lead: '1.25rem',
        body: '1rem',
        bodySmall: '0.95rem',
        label: '0.875rem',
        caption: '0.875rem',
        button: '0.95rem',
        tabular: '0.95rem',
    },

    // Font weights
    fontWeight: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extraBold: 800,
    },

    // Line heights
    lineHeight: {
        tight: 1.1,
        normal: 1.5,
        relaxed: 1.7,
    },
} as const;

// =============================================================================
// SPACING - 8px Base Unit System
// =============================================================================

export const spacing = {
    '1': '0.25rem',  // 4px
    '2': '0.5rem',   // 8px
    '3': '0.75rem',  // 12px
    '4': '1rem',     // 16px
    '5': '1.25rem',  // 20px
    '6': '1.5rem',   // 24px
    '8': '2rem',     // 32px
    '10': '2.5rem',  // 40px
    '12': '3rem',    // 48px
    '16': '4rem',    // 64px
    '20': '5rem',    // 80px
    '24': '6rem',    // 96px
} as const;

// =============================================================================
// BORDER RADIUS - Revamo Structural Standards
// =============================================================================

export const radius = {
    xs: '4px',
    sm: '8px',   // Buttons, inputs
    md: '10px',
    lg: '12px',  // Cards
    xl: '20px',
    full: '9999px', // Pills, Badges, Avatars
} as const;

// =============================================================================
// SHADOWS - Marketing-Grade Depth
// =============================================================================

export const shadows = {
    none: 'none',
    subtle: '0 4px 20px rgba(0, 0, 0, 0.04)',
    medium: '0 8px 24px rgba(0, 0, 0, 0.06)',
    primary: '0 4px 12px rgba(0, 255, 178, 0.25)',
    dark: '0 4px 20px rgba(0, 255, 178, 0.06)', // Card-dark hover
} as const;

// =============================================================================
// COMPONENT DIMENSIONS
// =============================================================================

export const dimensions = {
    // Buttons
    buttonHeight: '48px',

    // FAB
    fabSize: '56px',
    fabRadius: '28px',
    fabIconSize: '24px',

    // Status badges
    badgeHeight: '22px',

    // List items
    listItemMinHeight: '64px',

    // Form inputs
    inputHeight: '48px',

    // Icons
    iconNav: '24px',
    iconAction: '22px',
    iconList: '20px',
    iconForm: '18px',

    // Touch targets
    touchMinimum: '44px',
    touchPreferred: '48px',

    // Thumbnails
    receiptThumb: '52px',
    avatarSize: '36px',
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================

export const transitions = {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
} as const;

// =============================================================================
// Z-INDEX SCALE
// =============================================================================

export const zIndex = {
    base: 0,
    dropdown: 10,
    sticky: 20,
    modal: 30,
    popover: 40,
    toast: 50,
    fab: 100,
} as const;

// =============================================================================
// CSS CUSTOM PROPERTIES
// =============================================================================

export const cssVariables = `
:root {
  /* Primary Colors */
  --color-primary: ${colors.primary.DEFAULT};
  --color-primary-light: ${colors.primary.light};
  --color-primary-dark: ${colors.primary.dark};
  
  /* Accent Colors */
  --color-accent: ${colors.accent.DEFAULT};
  --color-accent-light: ${colors.accent.light};
  --color-accent-dark: ${colors.accent.dark};
  
  /* Semantic Colors */
  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-error: ${colors.error};
  
  /* Background & Surface */
  --color-background: ${colors.background};
  --color-surface-canvas: ${colors.surface.canvas};
  --color-surface: ${colors.surface.DEFAULT};
  --color-surface-elevated: ${colors.surface.elevated};
  --color-surface-navigation: ${colors.surface.navigation};
  
  /* Borders */
  --color-border: ${colors.border.DEFAULT};
  --color-border-subtle: ${colors.border.subtle};
  
  /* Text Colors */
  --color-text-primary: ${colors.text.primary};
  --color-text-secondary: ${colors.text.secondary};
  --color-text-disabled: ${colors.text.disabled};
  
  /* Status Badge Backgrounds */
  --color-status-paid-bg: ${colors.statusBg.paid};
  --color-status-sent-bg: ${colors.statusBg.sent};
  --color-status-overdue-bg: ${colors.statusBg.overdue};
  --color-status-draft-bg: ${colors.statusBg.draft};
  
  /* Typography */
  --font-family-sans: ${typography.fontFamily.sans};
  --font-family-mono: ${typography.fontFamily.mono};
  
  --font-size-h1: ${typography.fontSize.h1};
  --font-size-h2: ${typography.fontSize.h2};
  --font-size-h3: ${typography.fontSize.h3};
  --font-size-body: ${typography.fontSize.body};
  --font-size-body-small: ${typography.fontSize.bodySmall};
  --font-size-caption: ${typography.fontSize.caption};
  --font-size-button: ${typography.fontSize.button};
  --font-size-tabular: ${typography.fontSize.tabular};
  
  --font-weight-regular: ${typography.fontWeight.regular};
  --font-weight-medium: ${typography.fontWeight.medium};
  --font-weight-semibold: ${typography.fontWeight.semibold};
  --font-weight-bold: ${typography.fontWeight.bold};
  
  /* Spacing - Revamo 8px Scale */
  --spacing-1: ${spacing['1']};
  --spacing-2: ${spacing['2']};
  --spacing-3: ${spacing['3']};
  --spacing-4: ${spacing['4']};
  --spacing-5: ${spacing['5']};
  --spacing-6: ${spacing['6']};
  --spacing-8: ${spacing['8']};
  --spacing-10: ${spacing['10']};
  --spacing-12: ${spacing['12']};
  --spacing-16: ${spacing['16']};
  --spacing-20: ${spacing['20']};
  --spacing-24: ${spacing['24']};
  
  /* Legacy Shorthands */
  --spacing-xs: ${spacing['1']};
  --spacing-sm: ${spacing['2']};
  --spacing-md: ${spacing['4']};
  --spacing-lg: ${spacing['6']};
  --spacing-xl: ${spacing['8']};
  --spacing-2xl: ${spacing['10']};

  /* Border Radius */
  --radius-xs: ${radius.xs};
  --radius-sm: ${radius.sm};
  --radius-md: ${radius.md};
  --radius-lg: ${radius.lg};
  --radius-xl: ${radius.xl};
  --radius-full: ${radius.full};
  
  /* Component Dimensions */
  --button-height: ${dimensions.buttonHeight};
  --fab-size: ${dimensions.fabSize};
  --fab-radius: ${dimensions.fabRadius};
  --badge-height: ${dimensions.badgeHeight};
  --list-item-min-height: ${dimensions.listItemMinHeight};
  --input-height: ${dimensions.inputHeight};
  
  /* Icon Sizes */
  --icon-nav: ${dimensions.iconNav};
  --icon-action: ${dimensions.iconAction};
  --icon-list: ${dimensions.iconList};
  --icon-form: ${dimensions.iconForm};
  
  /* Shadows - Marketing Grade */
  --shadow-none: ${shadows.none};
  --shadow-subtle: ${shadows.subtle};
  --shadow-medium: ${shadows.medium};
  --shadow-primary: ${shadows.primary};
  --shadow-dark: ${shadows.dark};
  
  /* Legacy Shadows */
  --shadow-sm: ${shadows.subtle};
  --shadow-md: ${shadows.medium};
  --shadow-fab: ${shadows.primary};
  
  /* Transitions */
  --transition-fast: ${transitions.fast};
  --transition-normal: ${transitions.normal};
  --transition-slow: ${transitions.slow};
}
`;

export default {
    colors,
    typography,
    spacing,
    radius,
    shadows,
    dimensions,
    transitions,
    zIndex,
    cssVariables,
};
