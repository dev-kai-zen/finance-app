/* Run with: node --test src/modules/accounts/__tests__/accounts.test.cjs
 * Real SQLite + the installed Expo Drizzle driver; only the native SQLite bridge
 * is adapted to Node so production repositories/services execute unchanged.
 */
const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "../../..");
let sqlite;
let database;
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;
Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, ...rest);
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
Module._load = function (request, ...args) {
  if (request === "@/infrastructure/database/client") return { get db() { return database; } };
  if (
    request === "expo-sqlite" ||
    request === "react-native" ||
    request === "react-native-safe-area-context" ||
    request === "react-native-screens" ||
    request === "lucide-react-native" ||
    request === "expo-router" ||
    request === "react-native-keyboard-controller" ||
    request === "react-native-worklets" ||
    request === "react"
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
require.extensions[".png"] = require.extensions[".jpg"] = require.extensions[".jpeg"] = (module) => {
  module.exports = "test-image";
};
const { drizzle } = require("drizzle-orm/expo-sqlite");
const schema = require("@/infrastructure/database/schema");
const repo = require("@/modules/accounts/repositories/accounts.repository");
const types = require("@/modules/accounts/repositories/account-types.repository");
const { getAccountsWithBalances } = require("@/modules/accounts/services/get-accounts-with-balances.service");
const { getPocketsWithBalances, getAvailablePocketBalance } = require("@/modules/accounts/services/get-pockets-with-balances.service");
const pocketsRepo = require("@/modules/accounts/repositories/pockets.repository");
const { savePocket } = require("@/modules/accounts/services/save-pocket.service");
const { createTransfer } = require("@/modules/transactions/services/create-transfer.service");
const { setPocketArchived } = require("@/modules/accounts/services/archive-pocket.service");
const { saveAccount } = require("@/modules/accounts/services/save-account.service");
const { lockAccountStartingBalance } = require("@/modules/accounts/services/lock-account-starting-balance.service");
const { saveAccountType } = require("@/modules/accounts/services/save-account-type.service");
const { setAccountArchived } = require("@/modules/accounts/services/archive-account.service");
const { deleteAccountType } = require("@/modules/accounts/services/delete-account-type.service");
const { moveAccount, moveAccountType, reorderAccountsList } = require("@/modules/accounts/services/reorder-accounts.service");
const input = require("@/modules/accounts/utils/account-input");
const { openingSummary, formatOpeningTotal } = require("@/modules/accounts/utils/opening-summary");
const { accountColor, accountIcon } = require("@/modules/accounts/constants/account-appearance.constants");
const presets = require("@/constants/theme/presets");
const system = require("@/modules/accounts/constants/account-types.constants").SYSTEM_ACCOUNT_TYPE_IDS;
const { supportsPockets } = require("@/modules/accounts/utils/pocket-eligibility");
const journal = require(path.join(root, "../drizzle/meta/_journal.json"));
const migrations = journal.entries.map((entry) => ({
  sql: fs.readFileSync(path.join(root, "../drizzle", entry.tag + ".sql"), "utf8").split("--> statement-breakpoint"),
  folderMillis: entry.when, hash: "", bps: true,
}));

function aliasSelectColumns(query) {
  const selectMatch = /^\s*select\s+/i.exec(query);
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

function connect(filename = ":memory:") {
  sqlite = new DatabaseSync(filename);
  sqlite.exec("PRAGMA foreign_keys=ON");
  database = drizzle({
    prepareSync(query) {
      return {
        executeSync(params) {
          const stmt = sqlite.prepare(query);
          if (/^\s*(select|pragma|with)\b/i.test(query) || /\breturning\b/i.test(query)) {
            const rows = stmt.all(...params);
            return { getAllSync: () => rows, getFirstSync: () => rows[0] ?? null };
          }
          const result = stmt.run(...params);
          return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
        },
        executeForRawResultSync(params) {
          const stmt = sqlite.prepare(aliasSelectColumns(query));
          const rows = stmt.all(...params);
          return { getAllSync: () => rows.map((row) => Object.values(row)) };
        },
      };
    },
  }, { schema });
}
function migrate(selected = migrations) { database.dialect.migrate(selected, database.session); }
const typeInput = (name, accountGroup = "asset") => ({ name, accountGroup, iconKey: "wallet", color: "teal" });
const accountInput = (accountTypeId = system.ASSET_OTHERS, name = "Daily account", openingAmount = "1000.50") =>
  ({
    name,
    accountTypeId,
    openingAmount,
    openingDate: "2026-09-13",
    hideFromSelection: false,
    hideFromReports: false,
    pocketEnabled: false,
    maintainingAmount: "",
  });
const pocketTransfer = (accountId, fromPocketId, toPocketId, amountCents) =>
  createTransfer({
    fromAccountId: accountId,
    toAccountId: accountId,
    fromPocketId,
    toPocketId,
    amountCents,
    occurredAt: new Date("2026-09-13T12:00:00"),
  });
beforeEach(() => { connect(); migrate(); });
afterEach(() => sqlite.close());

test("fresh migrations create exactly the three protected types and run idempotently", () => {
  assert.equal(types.listAccountTypes().length, 3);
  migrate();
  assert.equal(types.listAccountTypes().length, 3);
  assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
});
test("decimal input is exact, signed, and rejects malformed or unsafe amounts", () => {
  for (const [value, expected] of [["1000.50", 100050], ["-1000.50", -100050], ["0", 0], ["-0.00", 0], ["1.2", 120], ["0.29", 29]]) {
    assert.equal(input.parseOpeningAmount(value), expected);
    assert.equal(input.parseOpeningAmount(input.openingAmountInput(expected)), expected);
  }
  assert.equal(input.parseOpeningAmount("90071992547409.91"), Number.MAX_SAFE_INTEGER);
  for (const value of ["", "1.001", "1e3", "NaN", "Infinity", "1,000", "1.", "90071992547409.92", "--1"]) {
    assert.throws(() => input.parseOpeningAmount(value), undefined, value);
  }
});
test("opening dates validate calendar days and round-trip as local dates", () => {
  assert.equal(input.localDateInput(input.parseOpeningDate("2024-02-29")), "2024-02-29");
  for (const value of ["2025-02-29", "2026-13-01", "2026-04-31", "invalid"]) assert.throws(() => input.parseOpeningDate(value));
});
test("create, edit, archive and restore preserve IDs, signed amounts and creation timestamps", () => {
  const id = saveAccount(accountInput(system.LIABILITY_CREDIT_CARD, "Credit card", "-1000.50"));
  const original = repo.findAccountById(id);
  assert.equal(original.openingBalanceMinorUnits, -100050);
  assert.equal(original.currencyCode, "PHP");
  saveAccount(accountInput(system.LIABILITY_CREDIT_CARD, "Renamed", "500"), id);
  assert.equal(repo.findAccountById(id).openingBalanceMinorUnits, 50000);
  assert.equal(repo.findAccountById(id).createdAt.getTime(), original.createdAt.getTime());
  setAccountArchived(id, true);
  assert.equal(repo.findAccountById(id).isArchived, true);
  setAccountArchived(id, false);
  assert.equal(repo.findAccountById(id).isArchived, false);
});
test("saveAccount persists and clears account notes", () => {
  const id = saveAccount({ ...accountInput(), note: "Emergency fund" });
  assert.equal(repo.findAccountById(id).note, "Emergency fund");
  saveAccount({ ...accountInput(undefined, "Daily account"), note: "" }, id);
  assert.equal(repo.findAccountById(id).note, null);
});
test("saveAccount persists, updates, and clears custom icon_key on accounts", () => {
  const id = saveAccount({ ...accountInput(), iconKey: "piggy-bank" });
  assert.equal(repo.findAccountById(id).iconKey, "piggy-bank");
  saveAccount({ ...accountInput(undefined, "Daily account"), iconKey: "credit-card" }, id);
  assert.equal(repo.findAccountById(id).iconKey, "credit-card");
  saveAccount({ ...accountInput(undefined, "Daily account"), iconKey: "" }, id);
  assert.equal(repo.findAccountById(id).iconKey, null);
});
test("name-only account edits preserve the existing opening timestamp", () => {
  const id = saveAccount(accountInput());
  const exactDate = new Date(2026, 8, 13, 14, 22, 33);
  repo.updateAccountRecord(id, { openingBalanceAt: exactDate });
  saveAccount(accountInput(undefined, "New name"), id);
  assert.equal(repo.findAccountById(id).openingBalanceAt.getTime(), exactDate.getTime());
});
test("custom types allow classification changes and enforce case-insensitive unique names", () => {
  const id = saveAccountType(typeInput("Bank"));
  assert.throws(() => saveAccountType(typeInput(" bank ")), /already exists/);
  saveAccountType(typeInput("Bank", "liability"), id);
  assert.equal(types.findAccountTypeById(id).accountGroup, "liability");
  saveAccountType({ ...typeInput("Banks", "liability"), color: "purple" }, id);
  assert.equal(types.findAccountTypeById(id).name, "Banks");
});
test("system types protect names, classification, and deletion but allow appearance changes", () => {
  for (const id of Object.values(system)) {
    const type = types.findAccountTypeById(id);
    assert.throws(() => deleteAccountType(id), /cannot be deleted/);
    assert.throws(() => saveAccountType(typeInput("Changed", type.accountGroup), id), /names cannot/);
    assert.throws(
      () => saveAccountType(typeInput(type.name, type.accountGroup === "asset" ? "liability" : "asset"), id),
      /classification cannot/,
    );
    saveAccountType({ ...typeInput(type.name, type.accountGroup), color: "pink" }, id);
    assert.equal(types.findAccountTypeById(id).color, "pink");
  }
});
test("deleting a custom type requires reassigning or removing linked accounts first", () => {
  const typeId = saveAccountType(typeInput("Custom"));
  const active = saveAccount(accountInput(typeId));
  const archived = saveAccount(accountInput(typeId, "Archived", "-20"));
  setAccountArchived(archived, true);
  assert.throws(() => deleteAccountType(typeId), /linked account/);
  repo.updateAccountRecord(active, { accountTypeId: system.ASSET_OTHERS });
  assert.throws(() => deleteAccountType(typeId), /linked account/);
  repo.updateAccountRecord(archived, { accountTypeId: system.ASSET_OTHERS });
  const result = deleteAccountType(typeId);
  assert.equal(result.deletedAccountTypeId, typeId);
  assert.equal(types.findAccountTypeById(typeId), null);
});
test("failed deletion rolls back without removing the type", () => {
  const typeId = saveAccountType(typeInput("Keep"));
  sqlite.exec("CREATE TRIGGER deny_type_delete BEFORE DELETE ON account_types BEGIN SELECT RAISE(ABORT, 'forced failure'); END");
  assert.throws(() => deleteAccountType(typeId), /forced failure/);
  assert.ok(types.findAccountTypeById(typeId));
  assert.equal(sqlite.isTransaction, false);
});
test("system Others groups can be reordered within their classification", () => {
  const custom = saveAccountType(typeInput("First custom"));
  moveAccountType(system.ASSET_OTHERS, 1);
  const assetTypes = types.listAccountTypes().filter((t) => t.accountGroup === "asset");
  assert.ok(assetTypes.findIndex((t) => t.id === custom) < assetTypes.findIndex((t) => t.id === system.ASSET_OTHERS));
});
test("account ordering stays within type and archive state and is atomic", () => {
  const first = saveAccount(accountInput(undefined, "First"));
  const second = saveAccount(accountInput(undefined, "Second"));
  const liability = saveAccount(accountInput(system.LIABILITY_OTHERS, "Debt"));
  moveAccount(second, -1);
  assert.deepEqual(repo.findAccountsByAccountTypeId(system.ASSET_OTHERS).map((a) => a.id), [second, first]);
  assert.equal(repo.findAccountById(liability).sortOrder, 0);
  const before = repo.listAccounts();
  sqlite.exec("CREATE TRIGGER deny_account_order BEFORE UPDATE OF sort_order ON accounts WHEN NEW.name='First' BEGIN SELECT RAISE(ABORT, 'order failure'); END");
  assert.throws(() => moveAccount(first, -1), /order failure/);
  assert.deepEqual(repo.listAccounts(), before);
});
test("reorderAccountsList updates sortOrder atomically for an ordered list of IDs", () => {
  const a1 = saveAccount(accountInput(undefined, "Alpha"));
  const a2 = saveAccount(accountInput(undefined, "Beta"));
  const a3 = saveAccount(accountInput(undefined, "Gamma"));

  reorderAccountsList([a3, a1, a2]);

  assert.equal(repo.findAccountById(a3).sortOrder, 0);
  assert.equal(repo.findAccountById(a1).sortOrder, 1);
  assert.equal(repo.findAccountById(a2).sortOrder, 2);
});
test("type ordering stays within group", () => {
  const first = saveAccountType(typeInput("First"));
  const second = saveAccountType(typeInput("Second"));
  const originalLiability = types.findAccountTypeById(system.LIABILITY_OTHERS);
  moveAccountType(second, -1);
  assert.ok(types.listAccountTypes().findIndex((t) => t.id === second) < types.listAccountTypes().findIndex((t) => t.id === first));
  assert.deepEqual(types.findAccountTypeById(system.LIABILITY_OTHERS), originalLiability);
});
test("non-PHP data is preserved, read-only for opening edits, and excluded from PHP totals", () => {
  const id = saveAccount(accountInput());
  repo.updateAccountRecord(id, { currencyCode: "USD" });
  saveAccount(accountInput(undefined, "Dollar account"), id);
  assert.equal(repo.findAccountById(id).currencyCode, "USD");
  assert.throws(() => saveAccount(accountInput(undefined, "Dollar account", "2000"), id), /read-only/);
  assert.deepEqual(openingSummary(repo.listAccounts()), { assets: 0n, liabilities: 0n, excluded: 1 });
});
test("summary keeps liability signs, excludes archives, and supports totals above the safe integer limit", () => {
  saveAccount(accountInput(system.LIABILITY_OTHERS, "Debt", "-1000.50"));
  saveAccount(accountInput(system.LIABILITY_OTHERS, "Credit", "500"));
  const archived = saveAccount(accountInput());
  setAccountArchived(archived, true);
  saveAccount(accountInput(undefined, "Large 1", "90071992547409.91"));
  saveAccount(accountInput(undefined, "Large 2", "90071992547409.91"));
  assert.deepEqual(openingSummary(repo.listAccounts()), { assets: 18014398509481982n, liabilities: -50050n, excluded: 0 });
  assert.equal(formatOpeningTotal(-50050n), "-₱500.50");
});
test("appearance keys resolve across every established theme with safe fallbacks", () => {
  const themes = Object.values(presets).flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value) => value && value.colors && value.id);
  assert.ok(themes.length >= 6);
  for (const theme of themes) {
    assert.equal(accountColor(theme, "teal"), theme.colors.categorical.teal);
    assert.equal(accountColor(theme, "#bad"), theme.colors.categorical.slate);
  }
  assert.equal(accountIcon("unknown"), accountIcon(null));
});
test("foreign keys reject direct deletion of an in-use account type", () => {
  saveAccount(accountInput());
  assert.throws(() => types.deleteAccountTypeById(system.ASSET_OTHERS), /FOREIGN KEY/);
});
test("saved accounts survive closing and reopening a real database file", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "finance-accounts-test-"));
  const filename = path.join(directory, "accounts.sqlite");
  sqlite.close();
  connect(filename);
  try {
    migrate();
    const id = saveAccount(accountInput(undefined, "Persistent"));
    sqlite.close();
    connect(filename);
    migrate();
    assert.equal(repo.findAccountById(id).name, "Persistent");
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    sqlite.close();
    fs.rmSync(directory, { recursive: true });
    connect();
  }
});
test("existing current-schema accounts and linked transactions remain unchanged on startup", () => {
  const id = saveAccount(accountInput());
  sqlite.prepare("INSERT INTO transactions (id, account_id, type, amount_cents, occurred_at, created_at, updated_at) VALUES ('txn', ?, 'expense', 500, 1, 1, 1)").run(id);
  const before = repo.findAccountById(id);
  migrate();
  assert.deepEqual(repo.findAccountById(id), before);
  assert.equal(sqlite.prepare("SELECT count(*) AS total FROM transactions").get().total, 1);
});
test("saveAccount persists visibility flags and maintaining balance", () => {
  const id = saveAccount({
    ...accountInput(),
    hideFromSelection: true,
    hideFromReports: true,
    maintainingAmount: "2500.75",
  });
  const saved = repo.findAccountById(id);
  assert.equal(saved.hideFromSelection, true);
  assert.equal(saved.hideFromReports, true);
  assert.equal(saved.maintainingBalanceMinorUnits, 250075);
  assert.equal(saved.startingBalanceLocked, false);
  saveAccount({ ...accountInput(undefined, "Daily account"), maintainingAmount: "" }, id);
  assert.equal(repo.findAccountById(id).maintainingBalanceMinorUnits, null);
});
test("locked starting balance cannot be changed again", () => {
  const id = saveAccount(accountInput(undefined, "Locked account", "1000.00"));
  lockAccountStartingBalance(id);
  assert.equal(repo.findAccountById(id).startingBalanceLocked, true);
  assert.throws(
    () => saveAccount(accountInput(undefined, "Locked account", "2000.00"), id),
    /locked/,
  );
  saveAccount({ ...accountInput(undefined, "Renamed locked account"), openingAmount: "1000.00" }, id);
  assert.equal(repo.findAccountById(id).name, "Renamed locked account");
  assert.equal(repo.findAccountById(id).openingBalanceMinorUnits, 100000);
});
test("opening summary excludes accounts hidden from reports", () => {
  const visible = saveAccount(accountInput(undefined, "Visible", "1000.00"));
  saveAccount({ ...accountInput(undefined, "Hidden", "500.00"), hideFromReports: true });
  assert.deepEqual(openingSummary(repo.listAccounts()), { assets: 100000n, liabilities: 0n, excluded: 0 });
  repo.updateAccountRecord(visible, { hideFromReports: true });
  assert.deepEqual(openingSummary(repo.listAccounts()), { assets: 0n, liabilities: 0n, excluded: 0 });
});
test("getAccountsWithBalances calculates live current balance reflecting income, expense, and transfer", () => {
  const acc1 = saveAccount(accountInput(system.ASSET_OTHERS, "Checking", "1000.00")); // 100,000 cents
  const acc2 = saveAccount(accountInput(system.ASSET_OTHERS, "Savings", "500.00"));    // 50,000 cents

  // Add Income: 200.00 (20,000 cents) to Checking
  sqlite.prepare("INSERT INTO transactions (id, account_id, type, amount_cents, occurred_at, created_at, updated_at) VALUES ('tx_inc', ?, 'income', 20000, 1, 1, 1)").run(acc1);

  // Add Expense: 50.00 (5,000 cents) from Checking
  sqlite.prepare("INSERT INTO transactions (id, account_id, type, amount_cents, occurred_at, created_at, updated_at) VALUES ('tx_exp', ?, 'expense', -5000, 2, 2, 2)").run(acc1);

  // Add Transfer: 100.00 (10,000 cents) from Checking to Savings
  sqlite.prepare("INSERT INTO transactions (id, account_id, transaction_group_id, type, amount_cents, occurred_at, created_at, updated_at) VALUES ('tx_trf_out', ?, 'grp_trf', 'transfer', -10000, 3, 3, 3)").run(acc1);
  sqlite.prepare("INSERT INTO transactions (id, account_id, transaction_group_id, type, amount_cents, occurred_at, created_at, updated_at) VALUES ('tx_trf_in', ?, 'grp_trf', 'transfer', 10000, 3, 3, 3)").run(acc2);

  const accountsList = getAccountsWithBalances();
  const checking = accountsList.find((a) => a.id === acc1);
  const savings = accountsList.find((a) => a.id === acc2);

  // Checking: 100,000 + 20,000 (inc) - 5,000 (exp) - 10,000 (transfer out) = 105,000
  assert.equal(checking.openingBalanceMinorUnits, 100000);
  assert.equal(checking.currentBalanceMinorUnits, 105000);

  // Savings: 50,000 + 10,000 (transfer in) = 60,000
  assert.equal(savings.openingBalanceMinorUnits, 50000);
  assert.equal(savings.currentBalanceMinorUnits, 60000);
});

