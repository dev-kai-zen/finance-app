const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "../../..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  return resolve.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, ...args);
};
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
}).outputText, filename);
const { parseCsv, parseImportAmount, parseImportDate, suggestColumns, categoryMappingKey, transactionFingerprint } = require("../utils/csv.ts");
const { buildImportPreview, importDigest } = require("../utils/import-preview.ts");

const catalog = () => ({
  accounts: ["Cash", "Savings"].map((name, index) => ({ id: `a${index}`, name, accountTypeId: "wallet", currencyCode: "PHP", openingBalanceMinorUnits: 100000, openingBalanceAt: new Date(2026, 0, 1), currentBalanceMinorUnits: 100000, isArchived: false, creditCard: false })),
  accountTypes: [{ id: "wallet", name: "Wallet", creditCard: false }],
  currencies: ["PHP", "USD", "JPY"], categories: [{ id: "food", name: "Food", type: "expense", parentId: null }], sourceKeys: [], fingerprints: [],
});
function setup(csv) {
  const document = parseCsv(csv), data = catalog();
  const options = {
    kind: "transactions", source: "Old app", columns: suggestColumns(document.headers), dateFormat: "ymd", decimal: ".", defaultCurrency: "PHP", defaultAccount: "", transferMode: "single", decisions: {},
    accounts: Object.fromEntries(data.accounts.map((a) => [a.name.toLowerCase(), { existingId: a.id, name: a.name, currency: "PHP", accountTypeId: "wallet", openingBalance: "1000", balanceDate: "2026-01-01" }])),
    categories: { [categoryMappingKey("expense", "Food")]: "food", [categoryMappingKey("income", "Salary")]: "" },
  };
  const preview = () => buildImportPreview(document, options, data, importDigest(csv));
  return { document, data, options, preview };
}

