/**
 * PikPok - Spacing System
 *
 * 4px base scale compliant with design references.
 */

export const Spacing = {
  base: 4,
  none: 0,
  '3xs': 2,
  '2xs': 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,

  padding: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
  },

  margin: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
  },

  gap: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
  },

  borderRadius: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    full: 9999,
  },

  component: {
    buttonHeight: 52,
    buttonHeightLarge: 56,
    inputHeight: 52,
    cardPadding: 20,
    screenPadding: 16,
    tabBarHeight: 78,
    headerHeight: 56,
  },

  layout: {
    maxContentWidth: 460,
  },
} as const;

export type SpacingToken = typeof Spacing;
