// Canary Weather - Design System
// Zmień wartości HEX tutaj, aby zaktualizować cały wygląd aplikacji.

// ─── COLORS ───────────────────────────────────────────────────────────────────

export const colors = {
  // Brand
  primary: '#FF9500',
  primaryLight: '#FFB84D',
  primaryDark: '#CC7600',
  secondary: '#667eea',
  secondaryLight: '#8a9bef',
  secondaryDark: '#4a5fc7',
  accent: '#FFD93D',

  // Backgrounds
  background: '#0A0A0A',
  backgroundLight: '#1A1A1A',
  surface: 'rgba(255, 255, 255, 0.15)',
  surfaceElevated: 'rgba(255, 255, 255, 0.20)',
  surfaceHighlight: 'rgba(255, 255, 255, 0.25)',
  overlay: 'rgba(0, 0, 0, 0.35)',
  overlayDark: 'rgba(0, 0, 0, 0.4)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  textDisabled: 'rgba(255, 255, 255, 0.3)',

  // Weather states
  sun: '#FFD93D',
  sunDark: '#FF9500',
  rain: '#4DABF7',
  rainDark: '#1C7ED6',
  cloud: '#ADB5BD',
  cloudDark: '#868E96',

  // Temperature
  tempHot: '#FF6B6B',
  tempCold: '#4DABF7',

  // Semantic
  success: '#34C759',
  warning: '#FFCC00',
  error: '#FF3B30',
  info: '#007AFF',

  // Live indicator (Figma: green-400)
  liveGreen: '#4ade80',

  // Sun chance scale
  sunChanceHigh: '#FFD60A',
  sunChanceMedium: '#FF9F0A',
  sunChanceLow: '#FF6B6B',

  // Glass
  glassBg: 'rgba(255, 255, 255, 0.15)',
  glassBgCard: 'rgba(255, 255, 255, 0.20)',
  glassBgElevated: 'rgba(255, 255, 255, 0.25)',
  glassBorder: 'rgba(255, 255, 255, 0.25)',
  glassBorderLight: 'rgba(255, 255, 255, 0.3)',
  glassBorderBright: 'rgba(255, 255, 255, 0.35)',

  // Live badge (Figma)
  liveBadgeBg: 'rgba(255, 255, 255, 0.1)',
  liveBadgeBorder: 'rgba(255, 255, 255, 0.3)',

  // Medal ranks
  medalGold: '#FFD700',
  medalSilver: '#C0C0C0',
  medalBronze: '#CD7F32',
} as const;

// ─── SPACING ──────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ─── BORDER RADIUS ────────────────────────────────────────────────────────────

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

// ─── TYPOGRAPHY ───────────────────────────────────────────────────────────────

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 38,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    color: colors.textMuted,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  gaugePercent: {
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 42,
  },
  // Live card temperature (zmniejszone dla lepszego dopasowania)
  liveTemperature: {
    fontSize: 48,
    fontWeight: '700' as const,
    lineHeight: 52,
    letterSpacing: -1,
    color: '#FFFFFF',
  },
  // Wind info text (zmniejszone)
  liveInfo: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 18,
    color: '#FFFFFF',
  },
} as const;

// ─── SHADOWS ──────────────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  // Subtle shadow for glass cards
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  glow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  // Figma: Weather icon glow - drop-shadow(0 0 20px rgba(250, 204, 21, 0.6))
  weatherIconGlow: {
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  // Text shadow for readability on gradient backgrounds
  textReadable: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
} as const;

// ─── GLASSMORPHISM ────────────────────────────────────────────────────────────
// Unified glass design system - all cards use consistent borderRadius: 24

// Core glass tokens
export const glassTokens = {
  borderRadius: 24,
  borderColor: 'rgba(255, 255, 255, 0.2)',
  borderColorLight: 'rgba(255, 255, 255, 0.3)',
  bgDefault: 'rgba(255, 255, 255, 0.15)',
  bgSubtle: 'rgba(255, 255, 255, 0.1)',
  bgElevated: 'rgba(255, 255, 255, 0.18)',
  blurIntensity: 30,
} as const;

