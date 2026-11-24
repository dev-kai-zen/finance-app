const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const { DatabaseSync } = require("node:sqlite");

const root = path.resolve(__dirname, "../../..");
let sqlite;
let database;
let queries = [];

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    parent,
    ...rest,
  );
};

const createMock = () => {
  const fn = () => createMock();
  return new Proxy(fn, {
    get: (_target, prop) => {
      if (prop === Symbol.toPrimitive) return () => "";
      if (prop === "create") return (s) => s || {};
      return createMock();
    },
  });
};

const originalLoad = Module._load;
Module._load = function (request, ...args) {
  if (request === "@/infrastructure/database/client") {
    return {
      get db() {
        return database;
      },
    };
  }
  if (request.includes("drizzle/migrations") || request.endsWith("migrations")) {
    return {};
  }
  if (
    request.startsWith("expo") ||
    request.startsWith("@expo") ||
    request.startsWith("react-native") ||
    request.startsWith("react") ||
    request === "lucide-react-native"
  ) {
    return createMock();
  }
  return originalLoad.call(this, request, ...args);
};

require.extensions[".tsx"] = require.extensions[".ts"] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  module._compile(code, filename);
};

function aliasSelectColumns(query) {
  const selectMatch = query.match(/^\s*select\s+/i);
  if (!selectMatch) return query;
  const selectStart = selectMatch[0].length;
  let depth = 0;
  let quote = null;
  let fromStart = -1;

  for (let index = selectStart; index < query.length; index += 1) {
    const char = query[index];
    if (quote) {
      if (char === quote && query[index - 1] !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (depth === 0 && /^\sfrom\s/i.test(query.slice(index))) {
      fromStart = index;
      break;
    }
  }

  if (fromStart < 0) return query;
  const selectList = query.slice(selectStart, fromStart);
  const columns = [];
  let columnStart = 0;
  depth = 0;
  quote = null;
  for (let index = 0; index <= selectList.length; index += 1) {
    const char = selectList[index];
    if (quote) {
      if (char === quote && selectList[index - 1] !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if ((char === "," && depth === 0) || index === selectList.length) {
      columns.push(selectList.slice(columnStart, index).trim());
      columnStart = index + 1;
    }
  }

  return `${query.slice(0, selectStart)}${columns
    .map((column, index) =>
      `${column.replace(/\s+as\s+"[^"]+"\s*$/i, "")} AS "__raw_${index}"`,
    )
    .join(", ")}${query.slice(fromStart)}`;
}

const { drizzle } = require("drizzle-orm/expo-sqlite");
const schema = require("@/infrastructure/database/schema");

function setupTestDb() {
  sqlite = new DatabaseSync(":memory:");
  queries = [];

  const migrationDir = path.resolve(root, "../drizzle");
  const migrationFiles = fs
    .readdirSync(migrationDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sqlContent = fs.readFileSync(path.join(migrationDir, file), "utf8");
    for (const stmt of sqlContent.split("--> statement-breakpoint")) {
      const trimmed = stmt.trim();
      if (trimmed) {
        sqlite.exec(trimmed);
      }
    }
  }

  database = drizzle(
    {
      prepareSync(query) {
        queries.push(query);
        return {
          executeSync(params) {
            const stmt = sqlite.prepare(query);
            if (
              /^\s*(select|pragma|with)\b/i.test(query) ||
              /\breturning\b/i.test(query)
            ) {
              const rows = stmt.all(...params);
              return {
                getAllSync: () => rows,
                getFirstSync: () => rows[0] ?? null,
              };
            }
            const result = stmt.run(...params);
            return {
              changes: Number(result.changes),
              lastInsertRowId: Number(result.lastInsertRowid),
            };
          },
          executeForRawResultSync(params) {
            const stmt = sqlite.prepare(aliasSelectColumns(query));
            const rows = stmt.all(...params);
            return { getAllSync: () => rows.map((row) => Object.values(row)) };
          },
        };
      },
    },
    { schema },
  );

  const now = Date.now();
  sqlite.exec(`
    INSERT INTO account_types (id, name, account_group, sort_order, icon_key, is_system, created_at, updated_at)
    VALUES ('act_dep', 'Deposit', 'asset', 0, 'landmark', 1, ${now}, ${now});
  `);
  sqlite.exec(`
    INSERT INTO accounts (id, account_type_id, name, currency_code, opening_balance_minor_units, opening_balance_at, is_archived, sort_order, created_at, updated_at)
    VALUES ('acc_1', 'act_dep', 'Checking Account', 'PHP', 100000, ${now}, 0, 0, ${now}, ${now});
  `);
  sqlite.exec(`
    INSERT INTO categories (id, name, type, icon, is_system, sort_order, created_at, updated_at)
    VALUES ('cat_dining', 'Dining', 'expense', 'utensils', 1, 0, ${now}, ${now}),
           ('cat_groceries', 'Groceries', 'expense', 'shopping-cart', 1, 1, ${now}, ${now});
  `);

  return database;
}

const {
  listInstallmentsForPlans,
  listBilledInstallmentIdsForPlans,
} = require("../repositories/credit-card-billing.repository");
const {
  getInstallmentPlanEditState,
} = require("../services/get-installment-plan-edit-state.service");
const {
  reconcileCreditCardBilling,
} = require("../services/reconcile-credit-card-billing.service");

function fixture() {
  const db = setupTestDb();
  const today = new Date(2026, 10, 21, 12);
  const occurred = new Date(2026, 10, 5, 12).getTime();
  sqlite
    .prepare(
      "INSERT INTO accounts (id, account_type_id, name, currency_code, opening_balance_minor_units, opening_balance_at, created_at, updated_at) VALUES ('card', 'system:liability:credit-card', 'Test Card', 'PHP', 0, ?, ?, ?)",
    )
    .run(occurred, occurred, occurred);
  sqlite.exec(
    "INSERT INTO credit_card_details (account_id, credit_limit_minor_units, statement_day, payment_due_day) VALUES ('card', 5000000, 10, 25)",
  );

  return { db, today, occurred };
}

test("CC-F07: 120-month installment plan edit state executes exactly 3 SQL queries instead of 123", () => {
  const { db, occurred } = fixture();
  const now = Date.now();
  sqlite
    .prepare(
      "INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, name, occurred_at, created_at, updated_at) VALUES ('tx_120', 'card', 'cat_dining', 'expense', -1200000, 'Big Purchase', ?, ?, ?)",
    )
    .run(occurred, occurred, occurred);
  sqlite
    .prepare(
      "INSERT INTO credit_card_installment_plans (id, account_id, purchase_transaction_id, term_months, principal_minor_units, first_statement_on, deferred_months, status, created_at, updated_at) VALUES ('plan_120', 'card', 'tx_120', 120, 1200000, '2026-11-10', 0, 'active', ?, ?)",
    )
    .run(now, now);

  // Insert 120 scheduled installments
  for (let i = 1; i <= 120; i++) {
    const month = String(((i - 1) % 12) + 1).padStart(2, "0");
    const year = 2026 + Math.floor((i - 1) / 12);
    sqlite
      .prepare(
        "INSERT INTO credit_card_installments (id, plan_id, installment_number, scheduled_statement_on, principal_minor_units, interest_minor_units, fee_minor_units, created_at) VALUES (?, 'plan_120', ?, ?, 10000, 0, 0, ?)",
      )
      .run(`inst_${i}`, i, `${year}-${month}-10`, now);
  }

  // Clear tracked queries before checking edit state
  queries = [];
  const state = getInstallmentPlanEditState("tx_120", db);

  assert.equal(state.plan?.id, "plan_120");
  assert.equal(state.billedInstallmentCount, 0);
  assert.equal(state.canModifyInstallmentPlan, true);
  assert.equal(state.hasChargeStatementEntry, false);

  // Assert exactly 3 SQL queries were executed:
  // 1: findInstallmentPlanByTransactionId
  // 2: listEntriesForTransaction
  // 3: listBilledInstallmentIdsForPlans (single batched query)
  // (Previously this executed 123 queries!)
  assert.equal(
    queries.length,
    3,
    `Expected exactly 3 queries for 120-month plan, got ${queries.length}`,
  );
});

test("CC-F07: edit state detects billed installments with a single batched query", () => {
  const { db, occurred } = fixture();
  const now = Date.now();
  sqlite
    .prepare(
      "INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, name, occurred_at, created_at, updated_at) VALUES ('tx_plan', 'card', 'cat_dining', 'expense', -600000, 'Purchase', ?, ?, ?)",
    )
    .run(occurred, occurred, occurred);
  sqlite
    .prepare(
      "INSERT INTO credit_card_installment_plans (id, account_id, purchase_transaction_id, term_months, principal_minor_units, first_statement_on, deferred_months, status, created_at, updated_at) VALUES ('plan_billed', 'card', 'tx_plan', 60, 600000, '2026-11-10', 0, 'active', ?, ?)",
    )
    .run(now, now);

  for (let i = 1; i <= 60; i++) {
    sqlite
      .prepare(
        "INSERT INTO credit_card_installments (id, plan_id, installment_number, scheduled_statement_on, principal_minor_units, interest_minor_units, fee_minor_units, created_at) VALUES (?, 'plan_billed', ?, '2026-11-10', 10000, 0, 0, ?)",
      )
      .run(`inst_billed_${i}`, i, now);
  }

  // Create a statement and bill 3 installments
  sqlite
    .prepare(
      "INSERT INTO credit_card_statements (id, account_id, kind, cycle_start_on, cycle_end_on, statement_on, due_on, issued_amount_minor_units, created_at, updated_at) VALUES ('stmt_1', 'card', 'billing_cycle', '2026-10-11', '2026-11-10', '2026-11-10', '2026-11-25', 30000, ?, ?)",
    )
    .run(now, now);
  for (let i = 1; i <= 3; i++) {
    sqlite
      .prepare(
        "INSERT INTO credit_card_statement_entries (id, statement_id, transaction_id, installment_id, entry_type, amount_minor_units, description_snapshot, occurred_on_snapshot, created_at) VALUES (?, 'stmt_1', 'tx_plan', ?, 'installment', 10000, 'Installment', '2026-11-10', ?)",
      )
      .run(`entry_${i}`, `inst_billed_${i}`, now);
  }

  queries = [];
  const state = getInstallmentPlanEditState("tx_plan", db);

  assert.equal(state.billedInstallmentCount, 3);
  assert.equal(state.canModifyInstallmentPlan, false);
  assert.equal(queries.length, 3);
});

test("CC-F07: listInstallmentsForPlans chunks 501+ plan IDs at 500 without exceeding parameter limits", () => {
  const { db } = fixture();
  const planIds = Array.from({ length: 505 }, (_, i) => `plan_chunk_${i}`);

  queries = [];
  const results = listInstallmentsForPlans(planIds, db);

  assert.equal(Array.isArray(results), true);
  // Verify 2 chunked queries were executed (500 + 5)
  const selectQueries = queries.filter((q) =>
    q.toLowerCase().includes("credit_card_installments"),
  );
  assert.equal(
    selectQueries.length,
    2,
    `Expected 2 chunked queries, got ${selectQueries.length}`,
  );

  // Verify neither query exceeded 500 parameters
  for (const q of selectQueries) {
    const bindCount = (q.match(/\?/g) || []).length;
    assert.ok(
      bindCount <= 500,
      `Query exceeded 500 parameters (${bindCount}): ${q}`,
    );
  }
});

test("CC-F07: listBilledInstallmentIdsForPlans chunks 501+ plan IDs at 500 and returns matched IDs", () => {
  const { db } = fixture();
  const planIds = Array.from({ length: 505 }, (_, i) => `plan_chunk_${i}`);

  queries = [];
  const billedIds = listBilledInstallmentIdsForPlans(planIds, db);

  assert.equal(billedIds instanceof Set, true);
  const selectQueries = queries.filter((q) =>
    q.toLowerCase().includes("credit_card_statement_entries"),
  );
  assert.equal(
    selectQueries.length,
    2,
    `Expected 2 chunked queries, got ${selectQueries.length}`,
  );
  for (const q of selectQueries) {
    const bindCount = (q.match(/\?/g) || []).length;
    assert.ok(
      bindCount <= 500,
      `Query exceeded 500 parameters (${bindCount}): ${q}`,
    );
  }
});

test("CC-F07: reconciliation installment issuance uses batched lookup (0 individual queries in loop)", () => {
  const { db, occurred } = fixture();
  const now = Date.now();

  // Create 2 installment plans with 12 installments each, scheduled for Nov 10 (due before today Nov 21)
  for (let p = 1; p <= 2; p++) {
    sqlite
      .prepare(
        "INSERT INTO transactions (id, account_id, category_id, type, amount_minor_units, name, occurred_at, created_at, updated_at) VALUES (?, 'card', 'cat_dining', 'expense', -120000, 'Purchase', ?, ?, ?)",
      )
      .run(`tx_batch_${p}`, occurred, occurred, occurred);
    sqlite
      .prepare(
        "INSERT INTO credit_card_installment_plans (id, account_id, purchase_transaction_id, term_months, principal_minor_units, first_statement_on, deferred_months, status, created_at, updated_at) VALUES (?, 'card', ?, 12, 120000, '2026-11-10', 0, 'active', ?, ?)",
      )
      .run(`plan_batch_${p}`, `tx_batch_${p}`, now, now);

    for (let i = 1; i <= 12; i++) {
      sqlite
        .prepare(
          "INSERT INTO credit_card_installments (id, plan_id, installment_number, scheduled_statement_on, principal_minor_units, interest_minor_units, fee_minor_units, created_at) VALUES (?, ?, ?, '2026-11-10', 10000, 0, 0, ?)",
        )
        .run(`inst_batch_${p}_${i}`, `plan_batch_${p}`, i, now);
    }
  }

  queries = [];
  reconcileCreditCardBilling(new Date(2026, 10, 21, 12));

  // Verify that NO queries checked a single installment ID in a loop:
  // e.g. "where `credit_card_statement_entries`.`installment_id` = ?"
  const singleInstallmentQueries = queries.filter(
    (q) =>
      /where\b/i.test(q) &&
      q.includes("credit_card_statement_entries") &&
      /installment_id["`]?\s*=\s*\?/i.test(q),
  );
  assert.equal(
    singleInstallmentQueries.length,
    0,
    `Expected 0 single-installment queries, but found ${singleInstallmentQueries.length}`,
  );

  // Verify entries were created properly
  const entries = sqlite
    .prepare(
      "SELECT count(*) as count FROM credit_card_statement_entries WHERE entry_type = 'installment'",
    )
    .get();
  // 24 installments due on Nov 10 were issued
  assert.equal(entries.count, 24);
});