test("pocket transfers create two grouped transaction legs without changing the account balance", () => {
  const accountId = saveAccount({
    ...accountInput(undefined, "Checking", "1000.50"),
    pocketEnabled: true,
  });
  const pocketId = savePocket({ accountId, name: "Bills", targetAmount: "500.00" });

  const { transactionGroupId: groupId } = pocketTransfer(
    accountId,
    null,
    pocketId,
    30000,
  );

  const account = getAccountsWithBalances().find((item) => item.id === accountId);
  const pocket = getPocketsWithBalances().find((item) => item.id === pocketId);
  assert.equal(account.currentBalanceMinorUnits, 100050);
  assert.equal(pocket.currentBalanceMinorUnits, 30000);
  assert.equal(getAvailablePocketBalance(accountId, account.currentBalanceMinorUnits), 70050);
  const legs = sqlite.prepare(
    "SELECT account_id, pocket_id, amount_cents FROM transactions WHERE transaction_group_id = ? ORDER BY amount_cents",
  ).all(groupId);
  assert.deepEqual(
    legs.map((leg) => [leg.account_id, leg.pocket_id, leg.amount_cents]),
    [
      [accountId, null, -30000],
      [accountId, pocketId, 30000],
    ],
  );
});

test("pocket-assigned transactions change the pocket and account by the same amount", () => {
  const accountId = saveAccount({
    ...accountInput(undefined, "Checking", "1000.00"),
    pocketEnabled: true,
  });
  const pocketId = savePocket({ accountId, name: "Groceries", targetAmount: "" });
  pocketTransfer(accountId, null, pocketId, 40000);
  sqlite.prepare("INSERT INTO transactions (id, account_id, pocket_id, type, amount_cents, occurred_at, created_at, updated_at) VALUES ('pocket_expense', ?, ?, 'expense', -5000, 1, 1, 1)").run(accountId, pocketId);

  const account = getAccountsWithBalances().find((item) => item.id === accountId);
  const pocket = getPocketsWithBalances().find((item) => item.id === pocketId);
  assert.equal(account.currentBalanceMinorUnits, 95000);
  assert.equal(pocket.currentBalanceMinorUnits, 35000);
  assert.equal(getAvailablePocketBalance(accountId, account.currentBalanceMinorUnits), 60000);
});

