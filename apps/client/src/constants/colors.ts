/**
 * PikPok - Master Color Palette Tokens
 *
 * Fully compliant with docs/ui/README.md and design references:
 * - Primary: Warm Coral (#FF6B4A)
 * - Secondary: Deep Ink Navy (#1A1F36)
 * - Tertiary: Emerald Green (#4CAF50)
 * - Neutral/Canvas: Warm Linen (#FFFBF5)
 */

export const Colors = {
  // Primary - Warm Coral (Core brand color, active tabs, action highlights)
  primary: {
    50: '#FFF3F0',
    100: '#FFE4DE',
    200: '#FFC4B7',
    300: '#FFA38E',
    400: '#FF856B',
    500: '#FF6B4A', // Core Primary
    600: '#D84323',
    700: '#A82E18', // Brick red
    800: '#7A1E0D',
    900: '#4A1208',
  },

  // Secondary - Deep Ink Navy (Headings, dark buttons, text primary)
  secondary: {
    50: '#F2F4FD',
    100: '#E3E2FF', // Lavender badge tint
    200: '#C7CDE6',
    300: '#9DA7D0', // Lavender slate accent
    400: '#7480B2',
    500: '#566290',
    600: '#3D476E',
    700: '#2A3150',
    800: '#1A1F36', // Core Secondary
    900: '#0E111E',
  },

  // Tertiary - Emerald Green (Badges, level indicator, success feedback)
  tertiary: {
    50: '#F1F8E9',
    100: '#E3EEDC', // Sage container tint
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50', // Core Tertiary
    600: '#388E3C',
    700: '#2E7D32',
    800: '#1B5E20',
    900: '#123E15',
  },

  // Neutral & Canvas (Warm Linen / Cream)
  neutral: {
    0: '#FFFFFF',
    50: '#FFFBF5', // Root Canvas (Linen)
    100: '#F4EFEA', // Card variant
    150: '#EFEBE4', // Secondary button fill
    200: '#E8DFD7', // Border subtle
    300: '#E0D8D1', // Card border standard
    400: '#C4BBB5', // Border strong
    500: '#9C918C', // Placeholder, inactive tabs
    600: '#766B67', // Warm muted gray
    700: '#524541', // Secondary body text
    800: '#3C312E', // Deep warm charcoal
    900: '#1A1F36', // Headings / high emphasis
  },

  // Semantic & Convenient Shortcuts
  canvas: '#FFFBF5',
  background: '#FFFBF5',
  surface: '#FFFFFF',
  surfaceVariant: '#F4EFEA',
  surfaceSubtle: '#EFEBE4',
  white: '#FFFFFF',
  black: '#000000',

  // Core brand aliases
  brandPrimary: '#FF6B4A',
  brandSecondary: '#1A1F36',
  brandTertiary: '#4CAF50',
  brandBrick: '#A82E18',

  // Text aliases
  textPrimary: '#1A1F36',
  textSecondary: '#766B67',
  textTertiary: '#9C918C',
  textMuted: '#9C918C',
  textSubhead: '#9DA7D0',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',

  // Cognitive Domain Colors
  domainMath: '#FF6B4A',
  domainLogic: '#1A1F36',
  domainPatterns: '#4CAF50',
  domainWords: '#A82E18',

  // State / Feedback
  success: '#4CAF50',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Border & Divider
  border: '#E8DFD7',
  borderStrong: '#C4BBB5',
  borderDivider: '#E0D8D1',

  // Shadow & Overlay
  shadowColor: 'rgba(26, 31, 54, 0.08)',
  overlay: 'rgba(26, 31, 54, 0.4)',
  modalOverlay: 'rgba(26, 31, 54, 0.6)',
} as const;

export type ColorToken = typeof Colors;
