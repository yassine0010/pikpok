/**
 * PikPok - Color Palette
 *
 * Based on the UI references in docs/ui/colors palette.jpeg
 * Using Plus Jakarta Sans typography as specified.
 */

export const Colors = {
  // Primary - Indigo/Violet (main brand color)
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  primaryContainer: '#EEF2FF',

  // Secondary - Cyan (for CHILDREN audience)
  secondary: '#06B6D4',
  secondaryLight: '#22D3EE',
  secondaryDark: '#0891B2',
  secondaryContainer: '#ECFEFF',

  // Tertiary - Purple (for TEENS audience)
  tertiary: '#8B5CF6',
  tertiaryLight: '#A78BFA',
  tertiaryDark: '#7C3AED',
  tertiaryContainer: '#F5F3FF',

  // Quaternary - Emerald (for success/pattern)
  quaternary: '#10B981',
  quaternaryLight: '#34D399',
  quaternaryDark: '#059669',
  quaternaryContainer: '#ECFDF5',

  // Quinary - Orange/Amber (for warnings/spatial)
  quinary: '#F59E0B',
  quinaryLight: '#FBBF24',
  quinaryDark: '#D97706',
  quinaryContainer: '#FFFDF0',

  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',

  // Background colors
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F4F4F5',

  // Text colors
  textPrimary: '#18181B',
  textSecondary: '#71717A',
  textTertiary: '#A1A1AA',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#000000',
  textOnTertiary: '#FFFFFF',

  // Border colors
  border: '#E4E4E7',
  borderStrong: '#D4D4D8',

  // Shadow
  shadow: '#000000',
  shadowColor: 'rgba(0, 0, 0, 0.08)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalOverlay: 'rgba(0, 0, 0, 0.6)',

  // Audience-specific
  audienceChildren: '#06B6D4',
  audienceTeens: '#8B5CF6',

  // Difficulty colors (for visualizing difficulty rating)
  difficultyEasy: '#10B981',
  difficultyMedium: '#F59E0B',
  difficultyHard: '#EF4444',

  // Hint tier colors
  hintTier1: '#3B82F6',
  hintTier2: '#F59E0B',
  hintTier3: '#8B5CF6'
} as const;

export type ColorKey = keyof typeof Colors;