const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

function load(relative, dependencies) {
  const filename = path.resolve(__dirname, relative);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(
    code,
    {
      exports,
      require(id) {
        assert.ok(Object.hasOwn(dependencies, id), "Unexpected dependency: " + id);
        return dependencies[id];
      },
      console,
    },
    { filename },
  );
  return exports;
}

const progressService = load("../services/calculate-goal-progress.service.ts", {});

test("GOAL-F08: calculateGoalProgress handles below/reached/overfunded and manual completion", () => {
  const baseGoal = {
    id: "g1",
    name: "Savings Goal",
    note: null,
    targetAmountMinorUnits: 50000,
    currencyCode: "PHP",
    accountId: null,
    pocketId: null,
    accountIds: [],
    pocketIds: [],
    targetDate: null,
    iconKey: null,
    hexColorsId: null,
    status: "in_progress",
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 1. Underfunded active goal
  const underfundedActive = progressService.calculateGoalProgress({
    goal: { ...baseGoal, status: "in_progress" },
    currentAmountMinorUnits: 20000,
  });
  assert.equal(underfundedActive.isCompleted, false);
  assert.equal(underfundedActive.progressPercentage, 40);

  // 2. Underfunded manually completed goal
  const underfundedCompleted = progressService.calculateGoalProgress({
    goal: { ...baseGoal, status: "completed" },
    currentAmountMinorUnits: 20000,
  });
  assert.equal(underfundedCompleted.isCompleted, true);

  // 3. Exactly reached auto-completed goal
  const exactlyReached = progressService.calculateGoalProgress({
    goal: { ...baseGoal, status: "in_progress" },
    currentAmountMinorUnits: 50000,
  });
  assert.equal(exactlyReached.isCompleted, true);
  assert.equal(exactlyReached.progressPercentage, 100);

  // 4. Overfunded auto-completed goal
  const overfunded = progressService.calculateGoalProgress({
    goal: { ...baseGoal, status: "in_progress" },
    currentAmountMinorUnits: 75000,
  });
  assert.equal(overfunded.isCompleted, true);
  assert.equal(overfunded.isExceeded, true);
  assert.equal(overfunded.progressPercentage, 150);

  // 5. Balance falling again below target for in_progress vs completed
  const fallenBalance = 15000;
  const fallenActive = progressService.calculateGoalProgress({
    goal: { ...baseGoal, status: "in_progress" },
    currentAmountMinorUnits: fallenBalance,
  });
  assert.equal(fallenActive.isCompleted, false, "Active goal uncompletes when balance drops");

  const fallenManualCompleted = progressService.calculateGoalProgress({
    goal: { ...baseGoal, status: "completed" },
    currentAmountMinorUnits: fallenBalance,
  });
  assert.equal(
    fallenManualCompleted.isCompleted,
    true,
    "Manually completed goal stays completed even if balance drops",
  );
});

test("GOAL-F08 (UI Contract): GoalCard action selection eliminates no-op loop on reached goals", () => {
  const cardPath = path.resolve(__dirname, "../components/goal-card.tsx");
  const cardSource = fs.readFileSync(cardPath, "utf8");

  // Verify that GoalCard does not blindly show "Mark as In Progress" whenever isCompleted is true
  assert.ok(
    cardSource.includes("increaseTarget") || cardSource.includes("Increase Target"),
    "GoalCard must render 'Increase Target' for reached goals",
  );
  assert.ok(
    cardSource.includes("goal.currentAmountMinorUnits >= goal.targetAmountMinorUnits"),
    "GoalCard must check if balance reached target before choosing reopen vs increase target",
  );

  // AST inspection to verify exact JSX branch logic
  const sf = ts.createSourceFile(cardPath, cardSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let foundIncreaseTargetPressable = false;
  let foundMarkAsInProgressPressable = false;
  let foundMarkAsCompletedPressable = false;

  function visit(node) {
    if (ts.isJsxElement(node)) {
      const text = node.getText(sf);
      if (text.startsWith("<Pressable") && (text.includes("increaseTarget") || text.includes("Increase Target"))) {
        foundIncreaseTargetPressable = true;
        assert.ok(text.includes("onPress={onEdit}"), "Increase Target must invoke onEdit");
      }
      if (text.startsWith("<Pressable") && (text.includes("markAsInProgress") || text.includes("Mark as In Progress"))) {
        foundMarkAsInProgressPressable = true;
        assert.ok(
          text.includes('onToggleStatus("in_progress")'),
          "Mark as In Progress must toggle status to in_progress",
        );
      }
      if (text.startsWith("<Pressable") && (text.includes("markAsCompleted") || text.includes("Mark as Completed"))) {
        foundMarkAsCompletedPressable = true;
        assert.ok(
          text.includes('onToggleStatus("completed")'),
          "Mark as Completed must toggle status to completed",
        );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  assert.ok(foundIncreaseTargetPressable, "Found Increase Target Pressable in AST");
  assert.ok(foundMarkAsInProgressPressable, "Found Mark as In Progress Pressable in AST");
  assert.ok(foundMarkAsCompletedPressable, "Found Mark as Completed Pressable in AST");
});

test("GOAL-F08 (Notification Freshness): scheduleGoalReminders excludes reached goals from deadline alerts", async () => {
  const scheduledAlerts = [];
  const fakeNotifications = {
    SchedulableTriggerInputTypes: { DATE: "date" },
    getAllScheduledNotificationsAsync: async () => [],
    cancelScheduledNotificationAsync: async () => {},
    scheduleNotificationAsync: async (params) => {
      scheduledAlerts.push(params);
    },
  };

  const reminderService = load(
    "../../notifications/services/schedule-goal-reminders.service.ts",
    {
      "react-native": { Platform: { OS: "ios" } },
      "expo-notifications": fakeNotifications,
      "@/modules/goals": {
        getGoalsWithProgress: () => ({
          goals: [
            // 1. In progress, underfunded, deadline in 14 days (alert scheduled at day 7) -> SHOULD schedule
            {
              id: "g-active",
              name: "Active Goal",
              status: "in_progress",
              isCompleted: false,
              currentAmountMinorUnits: 20000,
              targetAmountMinorUnits: 50000,
              progressPercentage: 40,
              targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
            // 2. Reached goal (100%), deadline in 14 days -> MUST SKIP
            {
              id: "g-reached",
              name: "Reached Goal",
              status: "in_progress",
              isCompleted: true,
              currentAmountMinorUnits: 50000,
              targetAmountMinorUnits: 50000,
              progressPercentage: 100,
              targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
            // 3. Completed status goal -> MUST SKIP
            {
              id: "g-completed",
              name: "Completed Goal",
              status: "completed",
              isCompleted: true,
              currentAmountMinorUnits: 10000,
              targetAmountMinorUnits: 50000,
              progressPercentage: 20,
              targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
          ],
        }),
      },
      "../constants/reminder-settings.constants": {
        NOTIFICATION_CHANNELS: { DUE_DATES: { id: "due_dates" } },
        NOTIFICATION_IDENTIFIERS: { GOAL_DEADLINE_PREFIX: "goal-deadline-" },
      },
      "../types/notification.types": {},
    },
  );

  await reminderService.scheduleGoalReminders(true, new Date());

  assert.equal(scheduledAlerts.length, 1, "Only genuinely active, underfunded goal is scheduled");
  assert.ok(
    scheduledAlerts[0].identifier.includes("g-active"),
    "Scheduled alert must be for the active goal, not reached or completed goals",
  );
});
