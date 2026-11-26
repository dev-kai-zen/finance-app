const test = require("node:test");
const assert = require("node:assert/strict");

// Pure representation of CalendarSchedulesTab status mapping and action evaluation logic
function evaluateScheduleOccurrenceUI(item) {
  // 1. Badge evaluation
  let badgeType = "upcoming";
  let badgeLabel = "Upcoming";

  if (item.status === "due") {
    badgeType = "due";
    badgeLabel = "Due Now";
  } else if (item.status === "failed") {
    badgeType = "failed";
    badgeLabel = "Failed";
  } else if (item.status === "posted") {
    badgeType = "posted";
    badgeLabel = "Posted";
  } else if (item.status === "skipped") {
    badgeType = "skipped";
    badgeLabel = "Skipped";
  }

  // 2. Actionability evaluation
  const isActionable =
    (item.status === "due" || item.status === "failed") && !item.isProjected;

  let postButtonLabel = null;
  let postButtonIcon = null;
  let skipButtonAvailable = false;

  if (isActionable) {
    skipButtonAvailable = true;
    if (item.status === "failed") {
      postButtonLabel = "Retry";
      postButtonIcon = "RotateCcw";
    } else {
      postButtonLabel = "Post";
      postButtonIcon = "Check";
    }
  }

  return {
    badgeType,
    badgeLabel,
    isActionable,
    postButtonLabel,
    postButtonIcon,
    skipButtonAvailable,
    errorMessage: item.status === "failed" ? item.errorMessage ?? null : null,
  };
}

test("CAL-F05: Failed occurrence displays Failed badge and offers Retry and Skip actions", () => {
  const failedItem = {
    id: "occ-failed-1",
    scheduleId: "sched-1",
    scheduleName: "Internet Bill",
    status: "failed",
    isProjected: false,
    errorMessage: "Maintaining balance restriction violated",
  };

  const ui = evaluateScheduleOccurrenceUI(failedItem);

  assert.equal(ui.badgeType, "failed");
  assert.equal(ui.badgeLabel, "Failed", "Failed occurrence must NEVER display as Upcoming");
  assert.equal(ui.isActionable, true, "Failed occurrence must be actionable for manual recovery");
  assert.equal(ui.postButtonLabel, "Retry");
  assert.equal(ui.postButtonIcon, "RotateCcw");
  assert.equal(ui.skipButtonAvailable, true);
  assert.equal(ui.errorMessage, "Maintaining balance restriction violated");
});

test("CAL-F05: Due occurrence displays Due Now badge and offers Post and Skip actions", () => {
  const dueItem = {
    id: "occ-due-1",
    scheduleId: "sched-2",
    scheduleName: "Gym Membership",
    status: "due",
    isProjected: false,
    errorMessage: null,
  };

  const ui = evaluateScheduleOccurrenceUI(dueItem);

  assert.equal(ui.badgeType, "due");
  assert.equal(ui.badgeLabel, "Due Now");
  assert.equal(ui.isActionable, true);
  assert.equal(ui.postButtonLabel, "Post");
  assert.equal(ui.postButtonIcon, "Check");
  assert.equal(ui.skipButtonAvailable, true);
});

test("CAL-F05: Posted occurrence displays Posted badge and has no action buttons", () => {
  const postedItem = {
    id: "occ-posted-1",
    scheduleId: "sched-3",
    scheduleName: "Salary Deposit",
    status: "posted",
    isProjected: false,
  };

  const ui = evaluateScheduleOccurrenceUI(postedItem);

  assert.equal(ui.badgeType, "posted");
  assert.equal(ui.badgeLabel, "Posted");
  assert.equal(ui.isActionable, false, "Posted occurrence must not be actionable");
  assert.equal(ui.postButtonLabel, null);
  assert.equal(ui.skipButtonAvailable, false);
});

test("CAL-F05: Skipped occurrence displays Skipped badge and has no action buttons", () => {
  const skippedItem = {
    id: "occ-skipped-1",
    scheduleId: "sched-4",
    scheduleName: "Streaming Service",
    status: "skipped",
    isProjected: false,
  };

  const ui = evaluateScheduleOccurrenceUI(skippedItem);

  assert.equal(ui.badgeType, "skipped");
  assert.equal(ui.badgeLabel, "Skipped");
  assert.equal(ui.isActionable, false, "Skipped occurrence must not be actionable");
  assert.equal(ui.postButtonLabel, null);
  assert.equal(ui.skipButtonAvailable, false);
});

test("CAL-F05: Projected upcoming occurrence displays Upcoming badge and has no action buttons", () => {
  const upcomingItem = {
    id: "proj-1",
    scheduleId: "sched-5",
    scheduleName: "Future Rent",
    status: "upcoming",
    isProjected: true,
  };

  const ui = evaluateScheduleOccurrenceUI(upcomingItem);

  assert.equal(ui.badgeType, "upcoming");
  assert.equal(ui.badgeLabel, "Upcoming");
  assert.equal(ui.isActionable, false, "Projected upcoming occurrence must not be actionable");
  assert.equal(ui.postButtonLabel, null);
  assert.equal(ui.skipButtonAvailable, false);
});
