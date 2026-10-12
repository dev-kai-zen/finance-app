const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(code, filename);
};

const {
  calculateScheduleOccurrence,
} = require("../utils/recurrence.ts");
const {
  filterSchedulesByStatus,
  getScheduleListFilter,
} = require("../utils/schedule-list-filter.ts");

function rule(overrides = {}) {
  return {
    startsAt: new Date("2028-01-31T09:00:00.000Z"),
    timeZone: "UTC",
    frequency: "monthly",
    intervalCount: 1,
    endMode: "never",
    maxOccurrences: null,
    endsOn: null,
    weekendPolicy: "next_weekday",
    anchorOccurrenceNumber: 1,
    ...overrides,
  };
}

test("scheduled transactions: monthly recurrence preserves the original month-end anchor", () => {
  const first = calculateScheduleOccurrence(rule(), 1);
  const second = calculateScheduleOccurrence(rule(), 2);
  const third = calculateScheduleOccurrence(rule(), 3);

  assert.equal(first.nominalAt.toISOString(), "2028-01-31T09:00:00.000Z");
  assert.equal(second.nominalAt.toISOString(), "2028-02-29T09:00:00.000Z");
  assert.equal(third.nominalAt.toISOString(), "2028-03-31T09:00:00.000Z");
});

test("scheduled transactions: yearly February 29 clamps only non-leap years", () => {
  const leapRule = rule({
    startsAt: new Date("2028-02-29T08:30:00.000Z"),
    frequency: "yearly",
  });

  assert.equal(
    calculateScheduleOccurrence(leapRule, 2).nominalAt.toISOString(),
    "2029-02-28T08:30:00.000Z",
  );
  assert.equal(
    calculateScheduleOccurrence(leapRule, 5).nominalAt.toISOString(),
    "2032-02-29T08:30:00.000Z",
  );
});

test("scheduled transactions: weekend policies retain nominal date and adjust execution", () => {
  const saturday = new Date("2028-01-01T10:00:00.000Z");
  const exact = calculateScheduleOccurrence(
    rule({ startsAt: saturday, frequency: "once", weekendPolicy: "exact" }),
    1,
  );
  const next = calculateScheduleOccurrence(
    rule({
      startsAt: saturday,
      frequency: "once",
      weekendPolicy: "next_weekday",
    }),
    1,
  );
  const previous = calculateScheduleOccurrence(
    rule({
      startsAt: saturday,
      frequency: "once",
      weekendPolicy: "previous_weekday",
    }),
    1,
  );
  const skipped = calculateScheduleOccurrence(
    rule({
      startsAt: saturday,
      frequency: "once",
      weekendPolicy: "skip",
    }),
    1,
  );

  assert.equal(exact.nominalAt.toISOString(), "2028-01-01T10:00:00.000Z");
  assert.equal(exact.effectiveAt.toISOString(), "2028-01-01T10:00:00.000Z");
  assert.equal(exact.skippedForWeekend, false);
  assert.equal(next.nominalAt.toISOString(), "2028-01-01T10:00:00.000Z");
  assert.equal(next.effectiveAt.toISOString(), "2028-01-03T10:00:00.000Z");
  assert.equal(
    previous.effectiveAt.toISOString(),
    "2027-12-31T10:00:00.000Z",
  );
  assert.equal(skipped.effectiveAt, null);
  assert.equal(skipped.skippedForWeekend, true);
});

test("scheduled transactions: occurrence limits are relative to an edited schedule anchor", () => {
  const editedRule = rule({
    anchorOccurrenceNumber: 7,
    endMode: "after_count",
    maxOccurrences: 2,
  });

  assert.ok(calculateScheduleOccurrence(editedRule, 7));
  assert.ok(calculateScheduleOccurrence(editedRule, 8));
  assert.equal(calculateScheduleOccurrence(editedRule, 9), null);
});