export const glass = {
  // Standard card - used for all content cards
  card: {
    backgroundColor: glassTokens.bgDefault,
    borderWidth: 1,
    borderColor: glassTokens.borderColor,
    borderRadius: glassTokens.borderRadius,
    overflow: 'hidden' as const,
  },
  // Subtle card - less prominent, same radius
  cardSubtle: {
    backgroundColor: glassTokens.bgSubtle,
    borderWidth: 1,
    borderColor: glassTokens.borderColor,
    borderRadius: glassTokens.borderRadius,
    overflow: 'hidden' as const,
  },
  // Elevated card - more prominent
  elevated: {
    backgroundColor: glassTokens.bgElevated,
    borderWidth: 1,
    borderColor: glassTokens.borderColorLight,
    borderRadius: glassTokens.borderRadius,
    overflow: 'hidden' as const,
  },
  // Search input - capsule shape with full blur
  searchInput: {
    backgroundColor: glassTokens.bgSubtle,
    borderWidth: 1,
    borderColor: glassTokens.borderColor,
    borderRadius: glassTokens.borderRadius,
    overflow: 'hidden' as const,
  },
  // Standard input field
  input: {
    backgroundColor: glassTokens.bgSubtle,
    borderWidth: 1,
    borderColor: glassTokens.borderColor,
    borderRadius: glassTokens.borderRadius,
    overflow: 'hidden' as const,
  },
  // Button style
  button: {
    backgroundColor: glassTokens.bgSubtle,
    borderWidth: 1,
    borderColor: glassTokens.borderColor,
    borderRadius: glassTokens.borderRadius,
    overflow: 'hidden' as const,
  },
  // Month selector chips
  chip: {
    backgroundColor: glassTokens.bgSubtle,
    borderRadius: borderRadius.md,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  // Blur intensity for BlurView
  blurIntensity: glassTokens.blurIntensity,
} as const;

// Glass text colors
export const glassText = {
  primary: '#FFFFFF',
  secondary: 'rgba(255, 255, 255, 0.7)',
  muted: 'rgba(255, 255, 255, 0.5)',
} as const;

// ─── GRADIENTS ────────────────────────────────────────────────────────────────

export const gradients = {
  // FIGMA: Main app background gradient
  main: ['#001645', '#4B9AC6'] as const,

  // Time-of-day backgrounds (SearchScreen) - legacy, kept for reference
  morning: ['#FF9A9E', '#FECFEF', '#FECFEF'] as const,
  day: ['#667eea', '#764ba2', '#f093fb'] as const,
  evening: ['#fa709a', '#fee140', '#fa709a'] as const,
  night: ['#0c1445', '#1a237e', '#311b92'] as const,

  // Weather-based backgrounds (ResultScreen)
  sunny: ['#FFD93D', '#FF9500', '#FF6B35'] as const,
  mixed: ['#667eea', '#764ba2', '#f093fb'] as const,
  cloudy: ['#4B6CB7', '#182848', '#4B6CB7'] as const,
} as const;

// ─── LIVE WEATHER CARD DIMENSIONS (Figma) ────────────────────────────────────

export const liveCard = {
  minHeight: 200,
  padding: 20,
  borderRadius: 24,
  weatherIconSize: 64,
  windIconSize: 18,
  liveDotSize: 8,
} as const;

// ─── ANIMATION ────────────────────────────────────────────────────────────────

export const animation = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
    gauge: 800,
  },
} as const;

// ─── ISLAND THEMES ────────────────────────────────────────────────────────────

export interface IslandTheme {
  name: string;
  gradient: readonly [string, string, string];
  accent: string;
  icon: string;
}

const islandThemes: Record<string, IslandTheme> = {
  'Tenerife': {
    name: 'Tenerife',
    gradient: ['#667eea', '#764ba2', '#f093fb'],
    accent: '#764ba2',
    icon: 'mountain',
  },
  'Gran Canaria': {
    name: 'Gran Canaria',
    gradient: ['#FFD93D', '#FF9500', '#FF6B35'],
    accent: '#FF9500',
    icon: 'beach',
  },
  'Lanzarote': {
    name: 'Lanzarote',
    gradient: ['#D4451A', '#8B2500', '#1A1A1A'],
    accent: '#D4451A',
    icon: 'terrain',
  },
  'Fuerteventura': {
    name: 'Fuerteventura',
    gradient: ['#F4A460', '#DEB887', '#C19A6B'],
    accent: '#DEB887',
    icon: 'surfing',
  },
  'La Palma': {
    name: 'La Palma',
    gradient: ['#2D6A4F', '#40916C', '#52B788'],
    accent: '#40916C',
    icon: 'palm-tree',
  },
  'La Gomera': {
    name: 'La Gomera',
    gradient: ['#1B4332', '#2D6A4F', '#40916C'],
    accent: '#2D6A4F',
    icon: 'forest',
  },
  'El Hierro': {
    name: 'El Hierro',
    gradient: ['#023E8A', '#0077B6', '#00B4D8'],
    accent: '#0077B6',
    icon: 'water',
  },
};

const defaultIslandTheme: IslandTheme = {
  name: 'Canarias',
  gradient: ['#667eea', '#764ba2', '#f093fb'],
  accent: colors.primary,
  icon: 'sunny',
};

/**
 * Returns a color theme specific to the given Canary Island.
 * Use for per-island gradient backgrounds and accent colors.
 */
export function getIslandTheme(islandName: string): IslandTheme {
  return islandThemes[islandName] ?? defaultIslandTheme;
}

// ─── WEATHER GRADIENT HELPER ──────────────────────────────────────────────────

/**
 * Returns a gradient based on sun chance percentage.
 */
export function getWeatherGradient(sunChance: number): readonly [string, string, string] {
  if (sunChance >= 70) return gradients.sunny;
  if (sunChance >= 40) return gradients.mixed;
  return gradients.cloudy;
}

/**
 * Returns the time-of-day gradient for the SearchScreen background.
 */
export function getTimeGradient(): readonly [string, string, string] {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return gradients.morning;
  if (hour >= 12 && hour < 18) return gradients.day;
  if (hour >= 18 && hour < 21) return gradients.evening;
  return gradients.night;
}

// ─── SUN CHANCE COLOR HELPER ──────────────────────────────────────────────────

export function getSunChanceColor(percentage: number): string {
  if (percentage >= 70) return colors.sunChanceHigh;
  if (percentage >= 40) return colors.sunChanceMedium;
  return colors.sunChanceLow;
}

// ─── COMBINED THEME OBJECT (backwards compat) ─────────────────────────────────

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  glass,
  glassTokens,
  glassText,
  gradients,
  animation,
  liveCard,
} as const;

export type Theme = typeof theme;
