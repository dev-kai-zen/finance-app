import type { LayoutRect } from "../types/walkthrough.types";

export const WALKTHROUGH_SCROLL_TOP_OFFSET = 90;
export const WALKTHROUGH_VIEWPORT_TOP_INSET = 12;
/** Room for tooltip below target and floating FAB / tour chip. */
export const WALKTHROUGH_VIEWPORT_BOTTOM_INSET = 220;

export function isWalkthroughTargetVisible(
  layout: LayoutRect,
  windowHeight: number,
  safeAreaInsets: { top: number; bottom: number },
): boolean {
  const visibleTop = safeAreaInsets.top + WALKTHROUGH_VIEWPORT_TOP_INSET;
  const visibleBottom =
    windowHeight - safeAreaInsets.bottom - WALKTHROUGH_VIEWPORT_BOTTOM_INSET;
  const targetTop = layout.y;
  const targetBottom = layout.y + layout.height;

  if (visibleBottom <= visibleTop) {
    return true;
  }

  return targetTop >= visibleTop && targetBottom <= visibleBottom;
}