test("scheduled transactions: status filters separate active, completed, and archived schedules", () => {
  const active = { id: "active", status: "active", archivedAt: null };
  const paused = { id: "paused", status: "paused", archivedAt: null };
  const completed = { id: "completed", status: "completed", archivedAt: null };
  const archived = {
    id: "archived",
    status: "completed",
    archivedAt: new Date("2028-01-01T00:00:00.000Z"),
  };
  const schedules = [active, paused, completed, archived];

  assert.equal(getScheduleListFilter(active), "active");
  assert.equal(getScheduleListFilter(paused), "active");
  assert.equal(getScheduleListFilter(completed), "completed");
  assert.equal(getScheduleListFilter(archived), "archived");
  assert.deepEqual(
    filterSchedulesByStatus(schedules, new Set(["active"])).map(
      (schedule) => schedule.id,
    ),
    ["active", "paused"],
  );
  assert.deepEqual(
    filterSchedulesByStatus(
      schedules,
      new Set(["completed", "archived"]),
    ).map((schedule) => schedule.id),
    ["completed", "archived"],
  );
});

test("scheduled transactions: migration creates constrained schedule tables", () => {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  const journal = require("../../../../drizzle/meta/_journal.json");

  for (const entry of journal.entries) {
    const file = path.join(
      __dirname,
      "../../../../drizzle",
      entry.tag + ".sql",
    );
    const migration = fs.readFileSync(file, "utf8");
    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim()) database.exec(statement);
    }
  }

  const tables = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'transaction_schedule%' ORDER BY name",
    )
    .all()
    .map((row) => row.name);
  assert.deepEqual(tables, [
    "transaction_schedule_occurrences",
    "transaction_schedule_postings",
    "transaction_schedules",
  ]);

  const now = Date.now();
  database.exec(
    "INSERT INTO account_types (id, name, account_group, sort_order, icon_key, is_system, created_at, updated_at) " +
      "VALUES ('type_asset', 'Asset', 'asset', 0, 'wallet', 1, " +
      now +
      ", " +
      now +
      ");",
  );
  database.exec(
    "INSERT INTO accounts (id, account_type_id, name, currency_code, opening_balance_minor_units, opening_balance_at, pocket_enabled, is_archived, sort_order, created_at, updated_at) " +
      "VALUES ('account_1', 'type_asset', 'Checking', 'PHP', 0, " +
      now +
      ", 0, 0, 0, " +
      now +
      ", " +
      now +
      ");",
  );
  database.exec(
    "INSERT INTO categories (id, name, type, is_system, sort_order, created_at, updated_at) " +
      "VALUES ('category_1', 'Food', 'expense', 0, 0, " +
      now +
      ", " +
      now +
      ");",
  );

  const insertSchedule = database.prepare(
    "INSERT INTO transaction_schedules (" +
      "id, status, transaction_type, account_id, category_id, amount_minor_units, " +
      "frequency, interval_count, starts_at, time_zone, end_mode, weekend_policy, " +
      "auto_post, anchor_occurrence_number, next_occurrence_number, next_nominal_at, next_effective_at, created_at, updated_at" +
      ") VALUES (?, 'active', 'expense', ?, ?, ?, 'monthly', 1, ?, 'UTC', 'never', 'next_weekday', 1, 1, 1, ?, ?, ?, ?)",
  );
  insertSchedule.run(
    "schedule_1",
    "account_1",
    "category_1",
    10000,
    now,
    now,
    now,
    now,
    now,
  );

  const insertExactSchedule = database.prepare(
    "INSERT INTO transaction_schedules (" +
      "id, status, transaction_type, account_id, category_id, amount_minor_units, " +
      "frequency, interval_count, starts_at, time_zone, end_mode, weekend_policy, " +
      "auto_post, anchor_occurrence_number, next_occurrence_number, next_nominal_at, next_effective_at, created_at, updated_at" +
      ") VALUES (?, 'active', 'expense', ?, ?, ?, 'once', 1, ?, 'UTC', 'never', 'exact', 1, 1, 1, ?, ?, ?, ?)",
  );
  insertExactSchedule.run(
    "schedule_exact",
    "account_1",
    "category_1",
    10000,
    now,
    now,
    now,
    now,
    now,
  );
  const exactRow = database
    .prepare("SELECT weekend_policy FROM transaction_schedules WHERE id = 'schedule_exact'")
    .get();
  assert.equal(exactRow.weekend_policy, "exact");

  assert.throws(() =>
    database.prepare(
      "INSERT INTO transaction_schedules (" +
        "id, status, transaction_type, account_id, category_id, amount_minor_units, " +
        "frequency, interval_count, starts_at, time_zone, end_mode, weekend_policy, " +
        "auto_post, anchor_occurrence_number, next_occurrence_number, next_nominal_at, next_effective_at, created_at, updated_at" +
        ") VALUES ('invalid_weekend_policy', 'active', 'expense', 'account_1', 'category_1', 10000, 'monthly', 1, ?, 'UTC', 'never', 'invalid_policy', 1, 1, 1, ?, ?, ?, ?)",
    ).run(now, now, now, now, now),
  );

  assert.throws(() =>
    insertSchedule.run(
      "invalid_schedule",
      "account_1",
      null,
      10000,
      now,
      now,
      now,
      now,
      now,
    ),
  );

  const insertOccurrence = database.prepare(
    "INSERT INTO transaction_schedule_occurrences (" +
      "id, schedule_id, sequence_number, nominal_due_at, effective_due_at, template_snapshot, status, created_at, updated_at" +
      ") VALUES (?, 'schedule_1', 1, ?, ?, '{}', 'due', ?, ?)",
  );
  insertOccurrence.run("occurrence_1", now, now, now, now);
  assert.throws(() =>
    insertOccurrence.run("occurrence_duplicate", now, now, now, now),
  );

  database.exec(
    "INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, occurred_at, created_at, updated_at) " +
      "VALUES ('tx_1', 'account_1', 'category_1', 'expense', -10000, " +
      now +
      ", " +
      now +
      ", " +
      now +
      ");",
  );

  const insertPosting = database.prepare(
    "INSERT INTO transaction_schedule_postings (id, occurrence_id, transaction_id, created_at) " +
      "VALUES ('posting_1', 'occurrence_1', 'tx_1', ?)",
  );
  insertPosting.run(now);

  const postingExists = database
    .prepare(
      "SELECT 1 FROM transaction_schedule_postings WHERE id = 'posting_1'",
    )
    .get();
  assert.ok(postingExists);

  // Permanently deleting the transaction cascades and removes the posting
  database.exec("DELETE FROM transactions WHERE id = 'tx_1';");
  const postingAfterTxDelete = database
    .prepare(
      "SELECT 1 FROM transaction_schedule_postings WHERE id = 'posting_1'",
    )
    .get();
  assert.equal(postingAfterTxDelete, undefined);

  // But the occurrence still exists
  const occurrenceStillExists = database
    .prepare(
      "SELECT 1 FROM transaction_schedule_occurrences WHERE id = 'occurrence_1'",
    )
    .get();
  assert.ok(occurrenceStillExists);

  // Permanently deleting the schedule deletes the schedule and cascades occurrences
  database.exec("DELETE FROM transaction_schedules WHERE id = 'schedule_1';");
  const scheduleAfterDelete = database
    .prepare("SELECT 1 FROM transaction_schedules WHERE id = 'schedule_1'")
    .get();
  assert.equal(scheduleAfterDelete, undefined);
  const occurrenceAfterScheduleDelete = database
    .prepare(
      "SELECT 1 FROM transaction_schedule_occurrences WHERE id = 'occurrence_1'",
    )
    .get();
  assert.equal(occurrenceAfterScheduleDelete, undefined);
});