test("CSV handles BOM, semicolons, CRLF, escaped quotes, quoted newlines, and row numbers", () => {
  const parsed = parseCsv('\uFEFFDate;Note\r\n2026-01-02;"Hello; ""world""\nnext"\r\n2026-01-03;Done');
  assert.equal(parsed.rows[0].cells[1], 'Hello; "world"\nnext');
  assert.deepEqual(parsed.rows.map((r) => r.number), [2, 4]);
  assert.throws(() => parseCsv('A,B\n"bad,x'));
  assert.throws(() => parseCsv('A,A\nx,y'));
  assert.throws(() => parseCsv('A\n"x"bad'));
  assert.throws(() => parseCsv('A\n\u0000'));
});
test("CSV enforces byte and row limits", () => {
  assert.throws(() => parseCsv(`A\n${"x".repeat(2 * 1024 * 1024)}`), /fileSize/);
  assert.throws(() => parseCsv(`A\n${"x\n".repeat(1001)}`), /rowLimit/);
});
test("amount parsing respects currency precision, grouping, locale, and safe integers", () => {
  assert.equal(parseImportAmount("-1,234.56", "PHP", "."), -123456);
  assert.equal(parseImportAmount("1.234,56", "PHP", ","), 123456);
  assert.equal(parseImportAmount("1000", "JPY", "."), 1000);
  for (const value of ["1,23.45", "12.345", "NaN", "", "1e3", "9007199254740992"]) assert.throws(() => parseImportAmount(value, "PHP", "."));
});
test("dates reject ambiguity by using the selected format and validate calendar/time values", () => {
  assert.equal(parseImportDate("03/04/2026", "dmy").getMonth(), 3);
  assert.equal(parseImportDate("03/04/2026", "mdy").getMonth(), 2);
  assert.equal(parseImportDate("2026-01-02", "ymd", "13:45:59").getHours(), 13);
  for (const value of ["2026-02-29", "2026-13-01", "26-01-01", "2026-01-01T24:00", "2026-01-01Z"]) assert.throws(() => parseImportDate(value, "ymd"));
});
test("preview preserves existing starting balances and computes signed totals", () => {
  const s = setup("Date,Type,Amount,Account,Category\n2026-01-02,expense,150,Cash,Food\n2026-01-03,income,200,Savings,Salary");
  const p = s.preview();
  assert.equal(p.ready, true); assert.equal(p.accepted, 2);
  assert.deepEqual(p.balances.map((b) => b.after), [85000, 120000]);
  assert.deepEqual(p.income, { PHP: 20000 }); assert.deepEqual(p.expense, { PHP: 15000 });
  assert.equal(s.data.accounts[0].openingBalanceMinorUnits, 100000);
});
test("new accounts use reviewed historical balances and reject earlier transactions", () => {
  const s = setup("Date,Type,Amount,Account,Category\n2026-01-02,expense,150,Cash,Food");
  s.data.accounts = [];
  s.options.accounts.cash.existingId = "";
  assert.equal(s.preview().balances[0].after, 85000);
  s.options.accounts.cash.balanceDate = "2026-01-03";
  assert.equal(s.preview().rows[0].issue, "balance");
});
test("similar purchases require a decision and explicit exclusion updates the balance", () => {
  const s = setup("Date,Type,Amount,Account,Category,Name\n2026-01-02,expense,150,Cash,Food,Lunch\n2026-01-02,expense,150,Cash,Food,Lunch");
  assert.equal(s.preview().rows[1].issue, "duplicate");
  s.options.decisions[3] = "import";
  assert.equal(s.preview().accepted, 2); assert.equal(s.preview().balances[0].after, 70000);
  s.options.decisions[3] = "skip";
  assert.equal(s.preview().accepted, 1); assert.equal(s.preview().balances[0].after, 85000);
});
test("existing ledger purchases are reviewed without overwriting them", () => {
  const s = setup("Date,Type,Amount,Account,Category,Name\n2026-01-02,expense,150,Cash,Food,Lunch");
  s.data.fingerprints.push(transactionFingerprint("expense", "a0", "", new Date(2026, 0, 2), -15000, "Lunch"));
  assert.equal(s.preview().ready, false);
  s.options.decisions[2] = "import";
  assert.equal(s.preview().ready, true);
});
test("previously imported source IDs remain excluded, even if the source amount changed", () => {
  const s = setup("Date,Type,Amount,Account,Category,Source ID\n2026-01-02,expense,150,Cash,Food,abc");
  const key = s.preview().rows[0].sourceKey;
  s.data.sourceKeys.push(key);
  s.document.rows[0].cells[2] = "200";
  s.options.decisions[2] = "import";
  const p = s.preview(); assert.equal(p.accepted, 0); assert.equal(p.skipped, 1); assert.equal(p.rows[0].repeated, true);
});
test("source IDs remain stable when a new account becomes an existing account", () => {
  const s = setup("Date,Type,Amount,Account,Category,Source ID\n2026-01-02,expense,150,Cash,Food,abc");
  s.options.accounts.cash.existingId = ""; s.data.accounts = s.data.accounts.slice(1);
  const key = s.preview().rows[0].sourceKey;
  s.data.accounts.push(catalog().accounts[0]); s.options.accounts.cash.existingId = "a0";
  assert.equal(s.preview().rows[0].sourceKey, key);
});
test("one-row transfers affect both accounts without changing income or expense", () => {
  const s = setup("Date,Type,Amount,Account,To Account\n2026-01-02,transfer,150,Cash,Savings");
  const p = s.preview(); assert.equal(p.ready, true); assert.equal(p.accepted, 1);
  assert.deepEqual(p.balances.map((b) => b.after), [85000, 115000]);
  assert.deepEqual(p.income, {}); assert.deepEqual(p.expense, {});
});
test("signed transfer legs become one transfer and exclusion applies to both", () => {
  const s = setup("Date,Type,Amount,Account,To Account\n2026-01-02,transfer,150,Savings,Cash\n2026-01-02,transfer,-150,Cash,Savings");
  s.options.transferMode = "paired";
  const p = s.preview(); assert.equal(p.ready, true); assert.equal(p.accepted, 1);
  assert.equal(p.rows[0].secondary, true);
  assert.deepEqual(p.balances.map((b) => b.after).sort((a, b) => a - b), [85000, 115000]);
});
test("missing/ambiguous transfer legs are blocked and different currencies cannot be paired", () => {
  const s = setup("Date,Type,Amount,Account,To Account\n2026-01-02,transfer,-150,Cash,Savings");
  s.options.transferMode = "paired";
  assert.equal(s.preview().rows[0].issue, "transfer");
  s.options.transferMode = "single"; s.document.rows[0].cells[2] = "150";
  s.data.accounts[1].currencyCode = "USD";
  assert.equal(s.preview().rows[0].issue, "transfer");
});
test("unsupported metadata and credit-card accounts are blocked, and can be excluded", () => {
  const s = setup("Date,Type,Amount,Account,Category,Pocket\n2026-01-02,expense,150,Cash,Food,Vault");
  assert.equal(s.preview().rows[0].issue, "unsupported");
  s.options.decisions[2] = "skip";
  assert.equal(s.preview().errors, 0);
  delete s.options.decisions[2]; s.document.rows[0].cells[5] = ""; s.data.accounts[0].creditCard = true;
  assert.equal(s.preview().rows[0].issue, "unsupported");
});
test("accounts-only imports do not silently update existing accounts", () => {
  const s = setup("Account,Currency,Opening Balance,Balance Date\nCash,PHP,1000,2026-01-01");
  s.options.kind = "accounts";
  assert.equal(s.preview().rows[0].issue, "duplicate");
  s.data.accounts = []; s.options.accounts.cash.existingId = "";
  assert.equal(s.preview().ready, true); assert.equal(s.preview().balances[0].after, 100000);
});
test("bad columns, duplicate mappings, invalid amounts, and excluded rows never become accepted", () => {
  const s = setup("Date,Type,Amount,Account,Category\n2026-01-02,expense,abc,Cash,Food\n2026-01-03,expense,50,Cash,Food");
  assert.equal(s.preview().ready, false); s.options.decisions[2] = "skip";
  assert.equal(s.preview().ready, true); assert.equal(s.preview().accepted, 1);
  s.options.columns.name = s.options.columns.amount;
  assert.equal(s.preview().ready, false);
});