test("pocket settings gate creation, reject duplicates and Credit Cards, and protect nonzero archival", () => {
  assert.equal(supportsPockets("custom:credit", "liability", " Credit Card "), false);
  assert.equal(supportsPockets("custom:credit", "liability", "Credit Cards"), true);
  const disabledId = saveAccount(accountInput(undefined, "Disabled", "100.00"));
  assert.throws(
    () => savePocket({ accountId: disabledId, name: "Bills", targetAmount: "" }),
    /Enable pockets/,
  );

  const accountId = saveAccount({
    ...accountInput(undefined, "Checking", "100.00"),
    pocketEnabled: true,
  });
  const pocketId = savePocket({ accountId, name: "Bills", targetAmount: "" });
  assert.equal(repo.findAccountById(accountId).pocketEnabled, true);
  assert.throws(
    () => savePocket({ accountId, name: " bills ", targetAmount: "" }),
    /already exists/,
  );
  pocketTransfer(accountId, null, pocketId, 5000);
  assert.throws(() => setPocketArchived(pocketId, true), /remaining pocket balance/);
  assert.throws(
    () => saveAccount({ ...accountInput(undefined, "Checking", "100.00"), pocketEnabled: false }, accountId),
    /Archive every active pocket/,
  );
  pocketTransfer(accountId, pocketId, null, 5000);
  setPocketArchived(pocketId, true);
  assert.equal(pocketsRepo.findPocketById(pocketId).isArchived, true);

  const liabilityId = saveAccount({
    ...accountInput(system.LIABILITY_OTHERS, "Loan", "-100.00"),
    pocketEnabled: true,
  });
  const liabilityPocketId = savePocket({
    accountId: liabilityId,
    name: "Housing Loan",
    targetAmount: "",
  });
  pocketTransfer(liabilityId, null, liabilityPocketId, 15000);
  assert.equal(
    getPocketsWithBalances().find((item) => item.id === liabilityPocketId).currentBalanceMinorUnits,
    15000,
  );

  const creditCardId = saveAccount(
    accountInput(system.LIABILITY_CREDIT_CARD, "Credit Card", "-100.00"),
  );
  assert.throws(
    () => savePocket({ accountId: creditCardId, name: "Payment", targetAmount: "" }),
    /Credit Card/,
  );
  assert.throws(
    () =>
      saveAccount(
        {
          ...accountInput(system.LIABILITY_CREDIT_CARD, "Credit Card", "-100.00"),
          pocketEnabled: true,
        },
        creditCardId,
      ),
    /Credit Card/,
  );
});

