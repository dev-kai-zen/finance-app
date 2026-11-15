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

function resolveToastOffset(position, insets) {
  if (position === "top") {
    return Math.max(12, (insets.top ?? 0) + 8);
  }
  return Math.max(16, (insets.bottom ?? 0) + 12);
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
  assert.equal(resolveToastOffset("top", notchInsets), 52); // 44 + 8
  assert.equal(resolveToastOffset("bottom", notchInsets), 46); // 34 + 12
});