test("debit/credit files accept zero-filled opposite columns", () => {
  const s = setup("Date,Debit,Credit,Account,Category\n2026-01-02,150.00,0.00,Cash,Food\n2026-01-03,0,200,Savings,Salary");
  const p = s.preview(); assert.equal(p.ready, true);
  assert.deepEqual(p.balances.map((b) => b.after), [85000, 120000]);
});
test("exact-file recognition is scoped to the source account when no IDs exist", () => {
  const s = setup("Date,Type,Amount,Category\n2026-01-02,expense,150,Food");
  s.options.defaultAccount = "Cash";
  s.data.sourceKeys.push(s.preview().rows[0].sourceKey);
  s.options.defaultAccount = "Savings";
  assert.equal(s.preview().ready, true);
});
test("excluding a paired transfer excludes both legs without changing balances", () => {
  const s = setup("Date,Type,Amount,Account,To Account\n2026-01-02,transfer,-150,Cash,Savings\n2026-01-02,transfer,150,Savings,Cash");
  s.options.transferMode = "paired"; s.options.decisions[2] = "skip";
  const p = s.preview(); assert.equal(p.skipped, 2); assert.equal(p.accepted, 0); assert.equal(p.errors, 0); assert.deepEqual(p.balances, []);
});
test("a source account cannot inherit a mapping from Object.prototype", () => {
  const s = setup("Date,Type,Amount,Account,Category\n2026-01-02,expense,150,constructor,Food");
  assert.equal(s.preview().rows[0].issue, "account");
});
test("explicitly excluded transfer candidates do not prevent a unique remaining pair", () => {
  const s = setup("Date,Type,Amount,Account,To Account\n2026-01-02,transfer,-150,Cash,Savings\n2026-01-02,transfer,-150,Cash,Savings\n2026-01-02,transfer,150,Savings,Cash\n2026-01-02,transfer,150,Savings,Cash");
  s.options.transferMode = "paired";
  assert.equal(s.preview().ready, false);
  s.options.decisions[2] = "skip"; s.options.decisions[4] = "skip";
  const p = s.preview(); assert.equal(p.ready, true); assert.equal(p.accepted, 1); assert.equal(p.skipped, 2);
});

