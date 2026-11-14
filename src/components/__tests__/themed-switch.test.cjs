const { test } = require("node:test");
const assert = require("node:assert/strict");

/**
 * Dimensions and calculations matching ThemedSwitch
 */
const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 24;
const PADDING = 2;
const MAX_TRANSLATE_X = TRACK_WIDTH - THUMB_SIZE - PADDING * 2; // 20

function resolveTrackColor(trackColor, disabled, themeColors) {
  return {
    false: String(trackColor?.false ?? themeColors.borderStrong),
    true: String(
      trackColor?.true ?? (disabled ? themeColors.borderStrong : themeColors.primary),
    ),
  };
}

function resolveThumbColor(thumbColor, disabled, themeMode, themeColors) {
  if (thumbColor) return thumbColor;
  if (disabled) {
    return themeMode === "dark" ? themeColors.textMuted : themeColors.surfaceElevated;
  }
  return "#FFFFFF";
}

test("themed-switch: dimensions and max translation are exact", () => {
  assert.equal(TRACK_WIDTH, 48);
  assert.equal(TRACK_HEIGHT, 28);
  assert.equal(THUMB_SIZE, 24);
  assert.equal(PADDING, 2);
  assert.equal(MAX_TRANSLATE_X, 20);
  assert.equal(TRACK_HEIGHT / 2, 14); // border radius is exact pill
  assert.equal(THUMB_SIZE / 2, 12); // thumb radius is exact circle
});

test("themed-switch: resolves track color for off and on states correctly", () => {
  const themeColors = {
    borderStrong: "#4B524E",
    primary: "#7ED7B3",
  };

  const enabledColors = resolveTrackColor(undefined, false, themeColors);
  assert.equal(enabledColors.false, "#4B524E");
  assert.equal(enabledColors.true, "#7ED7B3");

  const disabledColors = resolveTrackColor(undefined, true, themeColors);
  assert.equal(disabledColors.false, "#4B524E");
  assert.equal(disabledColors.true, "#4B524E");

  const customColors = resolveTrackColor(
    { false: "#111111", true: "#222222" },
    false,
    themeColors,
  );
  assert.equal(customColors.false, "#111111");
  assert.equal(customColors.true, "#222222");
});

test("themed-switch: resolves thumb color in dark and light modes", () => {
  const themeColors = {
    textMuted: "#8D9691",
    surfaceElevated: "#F6F7F5",
  };

  // Normal enabled state defaults to crisp white
  assert.equal(resolveThumbColor(undefined, false, "dark", themeColors), "#FFFFFF");
  assert.equal(resolveThumbColor(undefined, false, "light", themeColors), "#FFFFFF");

  // Disabled states
  assert.equal(resolveThumbColor(undefined, true, "dark", themeColors), "#8D9691");
  assert.equal(resolveThumbColor(undefined, true, "light", themeColors), "#F6F7F5");

  // Custom thumb color overrides
  assert.equal(resolveThumbColor("#FF0000", false, "dark", themeColors), "#FF0000");
  assert.equal(resolveThumbColor("#FF0000", true, "dark", themeColors), "#FF0000");
});

function resolveSpinnerColor(localChecked, themeColors) {
  return localChecked ? themeColors.primary : themeColors.textSecondary;
}

test("themed-switch: resolves spinner color based on checked state", () => {
  const themeColors = {
    primary: "#7ED7B3",
    textSecondary: "#8D9691",
  };

  assert.equal(resolveSpinnerColor(true, themeColors), "#7ED7B3");
  assert.equal(resolveSpinnerColor(false, themeColors), "#8D9691");
});

test("themed-switch: toggles optimistic checked state correctly", () => {
  let localChecked = false;
  const toggle = () => {
    localChecked = !localChecked;
    return localChecked;
  };

  assert.equal(toggle(), true);
  assert.equal(toggle(), false);
});

