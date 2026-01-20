/**
 * Quotr Design Tokens
 * Canonical source of truth for all design values
 * Based on design_guidelines.md
 */

// =============================================================================
// COLORS - Muted Professional Palette
// =============================================================================

export const colors = {
    // Primary - Revamo Teal
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
    success: '#00FFB2',
    warning: '#D97706',
    error: '#DC2626',

    // Background & Surface - Updated mapping
    background: '#1a202c',
    surface: {
        canvas: '#1a202c',      // Dark background
        DEFAULT: '#242d3c',      // Card backgrounds
        elevated: '#2d3748',     // Modals, dropdowns
        navigation: '#0f1419',   // Sidebar/nav background
    },

    // Borders
    border: {
        DEFAULT: 'rgba(255, 255, 255, 0.1)',
        subtle: 'rgba(255, 255, 255, 0.05)',
    },

    // Text
    text: {
        primary: '#FFFFFF',
        secondary: '#94a3b8',
        disabled: '#4A5568',
    },

    // Status badge backgrounds (10% opacity versions)
    statusBg: {
        paid: 'rgba(0, 255, 178, 0.1)',      // success
        sent: 'rgba(217, 119, 6, 0.1)',       // warning
        overdue: 'rgba(220, 38, 38, 0.1)',    // error
        draft: 'rgba(148, 163, 184, 0.1)',    // gray text
    },
} as const;

// =============================================================================
// TYPOGRAPHY - Manrope, Structured Hierarchy (Revamo Scale)
// =============================================================================

export const typography = {
    // Font families
    fontFamily: {
        sans: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        mono: '"SF Mono", "Fira Code", "Consolas", monospace',
    },

    // Font sizes (clamp-based for fluid scale)
    fontSize: {
        h1: 'clamp(2.5rem, 6vw, 4.5rem)',
        h2: 'clamp(2rem, 4vw, 3rem)',
        h3: 'clamp(1.5rem, 2.5vw, 2rem)',
        body: '15px',
        bodySmall: '13px',
        caption: '11px',
        button: '15px',
        tabular: '15px',
    },

    // Font weights
    fontWeight: {
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
// BORDER RADIUS - Revamo Styling
// =============================================================================

export const radius = {
    xs: '4px',   // Status badges
    sm: '8px',   // Buttons, inputs
    md: '10px',
    lg: '12px',  // Cards
    xl: '20px',
    full: '9999px', // FAB, avatars
} as const;

// =============================================================================
// SHADOWS - Revamo Elevation (Subtle Lift)
// =============================================================================

export const shadows = {
    none: 'none',
    sm: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    md: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
    fab: '0 4px 12px rgba(0, 255, 178, 0.3)',
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
  --shadow-sm: ${shadows.sm};
  --shadow-md: ${shadows.md};
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
