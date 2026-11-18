const { test } = require("node:test");
const assert = require("node:assert/strict");

/**
 * Logic and calculations matching AppToast
 */
function resolveToastAccentColor(variant, themeColors) {
  switch (variant) {
    case "success":
      return themeColors.success;
    case "error":
      return themeColors.danger;
    case "warning":
      return themeColors.warning;
    case "info":
    default:
      return themeColors.primary;
  }
}

function resolveToastOffset(position, insets, includeSafeArea = false, offset) {
  if (offset !== undefined) {
    return offset;
  }
  if (position === "top") {
    return includeSafeArea ? Math.max(12, (insets?.top ?? 0) + 8) : 12;
  }
  return Math.max(16, (insets?.bottom ?? 0) + 12);
}

test("app-toast: resolves accent colors correctly for each variant", () => {
  const themeColors = {
    success: "#22C55E",
    danger: "#EF4444",
    warning: "#F59E0B",
    primary: "#3B82F6",
  };

  assert.equal(resolveToastAccentColor("success", themeColors), "#22C55E");
  assert.equal(resolveToastAccentColor("error", themeColors), "#EF4444");
  assert.equal(resolveToastAccentColor("warning", themeColors), "#F59E0B");
  assert.equal(resolveToastAccentColor("info", themeColors), "#3B82F6");
  assert.equal(resolveToastAccentColor(undefined, themeColors), "#3B82F6");
});

test("app-toast: resolves top and bottom safe area offsets accurately", () => {
  const zeroInsets = { top: 0, bottom: 0 };
  assert.equal(resolveToastOffset("top", zeroInsets), 12);
  assert.equal(resolveToastOffset("bottom", zeroInsets), 16);

  const notchInsets = { top: 44, bottom: 34 };
  // Default top offset without includeSafeArea places toast immediately below navbar (12px)
  assert.equal(resolveToastOffset("top", notchInsets), 12);
  // With includeSafeArea=true, top offset includes safe area insets (52px)
  assert.equal(resolveToastOffset("top", notchInsets, true), 52); // 44 + 8
  assert.equal(resolveToastOffset("bottom", notchInsets), 46); // 34 + 12

  // Custom offset overrides
  assert.equal(resolveToastOffset("top", notchInsets, false, 20), 20);
  assert.equal(resolveToastOffset("bottom", notchInsets, false, 30), 30);
});

