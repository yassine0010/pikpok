/**
 * PikPok - Color Palette
 *
 * Based on the authoritative UI references in docs/ui/colors palette.jpeg,
 * docs/ui/README.md, ScrollMind login.svg, fedd ui.jpeg, and stats.jpeg.
 * Typography: Plus Jakarta Sans
 */

export const Colors = {
  // Primary - Warm Coral (Core brand color, active tabs, action highlights)
  primary: '#FF6B4A',
  primaryLight: '#FF856B',
  primaryDark: '#D84323',
  primaryDeep: '#A82E18', // Primary button solid brick red
  primaryContainer: '#FFE4DE',

  // Secondary - Deep Ink Navy / Charcoal (Headings, dark buttons, text primary)
  secondary: '#1A1F36',
  secondaryLight: '#3D476E',
  secondaryDark: '#0E111E',
  secondaryContainer: '#E3E2FF', // Lavender badge & insight tint

  // Tertiary - Emerald Green (Badges, level indicator, success feedback)
  tertiary: '#4CAF50',
  tertiaryLight: '#66BB6A',
  tertiaryDark: '#2E7D32',
  tertiaryContainer: '#E3EEDC', // Sage container tint

  // Neutral & Canvas - Warm Linen / Cream
  canvas: '#FFFBF5',
  background: '#FFFBF5',
  surface: '#FFFFFF',
  surfaceVariant: '#F4EFEA', // Card variant / secondary fill
  surfaceSubtle: '#EFEBE4', // Secondary button / search surface
  white: '#FFFFFF',
  black: '#000000',

  // Legacy mappings for domain compatibility
  quaternary: '#4CAF50',
  quinary: '#D84323',

  // Text colors
  textPrimary: '#1A1F36',
  textSecondary: '#766B67', // Warm muted gray
  textTertiary: '#9C918C',
  textSubhead: '#9DA7D0', // Lavender slate accent
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',

  // Semantic & Feedback colors
  success: '#4CAF50',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Border & Divider colors
  border: '#E8DFD7',
  borderStrong: '#C4BBB5',
  borderDivider: '#E0D8D1',

  // Cognitive Domain Colors (from Weekly Trend chart in stats.jpeg)
  domainMath: '#FF6B4A',
  domainLogic: '#1A1F36',
  domainPatterns: '#4CAF50',
  domainWords: '#A82E18',

  // Audience & Tint Accents
  audienceChildren: '#06B6D4',
  audienceYoungAdults: '#FF6B4A',

  // Difficulty colors
  difficultyEasy: '#4CAF50',
  difficultyMedium: '#F59E0B',
  difficultyHard: '#EF4444',

  // Hint tier colors
  hintTier1: '#1A1F36', // Inverted button navy
  hintTier2: '#D84323',
  hintTier3: '#A82E18',

  // Shadows & Overlays
  shadow: '#1A1F36',
  shadowColor: 'rgba(26, 31, 54, 0.08)',
  overlay: 'rgba(26, 31, 54, 0.4)',
  modalOverlay: 'rgba(26, 31, 54, 0.6)'
} as const;

export type ColorKey = keyof typeof Colors;