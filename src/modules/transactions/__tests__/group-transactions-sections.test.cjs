const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
const currency = require("../../../utils/currency.ts");
const originalLoad = Module._load;
Module._load = function (request, ...args) {
  return request === "@/utils/currency" ? currency : originalLoad.call(this, request, ...args);
};
const { buildTransactionSections } = require("../utils/group-transactions-sections.ts");
const rates = new Map([["PHP", 10000], ["USD", 585000], ["JPY", 3900], ["BHD", 1500000]]);
function tx(id, amountMinorUnits, accountCurrency, overrides = {}) {
  return { id, amountMinorUnits, accountCurrency, currencyCode: "USD", type: "expense",
    occurredAt: new Date(2026, 10, 21, 12), ...overrides };
}

test("P2-07: single-currency headers use the account currency, regardless of typed or default currency", () => {
  const [section] = buildTransactionSections([tx("usd-on-php", -58500, "PHP")], "date", "USD", rates);
  assert.equal(section.currencyCode, "PHP");
  assert.equal(section.netMinorUnits, -58500);
  assert.match(currency.formatCurrency(section.netMinorUnits, section.currencyCode, true), /585\.00/);
  const [foreign] = buildTransactionSections([tx("foreign", -1000, "USD", { currencyCode: "JPY" })], "date", "PHP", rates);
  assert.equal(foreign.currencyCode, "USD");
  assert.equal(foreign.netMinorUnits, -1000);
});

test("P2-07: mixed-account days convert every signed ledger amount before summing in default currency", () => {
  const rows = [tx("php-a", -10000, "PHP"), tx("usd", -1000, "USD", { currencyCode: "PHP" }), tx("php-b", 2000, "PHP")];
  const [section] = buildTransactionSections(rows, "date", "PHP", rates);
  assert.equal(section.currencyCode, "PHP");
  assert.equal(section.netMinorUnits, -66500);
  assert.equal(section.count, 3);
  assert.deepEqual(section.data, rows);
  const [reverse] = buildTransactionSections([...rows].reverse(), "date", "PHP", rates);
  assert.equal(reverse.netMinorUnits, section.netMinorUnits);
  assert.equal(reverse.currencyCode, section.currencyCode);
  const [usd] = buildTransactionSections(rows, "date", "USD", rates);
  assert.equal(usd.currencyCode, "USD");
  assert.equal(usd.netMinorUnits, -1137);
});

test("P2-07: refunds and income reversals keep their ledger signs; transfers are excluded", () => {
  const rows = [tx("charge", -5000, "PHP"), tx("refund", 2000, "PHP"),
    tx("income", 10000, "PHP", { type: "income" }),
    tx("reversal", -3000, "PHP", { type: "income" }),
    tx("transfer", -100000, "USD", { type: "transfer" })];
  const [section] = buildTransactionSections(rows, "date", "USD", rates);
  assert.equal(section.currencyCode, "PHP", "A foreign transfer cannot force conversion of monetary rows");
  assert.equal(section.netMinorUnits, 4000);
  assert.equal(section.count, 5);
  const [transfer] = buildTransactionSections([rows[4]], "date", "PHP", rates);
  assert.equal(transfer.netMinorUnits, 0);
  assert.equal(transfer.hasNonTransfer, false);
});

test("P2-07: zero/three-decimal currencies and transaction-level rounding are handled correctly", () => {
  const [jpy] = buildTransactionSections([tx("yen", -500, "JPY"), tx("usd", -1000, "USD")], "date", "USD", rates);
  assert.equal(jpy.netMinorUnits, -1333);
  const [bhd] = buildTransactionSections([tx("dinar", -1000, "BHD"), tx("usd", -100, "USD")], "date", "USD", { BHD: 1500000, USD: 500000 });
  assert.equal(bhd.netMinorUnits, -400);
  const [rounded] = buildTransactionSections([tx("yen-a", -1, "JPY"), tx("yen-b", -1, "JPY"), tx("zero", 0, "USD")], "date", "USD", rates);
  assert.equal(rounded.netMinorUnits, -2, "Convert each monetary row before adding it");
});

test("P2-07: pagination re-evaluates a day's currency without reordering rows or affecting other days", () => {
  const firstPage = [tx("php", -58500, "PHP")];
  const nextPage = [tx("usd", -1000, "USD"), tx("yesterday", 500, "JPY", { occurredAt: new Date(2026, 10, 20, 12) })];
  assert.equal(buildTransactionSections(firstPage, "date", "USD", rates)[0].currencyCode, "PHP");
  const sections = buildTransactionSections([...firstPage, ...nextPage], "date", "USD", rates);
  assert.equal(sections.length, 2);
  assert.equal(sections[0].currencyCode, "USD");
  assert.equal(sections[0].netMinorUnits, -2000);
  assert.deepEqual(sections[0].data.map(row => row.id), ["php", "usd"]);
  assert.equal(sections[1].currencyCode, "JPY");
  assert.equal(sections[1].netMinorUnits, 500);
  const flat = buildTransactionSections([...firstPage, ...nextPage], "amount", "PHP", rates);
  assert.equal(flat.length, 1);
  assert.equal(flat[0].isFlat, true);
  assert.deepEqual(flat[0].data, [...firstPage, ...nextPage]);
  assert.deepEqual(buildTransactionSections([], "date", "PHP", rates), []);
});

