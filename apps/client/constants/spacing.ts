/**
 * PikPok - Spacing System
 *
 * Consistent spacing scale based on 4px base unit.
 */

export const Spacing = {
  // Base unit: 4px
  base: 4,

  // Spacing scale
  none: 0,
  '3xs': 2,   // 0.5 * base
  '2xs': 4,   // 1 * base
  xs: 8,      // 2 * base
  sm: 12,     // 3 * base
  md: 16,     // 4 * base
  lg: 20,     // 5 * base
  xl: 24,     // 6 * base
  '2xl': 32,  // 8 * base
  '3xl': 40,  // 10 * base
  '4xl': 48,  // 12 * base
  '5xl': 64,  // 16 * base

  // Semantic spacing
  padding: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32
  },

  margin: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32
  },

  gap: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24
  },

  // Border radius
  borderRadius: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 10,
    lg: 12,
    xl: 16,
    '2xl': 20,
    '3xl': 24,
    full: 9999
  },

  // Component-specific spacing
  component: {
    buttonHeight: 48,
    buttonHeightLarge: 56,
    inputHeight: 48,
    cardPadding: 16,
    screenPadding: 16,
    sectionGap: 24,
    listItemGap: 12,
    headerHeight: 56,
    tabBarHeight: 88
  },

  // Layout
  layout: {
    maxContentWidth: 600,
    containerPadding: 24,
    safeAreaPadding: 16
  }
} as const;

export type SpacingKey = keyof typeof Spacing;
export type SpacingScaleKey = keyof Omit<typeof Spacing, 'padding' | 'margin' | 'gap' | 'borderRadius' | 'component' | 'layout' | 'base'>;