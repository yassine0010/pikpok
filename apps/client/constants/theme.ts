/**
 * PikPok - Combined Theme
 *
 * Single source of truth for all design tokens.
 */

import { Colors } from './colors';
import { Typography } from './typography';
import { Spacing } from './spacing';

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,

  // Component themes
  components: {
    button: {
      primary: {
        backgroundColor: Colors.primary,
        textColor: Colors.white,
        borderColor: Colors.primary,
        height: Spacing.component.buttonHeight,
        borderRadius: Spacing.borderRadius.lg,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        fontFamily: Typography.fontFamily.semiBold
      },
      secondary: {
        backgroundColor: Colors.surface,
        textColor: Colors.primary,
        borderColor: Colors.primary,
        height: Spacing.component.buttonHeight,
        borderRadius: Spacing.borderRadius.lg,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        fontFamily: Typography.fontFamily.semiBold
      },
      outline: {
        backgroundColor: 'transparent',
        textColor: Colors.textPrimary,
        borderColor: Colors.border,
        height: Spacing.component.buttonHeight,
        borderRadius: Spacing.borderRadius.lg,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.medium,
        fontFamily: Typography.fontFamily.medium
      },
      ghost: {
        backgroundColor: 'transparent',
        textColor: Colors.textSecondary,
        borderColor: 'transparent',
        height: Spacing.component.buttonHeight,
        borderRadius: Spacing.borderRadius.lg,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.medium,
        fontFamily: Typography.fontFamily.medium
      },
      danger: {
        backgroundColor: Colors.error,
        textColor: Colors.white,
        borderColor: Colors.error,
        height: Spacing.component.buttonHeight,
        borderRadius: Spacing.borderRadius.lg,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.semibold,
        fontFamily: Typography.fontFamily.semiBold
      }
    },

    input: {
      default: {
        height: Spacing.component.inputHeight,
        backgroundColor: Colors.surface,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: Spacing.borderRadius.lg,
        fontSize: Typography.fontSize.md,
        fontWeight: Typography.fontWeight.regular,
        fontFamily: Typography.fontFamily.regular,
        textColor: Colors.textPrimary,
        placeholderColor: Colors.textTertiary,
        paddingHorizontal: Spacing.md
      },
      focused: {
        borderColor: Colors.primary,
        borderWidth: 2
      },
      error: {
        borderColor: Colors.error,
        borderWidth: 2
      },
      disabled: {
        backgroundColor: Colors.surfaceVariant,
        textColor: Colors.textTertiary
      }
    },

    card: {
      default: {
        backgroundColor: Colors.surface,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: Spacing.borderRadius.xl,
        padding: Spacing.component.cardPadding,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3
      },
      elevated: {
        backgroundColor: Colors.surface,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: Spacing.borderRadius.xl,
        padding: Spacing.component.cardPadding,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6
      },
      outlined: {
        backgroundColor: Colors.surface,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: Spacing.borderRadius.xl,
        padding: Spacing.component.cardPadding
      }
    },

    badge: {
      default: {
        backgroundColor: Colors.primary + '15',
        textColor: Colors.primary,
        borderRadius: Spacing.borderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.semibold,
        fontFamily: Typography.fontFamily.semiBold
      },
      success: {
        backgroundColor: Colors.success + '15',
        textColor: Colors.success
      },
      warning: {
        backgroundColor: Colors.warning + '15',
        textColor: Colors.warning
      },
      error: {
        backgroundColor: Colors.error + '15',
        textColor: Colors.error
      },
      info: {
        backgroundColor: Colors.info + '15',
        textColor: Colors.info
      }
    }
  },

  // Screen themes
  screens: {
    feed: {
      backgroundColor: Colors.background,
      cardGap: Spacing.md,
      cardPadding: Spacing.md,
      headerHeight: Spacing.component.headerHeight
    },
    stats: {
      backgroundColor: Colors.background,
      sectionGap: Spacing.component.sectionGap,
      cardGap: Spacing.md
    },
    leaderboard: {
      backgroundColor: Colors.background,
      rowHeight: 60,
      rowGap: Spacing.sm
    },
    profile: {
      backgroundColor: Colors.background,
      sectionGap: Spacing.component.sectionGap,
      avatarSize: 100
    },
    auth: {
      backgroundColor: Colors.background,
      formGap: Spacing.lg,
      inputGap: Spacing.lg,
      logoSize: 48
    }
  },

  // Animation
  animation: {
    duration: {
      fast: 150,
      normal: 250,
      slow: 350
    },
    easing: {
      easeOut: 'ease-out',
      easeIn: 'ease-in',
      easeInOut: 'ease-in-out',
      spring: 'spring'
    }
  },

  // Shadows
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0
    },
    sm: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1
    },
    md: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3
    },
    lg: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6
    },
    xl: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 10
    }
  }
} as const;

export type Theme = typeof Theme;
export type ColorTheme = typeof Colors;
export type TypographyTheme = typeof Typography;
export type SpacingTheme = typeof Spacing;