test("paired account entries infer a destination and tolerate different times on the same date", () => {
  const s = setup("Date,Time,Type,Amount,Account\n2026-01-02,10:00,transfer,-150,Cash\n2026-01-02,10:05,transfer,150,Savings");
  s.options.transferMode = "paired";
  const p = s.preview(); assert.equal(p.ready, true); assert.equal(p.accepted, 1);
  assert.equal(p.rows[0].transaction.toAccountKey, "savings");
  assert.deepEqual(p.balances.map((b) => b.after), [85000, 115000]);
});
test("exact timestamps distinguish repeated transfers of the same amount on one date", () => {
  const s = setup("Date,Time,Type,Amount,Account\n2026-01-02,09:00,transfer,-150,Cash\n2026-01-02,09:00,transfer,150,Savings\n2026-01-02,11:00,transfer,-150,Cash\n2026-01-02,11:00,transfer,150,Savings");
  s.options.transferMode = "paired";
  // Similar transfers still need the user's explicit duplicate decision.
  s.options.decisions[4] = "import";
  const p = s.preview(); assert.equal(p.ready, true); assert.equal(p.accepted, 2);
  assert.deepEqual(p.balances.map((b) => b.after), [70000, 130000]);
});
test("paired entries with ambiguous destination accounts require review", () => {
  const s = setup("Date,Type,Amount,Account\n2026-01-02,transfer,-150,Cash\n2026-01-02,transfer,150,Savings\n2026-01-02,transfer,150,Savings");
  s.options.transferMode = "paired";
  assert.equal(s.preview().ready, false);
  s.options.decisions[4] = "skip";
  assert.equal(s.preview().ready, true); assert.equal(s.preview().accepted, 1);
});
test("review edits are revalidated without modifying the original file rows", () => {
  const s = setup("Date,Type,Amount,Account,Category,Name\n2026-02-30,expense,bad,Cash,Food,Lunch");
  assert.equal(s.preview().ready, false);
  s.options.rowEdits = { 2: ["2026-02-28", "expense", "125.50", "Cash", "Food", "Corrected lunch"] };
  const p = s.preview(); assert.equal(p.ready, true);
  assert.equal(p.balances[0].after, 87450); assert.equal(p.rows[0].transaction.name, "Corrected lunch");
  assert.equal(s.document.rows[0].cells[0], "2026-02-30");
});
test("an optional source label preserves the legacy CSV identity", () => {
  const s = setup("Date,Type,Amount,Account,Category,Source ID\n2026-01-02,expense,150,Cash,Food,old1");
  s.options.source = "CSV"; const key = s.preview().rows[0].sourceKey;
  s.options.source = ""; assert.equal(s.preview().ready, true); assert.equal(s.preview().rows[0].sourceKey, key);
  s.options.source = "   "; assert.equal(s.preview().rows[0].sourceKey, key);
});

test("wizard requirements and steps do not require optional source information", () => {
  const { importSteps, previousImportStep, requiredImportColumns } = require("../utils/import-wizard.ts");
  const s = setup("Date,Type,Amount,Account,Category\n2026-01-02,expense,150,Cash,Food");
  s.options.source = "";
  assert.deepEqual(requiredImportColumns(s.options), []);
  assert.deepEqual(importSteps("transactions"), ["columns", "matching", "categories", "review"]);
  assert.deepEqual(importSteps("accounts"), ["columns", "matching", "review"]);
  assert.equal(previousImportStep("review", "transactions"), "categories");
  delete s.options.columns.date; assert.deepEqual(requiredImportColumns(s.options), ["date"]);
});
test("matching suggestions include corrected account and category values without changing source rows", () => {
  const { prepareImportMappings } = require("../utils/prepare-import-mappings.ts");
  const s = setup("Date,Type,Amount,Account,Category\n2026-01-02,expense,150,Cash,Food");
  s.options.rowEdits = { 2: ["2026-01-02", "expense", "150", "New wallet", "Travel"] };
  const prepared = prepareImportMappings(s.document, s.options, s.data);
  assert.equal(prepared.accounts["new wallet"].name, "New wallet");
  assert.equal(prepared.accounts["new wallet"].balanceDate, "2026-01-02");
  assert.equal(prepared.categories[categoryMappingKey("expense", "Travel")], "");
  assert.equal(s.document.rows[0].cells[3], "Cash");
});

