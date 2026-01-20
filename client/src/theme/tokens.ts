/**
 * Quotr Design Tokens
 * Canonical source of truth for all design values
 * Based on design_guidelines.md
 */

// =============================================================================
// COLORS - Muted Professional Palette
// =============================================================================

export const colors = {
    // Primary
    primary: {
        DEFAULT: '#0B6E87',
        light: '#3D8FA3',
        dark: '#084E61',
    },

    // Accent
    accent: {
        DEFAULT: '#D97706',
        light: '#F59E0B',
        dark: '#B45309',
    },

    // Semantic
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',

    // Background & Surface
    background: '#F5F5F5',
    surface: '#FFFFFF',

    // Borders
    border: {
        DEFAULT: '#D1D5DB',
        subtle: '#E5E7EB',
    },

    // Text
    text: {
        primary: '#111827',
        secondary: '#4B5563',
        disabled: '#9CA3AF',
    },

    // Status badge backgrounds (10% opacity versions)
    statusBg: {
        paid: 'rgba(5, 150, 105, 0.1)',      // success
        sent: 'rgba(217, 119, 6, 0.1)',       // warning
        overdue: 'rgba(220, 38, 38, 0.1)',    // error
        draft: 'rgba(209, 213, 219, 0.1)',    // border
    },
} as const;

// =============================================================================
// TYPOGRAPHY - SF Pro, Structured Hierarchy
// =============================================================================

export const typography = {
    // Font families
    fontFamily: {
        sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif',
        mono: '"SF Mono", "Fira Code", "Consolas", monospace',
    },

    // Font sizes (pt to px: multiply by 1.333)
    fontSize: {
        h1: '28px',      // 28pt Bold (screen titles)
        h2: '20px',      // 20pt Semibold (section headers)
        h3: '17px',      // 17pt Semibold (card titles)
        body: '15px',    // 15pt Regular
        bodySmall: '13px', // 13pt Regular
        caption: '11px', // 11pt Medium (metadata, labels)
        button: '15px',  // 15pt Semibold
        tabular: '15px', // 15pt Regular Monospaced (amounts)
    },

    // Font weights
    fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },

    // Line heights
    lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
    },
} as const;

// =============================================================================
// SPACING - Grid-based, 8px system
// =============================================================================

export const spacing = {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '40px',
} as const;

// Numeric versions for calculations
export const spacingValues = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 40,
} as const;

// =============================================================================
// BORDER RADIUS - Sharp, Professional
// =============================================================================

export const radius = {
    xs: '4px',   // Status badges
    sm: '6px',   // Buttons, inputs
    md: '8px',   // Cards
    lg: '12px',
    xl: '16px',
    full: '9999px', // FAB, avatars
} as const;

// =============================================================================
// SHADOWS - Minimal, No card shadows
// =============================================================================

export const shadows = {
    none: 'none',
    fab: '0 2px 4px rgba(0, 0, 0, 0.1)',
    // Removed card shadows per guidelines
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
  --color-surface: ${colors.surface};
  
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
  
  /* Spacing */
  --spacing-xs: ${spacing.xs};
  --spacing-sm: ${spacing.sm};
  --spacing-md: ${spacing.md};
  --spacing-lg: ${spacing.lg};
  --spacing-xl: ${spacing.xl};
  --spacing-2xl: ${spacing['2xl']};
  
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
  
  /* Shadows */
  --shadow-none: ${shadows.none};
  --shadow-fab: ${shadows.fab};
  
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
    spacingValues,
    radius,
    shadows,
    dimensions,
    transitions,
    zIndex,
    cssVariables,
};
