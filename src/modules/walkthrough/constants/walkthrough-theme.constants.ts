/**
 * Standardized styling constants for all walkthrough overlays.
 * Aligned with the Reports walkthrough design (vivid #00A3FF spotlight & next button, neutral dark backdrop).
 */
export const WALKTHROUGH_THEME = {
  /** Vivid electric cyan/sky blue outline highlighting target components */
  spotlightBorder: "#00A3FF",
  /** Pure neutral dark backdrop scrim with zero color tint */
  backdropFill: "rgba(0, 0, 0, 0.72)",
  /** Action / Next button vibrant blue background matching the spotlight */
  nextButtonBg: "#00A3FF",
  /** Crisp white text for the Next button */
  nextButtonText: "#FFFFFF",
  /** Semi-transparent badge background */
  badgeBg: "rgba(0, 163, 255, 0.12)",
  /** Accent color for step badge text */
  badgeText: "#00A3FF",
} as const;