test("P2-07: missing account metadata uses default currency and grouping does not mutate ledger rows", () => {
  const row = tx("legacy", -500, undefined, { currencyCode: "USD" });
  const original = { ...row };
  const [section] = buildTransactionSections([row], "date", "PHP", { USD: 0 });
  assert.equal(section.currencyCode, "PHP");
  assert.equal(section.netMinorUnits, -500);
  assert.deepEqual(row, original);
});

function createRateHarness(pages, sortBy = "date") {
  const vm = require("node:vm");
  let cursor = 0, focusCallback, cleanup, focused = true;
  const slots = [], pending = new Set();
  let rateReads = 0, rendering = false, index = 0;
  const filter = { sortBy, sortOrder: "desc" };
  const same = (a, b) => a && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === "function" ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); },
    useCallback(callback, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { callback, deps }; return slots[i].callback; },
  };
  function evaluate(file, imports) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, { exports, require: imports });
    return exports;
  }
  const schedule = callback => { pending.add(callback); return () => pending.delete(callback); };
  const deferred = evaluate(path.resolve(__dirname, "../../../utils/run-deferred-sync-query.ts"),
    name => ({ scheduleAfterPaint: schedule }));
  const { usePaginatedTransactions } = evaluate(path.resolve(__dirname, "../hooks/use-paginated-transactions.ts"), name => {
    if (name === "react") return react;
    if (name === "react-native") return { DeviceEventEmitter: { addListener: () => ({ remove() {} }) } };
    if (name === "expo-router") return { useFocusEffect: cb => { focusCallback = cb; } };
    if (name === "@/utils/run-deferred-sync-query") return deferred;
    if (name === "@/utils/schedule-after-paint") return { scheduleAfterPaint: schedule };
    if (name === "@/utils/currency") return currency;
    if (name === "@/modules/currencies") return { getExchangeRateMap() {
      assert.equal(rendering, false, "Rate reads must stay outside render"); rateReads++; return rates;
    } };
    if (name === "../repositories/transactions.repository") return { listTransactionsPage({ cursor }) {
      assert.equal(rendering, false, "Page reads must stay outside render");
      index = cursor ? index + 1 : 0;
      return { items: pages[index], hasMore: index < pages.length - 1, nextCursor: index < pages.length - 1 ? { id: "next" } : null };
    } };
    return {};
  });
  let activeCallback;
  return {
    render() {
      cursor = 0; rendering = true;
      const value = usePaginatedTransactions({ filter, pageSize: 1 });
      rendering = false;
      if (focused && activeCallback !== focusCallback) { cleanup?.(); activeCallback = focusCallback; cleanup = focusCallback(); }
      return value;
    },
    flush() { const jobs = [...pending]; pending.clear(); jobs.forEach(callback => callback()); },
    blur() { focused = false; cleanup?.(); },
    get rateReads() { return rateReads; },
    get pending() { return pending.size; },
  };
}

test("P2-07: the paginated hook reads rates after paint once and reuses them on later pages", () => {
  const h = createRateHarness([[tx("first", -100, "PHP")], [tx("second", -100, "USD")]]);
  try {
    h.render(); assert.equal(h.rateReads, 0);
    h.flush();
    const state = h.render();
    assert.equal(h.rateReads, 1);
    assert.equal(state.exchangeRates, rates);
    state.loadMore(); assert.equal(h.rateReads, 1);
    h.flush();
    assert.equal(h.rateReads, 1);
    assert.equal(h.render().transactions.length, 2);
  } finally { h.blur(); }
});

test("P2-07: a transfer-only first page defers the rate read until monetary rows arrive", () => {
  const h = createRateHarness([[tx("transfer", -100, "PHP", { type: "transfer" })], [tx("second", -100, "USD")]]);
  try {
    h.render(); h.flush(); assert.equal(h.rateReads, 0);
    h.render().loadMore(); h.flush(); assert.equal(h.rateReads, 1);
    assert.equal(h.render().exchangeRates, rates);
  } finally { h.blur(); }
});

test("P2-07: empty, amount-sorted and cancelled page loads do not read exchange rates", () => {
  for (const [pages, sortBy] of [[[[]], "date"], [[[tx("row", -100, "USD")]], "amount"]]) {
    const h = createRateHarness(pages, sortBy);
    h.render(); h.flush(); assert.equal(h.rateReads, 0); h.blur();
  }
  const h = createRateHarness([[tx("row", -100, "USD")]]);
  h.render(); h.blur(); h.flush();
  assert.equal(h.rateReads, 0);
  assert.equal(h.pending, 0);
});
