/**
 * PikPok - Typography System
 *
 * Based on Plus Jakarta Sans font family as specified in UI references.
 * Font weights: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
 */

export const Typography = {
  fontFamily: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semiBold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold'
  },

  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36
  },

  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    md: 1.5,
    lg: 1.6,
    relaxed: 1.75
  },

  letterSpacing: {
    tight: -0.02,
    normal: 0,
    wide: 0.02
  },

  // Text style presets
  styles: {
    displayLarge: {
      fontSize: 36,
      fontWeight: '700',
      fontFamily: 'PlusJakartaSans_700Bold',
      lineHeight: 44,
      letterSpacing: -0.02
    },
    displayMedium: {
      fontSize: 30,
      fontWeight: '700',
      fontFamily: 'PlusJakartaSans_700Bold',
      lineHeight: 38,
      letterSpacing: -0.01
    },
    displaySmall: {
      fontSize: 24,
      fontWeight: '600',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      lineHeight: 32
    },
    headlineLarge: {
      fontSize: 20,
      fontWeight: '600',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      lineHeight: 28
    },
    headlineMedium: {
      fontSize: 17,
      fontWeight: '600',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      lineHeight: 24
    },
    headlineSmall: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      lineHeight: 22
    },
    titleLarge: {
      fontSize: 15,
      fontWeight: '500',
      fontFamily: 'PlusJakartaSans_500Medium',
      lineHeight: 22
    },
    titleMedium: {
      fontSize: 13,
      fontWeight: '500',
      fontFamily: 'PlusJakartaSans_500Medium',
      lineHeight: 20
    },
    titleSmall: {
      fontSize: 11,
      fontWeight: '500',
      fontFamily: 'PlusJakartaSans_500Medium',
      lineHeight: 16
    },
    bodyLarge: {
      fontSize: 15,
      fontWeight: '400',
      fontFamily: 'PlusJakartaSans_400Regular',
      lineHeight: 24
    },
    bodyMedium: {
      fontSize: 13,
      fontWeight: '400',
      fontFamily: 'PlusJakartaSans_400Regular',
      lineHeight: 20
    },
    bodySmall: {
      fontSize: 11,
      fontWeight: '400',
      fontFamily: 'PlusJakartaSans_400Regular',
      lineHeight: 16
    },
    labelLarge: {
      fontSize: 13,
      fontWeight: '500',
      fontFamily: 'PlusJakartaSans_500Medium',
      lineHeight: 20
    },
    labelMedium: {
      fontSize: 11,
      fontWeight: '500',
      fontFamily: 'PlusJakartaSans_500Medium',
      lineHeight: 16
    },
    labelSmall: {
      fontSize: 11,
      fontWeight: '500',
      fontFamily: 'PlusJakartaSans_500Medium',
      lineHeight: 16,
      letterSpacing: 0.5
    }
  }
} as const;

export type FontFamilyKey = keyof typeof Typography.fontFamily;
export type FontSizeKey = keyof typeof Typography.fontSize;
export type FontWeightKey = keyof typeof Typography.fontWeight;
export type LineHeightKey = keyof typeof Typography.lineHeight;
export type TextStyleKey = keyof typeof Typography.styles;