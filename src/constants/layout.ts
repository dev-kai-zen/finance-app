import type { ThemeSpacing } from "./theme";

export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

export const LAYOUT_DIMENSIONS = {
  sidebarWidth: 260,
  topBarHeight: 64,
  maxContentWidth: 1200,
  minTouchTarget: 44,
  drawerWidth: 280,
  fabSize: 60,
  syncChipHeight: 32,
} as const;

/**
 * Check if the current screen width is considered tablet or larger.
 * Persistent sidebar displays from tablet breakpoint upward.
 */
export function isTabletOrDesktop(width: number): boolean {
  return width >= BREAKPOINTS.tablet;
}

/**
 * Check if the current screen width is considered desktop or larger.
 */
export function isDesktop(width: number): boolean {
  return width >= BREAKPOINTS.desktop;
}

/**
 * Check if the current screen width is extra wide.
 */
export function isWide(width: number): boolean {
  return width >= BREAKPOINTS.wide;
}

/**
 * Determine the appropriate horizontal page gutter based on screen width.
 */
export function getResponsiveGutter(width: number, spacing: ThemeSpacing): number {
  if (width >= BREAKPOINTS.desktop) {
    return spacing.xxl; // 32
  }
  if (width >= BREAKPOINTS.tablet) {
    return spacing.xl; // 24
  }
  return spacing.lg; // 16
}
