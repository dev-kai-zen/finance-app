/* Run with: node --test src/modules/data-import/__tests__/data-import.test.cjs
 * Real SQLite + in-memory drizzle session matching project harness.
 */
const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "../../..");
let sqlite;
let database;

const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;

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

Module._load = function (request, ...args) {
  if (request.endsWith(".png") || request.endsWith(".jpg") || request.endsWith(".jpeg")) {
    return "test-image";
  }
  if (request === "@/infrastructure/database/client") {
    return { get db() { return database; } };
  }
  if (request === "@/modules/local-backup") {
    return {
      createLocalBackup: async () => ({
        id: "backup_safety_test",
        fileName: "safety-backup.kzb",
        createdAt: new Date(),
        kind: "safety",
      }),
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

const { drizzle } = require("drizzle-orm/expo-sqlite");
const schema = require("@/infrastructure/database/schema");

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

const journal = require(path.join(root, "../drizzle/meta/_journal.json"));
const migrations = journal.entries.map((entry) => ({
  sql: fs.readFileSync(path.join(root, "../drizzle", entry.tag + ".sql"), "utf8").split("--> statement-breakpoint"),
  folderMillis: entry.when,
  hash: "",
  bps: true,
}));

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

function migrate(selected = migrations) {
  database.dialect.migrate(selected, database.session);
}

// Module imports
const {
  parseDelimitedText,
  detectDelimiter,
  stripBOM,
} = require("@/modules/data-import/utils/csv-tokenizer");
const {
  analyzeFirstRowDate,
  parseDateWithFormat,
  formatDateInWords,
} = require("@/modules/data-import/utils/date-parser");
const {
  analyzeFirstRowNumber,
  parseNumberToMinorUnits,
} = require("@/modules/data-import/utils/number-parser");
const {
  buildSourceIdentity,
  hashString,
} = require("@/modules/data-import/utils/source-identity");
const {
  suggestColumnMappings,
  reassignColumnMapping,
} = require("@/modules/data-import/services/suggest-column-mappings.service");
const {
  extractAccountCandidates,
  buildInitialAccountMatches,
} = require("@/modules/data-import/services/match-accounts.service");
const {
  extractCategoryCandidates,
  buildInitialCategoryMatches,
  buildCategoryKey,
  resolveRowLabels,
} = require("@/modules/data-import/services/match-categories.service");
const {
  buildImportPreview,
} = require("@/modules/data-import/services/build-import-preview.service");
const {
  executeDataImport,
} = require("@/modules/data-import/services/execute-data-import.service");
const {
  SAMPLE_TRANSACTIONS_CSV,
  SAMPLE_ACCOUNTS_CSV,
} = require("@/modules/data-import/services/sample-import-files.service");
const {
  getLatestImportBatches,
  removeImportBatch,
} = require("@/modules/data-import/services/import-history.service");
const {
  parseRawCsvContent,
} = require("@/modules/data-import/services/parse-import-file.service");

// Seed helper for tests
function seedBaseEntities(db) {
  const now = Date.now();

  // Set workspace to personal
  db.insert(schema.settings).values([
    { key: "onboarding_status", value: "completed", createdAt: new Date(now), updatedAt: new Date(now) },
    { key: "onboarding_workspace_mode", value: "personal", createdAt: new Date(now), updatedAt: new Date(now) },
    { key: "onboarding_primary_currency", value: "PHP", createdAt: new Date(now), updatedAt: new Date(now) },
  ]).run();

  // Seed currencies if not present
  const existingCurr = db.select().from(schema.currencies).all();
  if (existingCurr.length === 0) {
    db.insert(schema.currencies).values([
      { code: "PHP", name: "Philippine Peso", symbol: "₱", minorUnitExponent: 2, sortOrder: 0, isActive: true, isCustom: false, createdAt: new Date(now), updatedAt: new Date(now) },
      { code: "USD", name: "US Dollar", symbol: "$", minorUnitExponent: 2, sortOrder: 1, isActive: true, isCustom: false, createdAt: new Date(now), updatedAt: new Date(now) },
      { code: "JPY", name: "Japanese Yen", symbol: "¥", minorUnitExponent: 0, sortOrder: 2, isActive: true, isCustom: false, createdAt: new Date(now), updatedAt: new Date(now) },
    ]).run();
  }

  // Account type
  db.insert(schema.accountTypes).values([
    { id: "type_bank", name: "Bank Account", accountGroup: "asset", iconKey: "landmark", isSystem: true, sortOrder: 10, createdAt: new Date(now), updatedAt: new Date(now) },
  ]).run();

  // Categories
  db.insert(schema.categories).values([
    { id: "cat_food", name: "Food", type: "expense", icon: "utensils", isSystem: false, sortOrder: 1, createdAt: new Date(now), updatedAt: new Date(now) },
    { id: "cat_groceries", name: "Groceries", parentId: "cat_food", type: "expense", icon: "shopping-bag", isSystem: false, sortOrder: 2, createdAt: new Date(now), updatedAt: new Date(now) },
    { id: "cat_salary", name: "Salary", type: "income", icon: "briefcase", isSystem: false, sortOrder: 3, createdAt: new Date(now), updatedAt: new Date(now) },
    { id: "cat_exp_others", name: "Other Expense", type: "expense", icon: "more-horizontal", isSystem: true, sortOrder: 99, createdAt: new Date(now), updatedAt: new Date(now) },
    { id: "cat_inc_others", name: "Other Income", type: "income", icon: "more-horizontal", isSystem: true, sortOrder: 99, createdAt: new Date(now), updatedAt: new Date(now) },
  ]).run();

  // Seed sample account
  db.insert(schema.accounts).values([
    {
      id: "acc_checking",
      accountTypeId: "type_bank",
      name: "BPI Checking",
      currencyCode: "PHP",
      openingBalanceMinorUnits: 500000,
      openingBalanceAt: new Date("2026-01-01T00:00:00Z"),
      startingBalanceLocked: false,
      hideFromSelection: false,
      hideFromReports: false,
      pocketEnabled: false,
      isArchived: false,
      sortOrder: 0,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    },
  ]).run();
}

// -------------------------------------------------------------
// Test Suites
// -------------------------------------------------------------

test("csv-tokenizer: detects delimiters (comma, semicolon, tab) and strips BOM", () => {
  assert.equal(detectDelimiter("Date,Amount,Payee\n2026-01-01,100,Shop"), ",");
  assert.equal(detectDelimiter("Date;Amount;Payee\n2026-01-01;100;Shop"), ";");
  assert.equal(detectDelimiter("Date\tAmount\tPayee\n2026-01-01\t100\tShop"), "\t");

  const withBom = "\uFEFFDate,Amount\n2026-01-01,50";
  assert.equal(stripBOM(withBom), "Date,Amount\n2026-01-01,50");
});

test("csv-tokenizer: parses multiline quotes and escaped quotes", () => {
  const content = 'Date,Amount,Note\n2026-01-01,150.00,"Line 1\nLine 2"\n2026-01-02,200.00,"He said ""Hello"""';
  const result = parseDelimitedText(content, ",");

  assert.equal(result.headers.length, 3);
  assert.equal(result.headers[2], "Note");
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0][2], "Line 1\nLine 2");
  assert.equal(result.rows[1][2], 'He said "Hello"');
});

test("csv-tokenizer: rejects null bytes and unclosed quotes", () => {
  assert.throws(() => parseDelimitedText("Date,Amount\x00,Note"), /null byte/i);
  assert.throws(() => parseDelimitedText('Date,Amount\n2026-01-01,"Unclosed quote'), /unclosed quote/i);
});

test("parse-import-file: validates headers and row limits", () => {
  // Empty header
  assert.throws(
    () => parseRawCsvContent("Date,,Amount\n2026-01-01,foo,100", "test.csv"),
    /empty/i,
  );

  // Duplicate header
  assert.throws(
    () => parseRawCsvContent("Date,Amount,Amount\n2026-01-01,100,100", "test.csv"),
    /duplicate column name/i,
  );

  // No data rows
  assert.throws(
    () => parseRawCsvContent("Date,Amount\n", "test.csv"),
    /no data rows/i,
  );

  // Valid file parses successfully
  const valid = parseRawCsvContent("Date,Amount,Payee\n2026-01-01,100,Store\n2026-01-02,200,Cafe", "transactions.csv");
  assert.equal(valid.headers.length, 3);
  assert.equal(valid.rawRows.length, 2);
  assert.ok(valid.fileHash.length > 0);
});

test("suggest-column-mappings: matches known headers and moves on re-selection", () => {
  const headers = ["Transaction Date", "Debit", "Credit", "Account Name", "Category", "Memo"];
  const mappings = suggestColumnMappings(headers, "transactions");

  assert.equal(mappings.dateColumn, "Transaction Date");
  assert.equal(mappings.moneyOutColumn, "Debit");
  assert.equal(mappings.moneyInColumn, "Credit");
  assert.equal(mappings.accountColumn, "Account Name");
  assert.equal(mappings.categoryColumn, "Category");
  assert.equal(mappings.noteColumn, "Memo");

  // Reassigning moves column from old field to new field
  const updated = reassignColumnMapping(mappings, "date", "Account Name");
  assert.equal(updated.dateColumn, "Account Name");
  assert.equal(updated.accountColumn, undefined);
});

test("date-parser: detects date patterns and ambiguity", () => {
  // Clear ISO format
  const isoAnalysis = analyzeFirstRowDate("2026-05-18");
  assert.equal(isoAnalysis.isValid, true);
  assert.equal(isoAnalysis.detectedFormat, "YYYY-MM-DD");
  assert.equal(isoAnalysis.isAmbiguous, false);

  // Ambiguous date: 01/02/2026 can be 1 Feb 2026 or 2 Jan 2026
  const ambig = analyzeFirstRowDate("01/02/2026");
  assert.equal(ambig.isValid, true);
  assert.equal(ambig.isAmbiguous, true);
  assert.ok(ambig.option1?.reading.includes("February") || ambig.option1?.reading.includes("January"));
  assert.ok(ambig.option2?.reading.includes("February") || ambig.option2?.reading.includes("January"));

  // Outside 1900-2200 range
  const tooOld = analyzeFirstRowDate("1899-12-31");
  assert.equal(tooOld.isValid, false);
  const tooFar = analyzeFirstRowDate("2201-01-01");
  assert.equal(tooFar.isValid, false);

  // Parsing with format
  const parsedDayFirst = parseDateWithFormat("01/02/2026", "DD/MM/YYYY");
  assert.equal(parsedDayFirst.getFullYear(), 2026);
  assert.equal(parsedDayFirst.getMonth(), 1); // Feb is 1
  assert.equal(parsedDayFirst.getDate(), 1);

  const parsedMonthFirst = parseDateWithFormat("01/02/2026", "MM/DD/YYYY");
  assert.equal(parsedMonthFirst.getFullYear(), 2026);
  assert.equal(parsedMonthFirst.getMonth(), 0); // Jan is 0
  assert.equal(parsedMonthFirst.getDate(), 2);
});

test("number-parser: handles comma vs dot decimals and currency exponents", () => {
  // Dot decimal
  const dotRes = analyzeFirstRowNumber("1,234.56");
  assert.equal(dotRes.isValid, true);
  assert.equal(dotRes.detectedFormat, "dot_decimal");
  assert.equal(dotRes.parsedMajor, 1234.56);

  // Comma decimal
  const commaRes = analyzeFirstRowNumber("1.234,56");
  assert.equal(commaRes.isValid, true);
  assert.equal(commaRes.detectedFormat, "comma_decimal");
  assert.equal(commaRes.parsedMajor, 1234.56);

  // Parentheses negative
  const parenRes = analyzeFirstRowNumber("(500.00)");
  assert.equal(parenRes.isValid, true);
  assert.equal(parenRes.parsedMajor, -500);

  // Minor unit conversion with 2 decimal places (PHP)
  const minorPhp = parseNumberToMinorUnits("1,234.56", "PHP", "dot_decimal");
  assert.equal(minorPhp.minorUnits, 123456);

  // Minor unit conversion with 0 decimal places (JPY)
  const minorJpy = parseNumberToMinorUnits("1,234", "JPY", "dot_decimal");
  assert.equal(minorJpy.minorUnits, 1234);
});

test("source-identity: builds deterministic FNV-1a hash identities", () => {
  const id1 = buildSourceIdentity({
    importType: "transactions",
    sourceName: "BPI",
    accountName: "Checking",
    originalId: "tx_123",
    fileHash: "hash123",
    rowNumber: 1,
  });

  const id2 = buildSourceIdentity({
    importType: "transactions",
    sourceName: "BPI",
    accountName: "Checking",
    originalId: "tx_123",
    fileHash: "hash123",
    rowNumber: 1,
  });

  assert.equal(id1, id2);
  assert.equal(id1, "transactions:bpi:checking:tx_123");

  const idNoOrig = buildSourceIdentity({
    importType: "transactions",
    sourceName: "BPI",
    accountName: "Checking",
    fileHash: "hash123",
    rowNumber: 5,
  });
  assert.equal(idNoOrig, "transactions:hash123:5");
});

test("match-accounts: matches existing non-credit-card active accounts and creates candidates", () => {
  const existing = [
    {
      id: "acc_1",
      name: "BPI Checking",
      currencyCode: "PHP",
      isArchived: false,
      accountTypeId: "type_bank",
      creditCardDetails: null,
      accountType: { id: "type_bank", name: "Bank", accountGroup: "asset" },
      openingBalanceAt: new Date("2026-01-01"),
    },
    {
      id: "acc_cc",
      name: "Citi Card",
      currencyCode: "PHP",
      isArchived: false,
      accountTypeId: "system:liability:credit-card",
      creditCardDetails: { creditLimitMinorUnits: 5000000 },
      accountType: { id: "system:liability:credit-card", name: "Credit Card", accountGroup: "liability" },
      openingBalanceAt: new Date("2026-01-01"),
    },
  ];

  const types = [
    { id: "type_bank", name: "Bank", accountGroup: "asset" },
    { id: "type_wallet", name: "Cash Wallet", accountGroup: "asset" },
  ];

  const candidates = [
    { name: "BPI Checking", sourceCurrency: "PHP" },
    { name: "Citi Card", sourceCurrency: "PHP" }, // liability/credit card - must NOT match existing
    { name: "Cash on Hand", sourceCurrency: "PHP" },
  ];

  const decisions = buildInitialAccountMatches(candidates, existing, types, "PHP", "transactions", new Date("2026-01-01"));

  assert.equal(decisions["bpi checking"].mode, "existing");
  assert.equal(decisions["bpi checking"].existingAccountId, "acc_1");

  // Credit card is liability -> must be setup as new asset account instead
  assert.equal(decisions["citi card"].mode, "new");

  // Unknown account setup as new
  assert.equal(decisions["cash on hand"].mode, "new");
  assert.equal(decisions["cash on hand"].newAccount?.openingBalanceMinorUnits, 0);
});

test("match-categories & labels: matches categories, maps default other, parses semicolon labels", () => {
  const existingCats = [
    { id: "cat_food", name: "Food", type: "expense", parentId: null },
    { id: "cat_groceries", name: "Groceries", type: "expense", parentId: "cat_food" },
    { id: "cat_salary", name: "Salary", type: "income", parentId: null },
    { id: "cat_exp_others", name: "Other Expense", type: "expense", parentId: null },
    { id: "cat_inc_others", name: "Other Income", type: "income", parentId: null },
  ];

  const candidates = [
    { key: buildCategoryKey("expense", "Food", "Groceries"), type: "expense", categoryName: "Food", subcategoryName: "Groceries", hasPipeChar: false },
    { key: buildCategoryKey("income", "Salary"), type: "income", categoryName: "Salary", hasPipeChar: false },
    { key: buildCategoryKey("expense", "Unexpected Mystery"), type: "expense", categoryName: "Unexpected Mystery", hasPipeChar: false },
  ];

  const matches = buildInitialCategoryMatches(candidates, existingCats);

  assert.equal(matches["expense:food > groceries"].mode, "existing");
  assert.equal(matches["expense:food > groceries"].existingCategoryId, "cat_groceries");

  assert.equal(matches["income:salary"].mode, "existing");
  assert.equal(matches["income:salary"].existingCategoryId, "cat_salary");

  // Unrecognized -> fallback to default other
  assert.equal(matches["expense:unexpected mystery"].mode, "default_other");
  assert.equal(matches["expense:unexpected mystery"].existingCategoryId, "cat_exp_others");

  // Semicolon-separated labels parsing
  const parsedLabels = resolveRowLabels(" Groceries ; Weekly ; Market ; ; Groceries ", []);
  assert.deepEqual(parsedLabels.labelsToCreate, ["Groceries", "Weekly", "Market"]);
});

test("sample-import-files: validates sample CSV constants have BOM and required headers", () => {
  assert.ok(SAMPLE_TRANSACTIONS_CSV.startsWith("\uFEFF"));
  assert.ok(SAMPLE_TRANSACTIONS_CSV.includes("Date,Type,Amount,Currency,Account,To Account,Category,Subcategory,Name,Note,Labels,Source ID"));
  assert.ok(SAMPLE_TRANSACTIONS_CSV.includes("Expense"));
  assert.ok(SAMPLE_TRANSACTIONS_CSV.includes("Income"));
  assert.ok(SAMPLE_TRANSACTIONS_CSV.includes("Transfer"));

  assert.ok(SAMPLE_ACCOUNTS_CSV.startsWith("\uFEFF"));
  assert.ok(SAMPLE_ACCOUNTS_CSV.includes("Account,Account Type,Currency,Opening Balance,Balance Date"));
  assert.ok(SAMPLE_ACCOUNTS_CSV.includes("Bank Account"));
});

test("build-import-preview: detects paired transfers, duplicate imports, and review summaries", () => {
  const parsedFile = {
    fileName: "transfers.csv",
    fileSize: 500,
    headers: ["Date", "Account", "To Account", "Amount", "Note"],
    rawRows: [
      ["2026-02-10", "Checking", "Savings", "1000.00", "Transfer to savings"],
      ["2026-02-11", "Checking", "", "-500.00", "Grocery shopping"],
    ],
    delimiter: ",",
    fileHash: "hash111",
  };

  const preview = buildImportPreview({
    parsedFile,
    importType: "transactions",
    config: {
      dateColumn: "Date",
      accountColumn: "Account",
      toAccountColumn: "To Account",
      amountColumn: "Amount",
      noteColumn: "Note",
      dateFormat: "YYYY-MM-DD",
      numberFormat: "dot_decimal",
      amountLayout: "single",
      transferStyle: "single_row",
      unrecognizedTypeMatches: {},
      typeMap: {},
      fallbackCurrency: "PHP",
    },
    accountMatches: {
      checking: { sourceName: "Checking", mode: "existing", existingAccountId: "acc_checking" },
      savings: { sourceName: "Savings", mode: "existing", existingAccountId: "acc_savings" },
    },
    categoryMatches: {
      "expense:": { sourceKey: "expense:", type: "expense", mode: "default_other", existingCategoryId: "cat_exp_others" },
    },
    existingAccounts: [
      {
        id: "acc_checking",
        name: "Checking",
        currencyCode: "PHP",
        isArchived: false,
        accountTypeId: "type_bank",
        creditCardDetails: null,
        accountType: { id: "type_bank", name: "Bank", accountGroup: "asset" },
        openingBalanceAt: new Date("2026-01-01"),
      },
      {
        id: "acc_savings",
        name: "Savings",
        currencyCode: "PHP",
        isArchived: false,
        accountTypeId: "type_bank",
        creditCardDetails: null,
        accountType: { id: "type_bank", name: "Bank", accountGroup: "asset" },
        openingBalanceAt: new Date("2026-01-01"),
      },
    ],
    existingCategories: [
      { id: "cat_exp_others", name: "Other Expense", type: "expense", isSystem: true },
    ],
    activeCurrencies: [
      { code: "PHP", name: "Philippine Peso", symbol: "₱", minorUnitExponent: 2 },
    ],
    availableAccountTypes: [
      { id: "type_bank", name: "Bank", accountGroup: "asset" },
    ],
    previouslyImportedIdentities: new Set(),
    similarTransactionChecker: () => null,
  });

  assert.equal(preview.summary.totalDataRows, 2);
  assert.equal(preview.summary.readyCount, 2);
  assert.equal(preview.summary.needsAttentionCount, 0);
  assert.equal(preview.summary.canImport, true);
  assert.equal(preview.rows[0].type, "transfer");
  assert.equal(preview.rows[0].toAccountId, "acc_savings");
  assert.equal(preview.rows[1].type, "expense");
});

test("full import workflow: atomic persistence, batch history, and batch removal", async () => {
  connect();
  migrate();
  seedBaseEntities(database);

  const rawCsv = [
    "Date,Amount,Type,Account,Category,Name,Note,Labels",
    "2026-03-01,150.00,Expense,BPI Checking,Food,Supermarket,Weekly snacks,Snacks;Groceries",
    "2026-03-02,5000.00,Income,BPI Checking,Salary,Work,March Bonus,Bonus",
  ].join("\n");

  const parsedFile = parseRawCsvContent(rawCsv, "march_records.csv");

  const config = {
    dateColumn: "Date",
    amountColumn: "Amount",
    typeColumn: "Type",
    accountColumn: "Account",
    categoryColumn: "Category",
    nameColumn: "Name",
    noteColumn: "Note",
    labelsColumn: "Labels",
    dateFormat: "YYYY-MM-DD",
    numberFormat: "dot_decimal",
    amountLayout: "single",
    transferStyle: "single_row",
    unrecognizedTypeMatches: {},
    typeMap: {},
    fallbackCurrency: "PHP",
    sourceName: "BankApp",
  };

  const accountMatches = {
    "bpi checking": { sourceName: "BPI Checking", mode: "existing", existingAccountId: "acc_checking" },
  };

  const categoryMatches = {
    "expense:food": { sourceKey: "expense:food", type: "expense", mode: "existing", existingCategoryId: "cat_food" },
    "income:salary": { sourceKey: "income:salary", type: "income", mode: "existing", existingCategoryId: "cat_salary" },
  };

  // Execute import
  const result = await executeDataImport({
    parsedFile,
    importType: "transactions",
    config,
    accountMatches,
    categoryMatches,
  }, database);

  assert.equal(result.importedCount, 2);
  assert.equal(result.leftOutCount, 0);
  assert.ok(result.batchId.length > 0);

  // Verify transactions in database
  const txRows = database.select().from(schema.transactions).all();
  assert.equal(txRows.length, 2);

  const expenseTx = txRows.find((t) => t.type === "expense");
  assert.equal(expenseTx.amountMinorUnits, -15000);
  assert.equal(expenseTx.name, "Supermarket");

  // Verify labels assigned
  const labelLinks = database.select().from(schema.transactionLabels).all();
  assert.ok(labelLinks.length >= 2);

  // Verify batch record in history
  const batches = getLatestImportBatches(database);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].fileName, "march_records.csv");
  assert.equal(batches[0].importedCount, 2);

  // Verify source identities created
  const identities = database.select().from(schema.importedSourceIdentities).all();
  assert.equal(identities.length, 2);

  // Remove import batch from history
  removeImportBatch(result.batchId, database);

  const batchesAfter = getLatestImportBatches(database);
  assert.equal(batchesAfter.length, 0);

  // Source identities cascade deleted
  const identitiesAfter = database.select().from(schema.importedSourceIdentities).all();
  assert.equal(identitiesAfter.length, 0);

  // But user financial records (transactions) remain untouched
  const txAfter = database.select().from(schema.transactions).all();
  assert.equal(txAfter.length, 2);
});
