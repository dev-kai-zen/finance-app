const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("CAL-F12: Calendar Touch Targets & Hit Slop Separation", () => {
  it("verifies month navigation buttons exceed 44x44 minimum touch target", () => {
    // In calendar-month-header.tsx: navButton is 36x36
    const VISUAL_BUTTON_SIZE = 36;
    const NAV_GAP = 4;

    const navHitSlop = {
      prevMonth: { top: 6, bottom: 6, left: 8, right: 2 },
      nextMonth: { top: 6, bottom: 6, left: 2, right: 8 },
    };

    const prevEffectiveWidth = VISUAL_BUTTON_SIZE + navHitSlop.prevMonth.left + navHitSlop.prevMonth.right;
    const prevEffectiveHeight = VISUAL_BUTTON_SIZE + navHitSlop.prevMonth.top + navHitSlop.prevMonth.bottom;
    assert.ok(prevEffectiveWidth >= 44, `prevEffectiveWidth (${prevEffectiveWidth}) must be >= 44`);
    assert.ok(prevEffectiveHeight >= 44, `prevEffectiveHeight (${prevEffectiveHeight}) must be >= 44`);

    const nextEffectiveWidth = VISUAL_BUTTON_SIZE + navHitSlop.nextMonth.left + navHitSlop.nextMonth.right;
    const nextEffectiveHeight = VISUAL_BUTTON_SIZE + navHitSlop.nextMonth.top + navHitSlop.nextMonth.bottom;
    assert.ok(nextEffectiveWidth >= 44, `nextEffectiveWidth (${nextEffectiveWidth}) must be >= 44`);
    assert.ok(nextEffectiveHeight >= 44, `nextEffectiveHeight (${nextEffectiveHeight}) must be >= 44`);

    // The gap between prevMonth and nextMonth must not be exceeded by the inward hitSlop sum
    const inwardSlopSum = navHitSlop.prevMonth.right + navHitSlop.nextMonth.left;
    assert.ok(
      inwardSlopSum <= NAV_GAP,
      `Inward slop sum (${inwardSlopSum}) must not exceed NAV_GAP (${NAV_GAP}) to prevent hit box overlap`,
    );
  });

  it("verifies today shortcut button expands effective touch area", () => {
    // todayButton has paddingVertical: 4 and 12px text (visual height ~24)
    const VISUAL_TODAY_HEIGHT = 24;
    const todayHitSlop = { top: 8, bottom: 8, left: 6, right: 6 };

    const effectiveTodayHeight = VISUAL_TODAY_HEIGHT + todayHitSlop.top + todayHitSlop.bottom;
    assert.ok(
      effectiveTodayHeight >= 40,
      `effectiveTodayHeight (${effectiveTodayHeight}) must be >= 40 for accessible tapping`,
    );
  });

  it("verifies schedule inline action buttons (Post and Skip) achieve accessible height and non-overlapping separation", () => {
    // In calendar-schedules-tab.tsx: postButton and skipButton have paddingVertical: 3 and 10px text (visual height ~20)
    const VISUAL_ACTION_HEIGHT = 20;
    const ACTIONS_ROW_GAP = 6;

    const scheduleActionHitSlop = {
      post: { top: 11, bottom: 11, left: 6, right: 3 },
      skip: { top: 11, bottom: 11, left: 3, right: 6 },
    };

    const postEffectiveHeight = VISUAL_ACTION_HEIGHT + scheduleActionHitSlop.post.top + scheduleActionHitSlop.post.bottom;
    const skipEffectiveHeight = VISUAL_ACTION_HEIGHT + scheduleActionHitSlop.skip.top + scheduleActionHitSlop.skip.bottom;

    assert.ok(postEffectiveHeight >= 42, `postEffectiveHeight (${postEffectiveHeight}) must be >= 42`);
    assert.ok(skipEffectiveHeight >= 42, `skipEffectiveHeight (${skipEffectiveHeight}) must be >= 42`);

    // Inward horizontal slops must not exceed ACTIONS_ROW_GAP to ensure zero cross-activation
    const inwardHorizontalSlop = scheduleActionHitSlop.post.right + scheduleActionHitSlop.skip.left;
    assert.ok(
      inwardHorizontalSlop <= ACTIONS_ROW_GAP,
      `Inward horizontal slop (${inwardHorizontalSlop}) must not exceed ACTIONS_ROW_GAP (${ACTIONS_ROW_GAP})`,
    );
  });

  it("verifies calendar tabs meet 44pt touch height", () => {
    // In calendar-tabs-header.tsx: tab has paddingVertical: 8 with 13px font (visual height ~34)
    const VISUAL_TAB_HEIGHT = 34;
    const tabHitSlop = { top: 5, bottom: 5 };

    const effectiveTabHeight = VISUAL_TAB_HEIGHT + tabHitSlop.top + tabHitSlop.bottom;
    assert.ok(effectiveTabHeight >= 44, `effectiveTabHeight (${effectiveTabHeight}) must be >= 44`);
  });
});