test("unknown types need a deliberate mapping and may be excluded without blocking valid entries", () => {
  const s = setup("Date,Type,Amount,Account,Category\n2026-01-02,Payment,150,Cash,Food\n2026-01-03,expense,20,Cash,Food");
  assert.equal(s.preview().rows[0].issue, "type"); assert.equal(s.preview().ready, false);
  s.options.typeMappings = { payment: "expense" };
  assert.equal(s.preview().ready, true); assert.equal(s.preview().accepted, 2);
  s.options.typeMappings.payment = "exclude";
  const p = s.preview(); assert.equal(p.ready, true); assert.equal(p.accepted, 1); assert.equal(p.skipped, 1); assert.equal(p.errors, 0);
});
test("a file type named exclude is not silently dropped", () => {
  const s = setup("Date,Type,Amount,Account,Category\n2026-01-02,exclude,150,Cash,Food");
  assert.equal(s.preview().rows[0].skip, false); assert.equal(s.preview().rows[0].issue, "type");
});
test("row type corrections override file-level mappings and are still a preview", () => {
  const s = setup("Date,Type,Amount,Account,Category\n2026-01-02,Payment,150,Cash,Food");
  s.options.typeMappings = { payment: "exclude" };
  s.options.rowTypes = { 2: "expense" };
  const p = s.preview(); assert.equal(p.ready, true); assert.equal(p.accepted, 1);
  assert.equal(s.document.rows[0].cells[1], "Payment");
});
test("mapped transfer labels participate in pairing", () => {
  const s = setup("Date,Type,Amount,Account\n2026-01-02,Move out,-150,Cash\n2026-01-02,Move in,150,Savings");
  s.options.transferMode = "paired"; s.options.typeMappings = { "move out": "transfer", "move in": "transfer" };
  const p = s.preview(); assert.equal(p.ready, true); assert.equal(p.accepted, 1);
});
test("unknown and missing categories use the correct Other category, while exact matches are preselected", () => {
  const { prepareImportMappings } = require("../utils/prepare-import-mappings.ts");
  const s = setup("Date,Type,Amount,Account,Category\n2026-01-02,expense,150,Cash,Unknown\n2026-01-03,income,200,Cash,\n2026-01-04,expense,10,Cash,Food");
  s.options.categories = {}; s.data.fallbackCategoryIds = { expense: "other-expense", income: "other-income" };
  s.data.categories.push({ id: "other-expense", name: "Others", type: "expense", parentId: null }, { id: "other-income", name: "Others", type: "income", parentId: null });
  const prepared = prepareImportMappings(s.document, s.options, s.data);
  assert.equal(prepared.categories[categoryMappingKey("expense", "Unknown")], "other-expense");
  assert.equal(prepared.categories[categoryMappingKey("income", "")], "other-income");
  assert.equal(prepared.categories[categoryMappingKey("expense", "Food")], "food");
  Object.assign(s.options, prepared); assert.equal(s.preview().ready, true);
});
test("review filters scale to 1,000 rows and keep previous imports out of the ready group", () => {
  const { reviewGroupCounts, filterReviewRows } = require("../utils/import-review.ts");
  const rows = Array.from({ length: 1000 }, (_, i) => ({ number: i + 2, cells: ["Cash", `Lunch ${i}`], skip: i < 100, repeated: i < 20, duplicate: false, sourceKey: String(i), issue: i >= 100 && i < 150 ? "amount" : undefined }));
  assert.deepEqual(reviewGroupCounts(rows), { excluded: 100, attention: 50, ready: 850 });
  assert.equal(filterReviewRows(rows, "ready", "Lunch 999").length, 1);
  assert.equal(filterReviewRows(rows, "excluded", "Lunch 999").length, 0);
});
test("date format validation checks the entire column and calendar output respects the selected format", () => {
  const { importDateValidation, formatImportDate } = require("../utils/import-review.ts");
  const s = setup("Date,Type,Amount,Account,Category\n2026-01-02,expense,150,Cash,Food\n2026-02-30,expense,10,Cash,Food");
  const result = importDateValidation(s.document, s.options);
  assert.equal(result.original, "2026-01-02"); assert.equal(result.checked, 2); assert.equal(result.invalid, 1);
  assert.equal(formatImportDate(new Date(2026, 0, 2), "dmy"), "02/01/2026");
  assert.equal(formatImportDate(new Date(2026, 0, 2), "mdy"), "01/02/2026");
});
test("applying corrections never creates a previously imported status without saved provenance", () => {
  const s = setup("Date,Type,Amount,Account,Category,Source ID\n2026-01-02,expense,150,Cash,Food,id1");
  s.options.rowEdits = { 2: ["2026-01-03", "expense", "125", "Cash", "Food", "id1"] };
  assert.equal(s.preview().rows[0].repeated, false); assert.equal(s.preview().ready, true);
  s.data.sourceKeys.push(s.preview().rows[0].sourceKey);
  assert.equal(s.preview().rows[0].repeated, true); assert.equal(s.preview().accepted, 0);
});
