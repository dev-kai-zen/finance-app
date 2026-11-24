const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function evaluate(source, context = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, ...context });
  return exports;
}
function source(file) { return fs.readFileSync(path.resolve(__dirname, file), "utf8"); }
const dates = evaluate(source("../utils/transaction-date-filter.ts"));
const { getBudgetPeriodInfo } = evaluate(source("../../budgets/utils/budget-period.ts"));
const { getBudgetTransactionScope } = evaluate(source("../../budgets/services/get-budget-transaction-scope.service.ts"));
const screenSource = source("../screens/transactions-screen.tsx");
const ast = ts.createSourceFile("screen.tsx", screenSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) &&
  ["initialFilterState", "resolveDateRangeForFilter"].includes(node.name?.text));
const defaults = {
  type: "all", datePreset: "all", customDateFrom: null, customDateTo: null,
  categoryIds: [], accountIds: [], labelIds: [], sortBy: "date", sortOrder: "desc",
};
const filters = evaluate(functions.map(node => node.getText(ast)).join("\n") +
  "\nexports.initialFilterState = initialFilterState; exports.resolveDateRangeForFilter = resolveDateRangeForFilter;", {
  DEFAULT_TRANSACTION_FILTERS: defaults,
  parseBudgetTransactionScope: dates.parseBudgetTransactionScope,
  normalizeDateRange: dates.normalizeDateRange,
});
const category = { id: "food", subcategories: [{ id: "dining" }, { id: "groceries" }] };
const budgets = [{ id: "parent", categoryId: "food", isEnabled: true }, { id: "child", categoryId: "groceries", isEnabled: true }];

for (const [frequency, from, to] of [
  ["daily", "2026-11-15", "2026-11-15"],
  ["weekly", "2026-11-09", "2026-11-15"],
  ["biweekly", "2026-11-02", "2026-11-15"],
  ["semi_monthly", "2026-11-01", "2026-11-15"],
  ["monthly", "2026-11-01", "2026-11-30"],
  ["custom_monthly", "2026-11-01", "2026-11-30"],
  ["quarterly", "2026-10-01", "2026-12-31"],
  ["yearly", "2026-01-01", "2026-12-31"],
]) {
  test(`BUD-F02: ${frequency} links round-trip the exact displayed calendar period and category ownership`, () => {
    const period = getBudgetPeriodInfo(frequency, new Date(2026,10,15,12), new Date(2026,10,2));
    const scope = getBudgetTransactionScope({ budget: budgets[0], category,
      periodStart: period.startDate, periodEnd: period.endDate }, budgets);
    assert.equal(scope.dateFrom, from); assert.equal(scope.dateTo, to);
    assert.deepEqual(Array.from(scope.categoryIds), ["food", "dining"]);
    const state = filters.initialFilterState(undefined, undefined, undefined, undefined, undefined, undefined, undefined, JSON.stringify(scope));
    assert.equal(state.type, "expense"); assert.equal(state.exactCategory, true);
    assert.equal(state.categoryAmountScope, true);
    const range = filters.resolveDateRangeForFilter(state);
    assert.equal(range.startDate.getTime(), period.startDate.getTime());
    assert.equal(range.endDate.getTime(), period.endDate.getTime());
  });
}

test("BUD-F02: paused child budgets fall back to the parent; boundary-spanning weeks keep both months", () => {
  const period=getBudgetPeriodInfo("weekly",new Date(2026,10,1,12));
  const scope=getBudgetTransactionScope({ budget:budgets[0], category, periodStart:period.startDate,periodEnd:period.endDate },[budgets[0],{...budgets[1],isEnabled:false}]);
  assert.deepEqual(Array.from(scope.categoryIds),["food","dining","groceries"]);
  assert.equal(scope.dateFrom,"2026-10-26"); assert.equal(scope.dateTo,"2026-11-01");
});

test("BUD-F02: malformed, empty and impossible-date scopes fail closed; ordinary routes preserve their filters", () => {
  for(const scope of ["bad JSON","null","{}",JSON.stringify({categoryIds:[],dateFrom:"2026-11-01",dateTo:"2026-11-30"}),
    JSON.stringify({categoryIds:["food"],dateFrom:"2026-02-30",dateTo:"2026-03-01"}),
    JSON.stringify({categoryIds:["food"],dateFrom:"2026-11-30",dateTo:"2026-11-01"}),
    JSON.stringify({categoryIds:[null],dateFrom:"2026-11-01",dateTo:"2026-11-30"})]) {
    const state=filters.initialFilterState(undefined,undefined,undefined,undefined,undefined,undefined,undefined,scope);
    assert.equal(filters.resolveDateRangeForFilter(state).emptyResult,true);
  }
  const ordinary=filters.initialFilterState("food","this_month",undefined,"income");
  assert.equal(ordinary.type,"income");assert.equal(ordinary.datePreset,"this_month");
  assert.equal(ordinary.categoryAmountScope,undefined);
  assert.equal(filters.initialFilterState(),defaults);
});

test("BUD-F02: the actual budget link callback sends the loaded scope instead of a month preset", () => {
  const text=source("../../budgets/screens/budgets-screen.tsx");
  const tree=ts.createSourceFile("budget.tsx",text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let callback;
  function visit(node){if(ts.isJsxAttribute(node)&&node.name.getText(tree)==="onViewTransactions")callback=node.initializer.expression.getText(tree);ts.forEachChild(node,visit);}
  visit(tree);assert.ok(callback);
  let href;
  const status={budget:budgets[0],category,periodStart:new Date(2026,10,15),periodEnd:new Date(2026,10,15,23,59,59,999)};
  evaluate("const open = "+callback+"; open();",{status,getTransactionScope:value=>getBudgetTransactionScope(value,budgets),router:{push:value=>{href=value;}}});
  assert.equal(href.pathname,"/transactions");
  assert.equal(JSON.parse(href.params.budgetScope).dateFrom,"2026-11-15");
  assert.equal(href.params.datePreset,undefined);
  for (const raw of [href.params.budgetScope, undefined, [href.params.budgetScope, "duplicate"]]) {
    const route=evaluate(source("../../../app/transactions/index.tsx"), { require(name) {
      if(name==="expo-router") return {useLocalSearchParams:()=>({budgetScope:raw})};
      if(name==="@/modules/transactions") return {TransactionsScreen:"TransactionsScreen"};
      if(name==="react/jsx-runtime") return {jsx:(type,props)=>({type,props})};
      throw Error("Unexpected route dependency: "+name);
    } });
    assert.equal(route.default().props.initialBudgetScope,Array.isArray(raw)?"":raw);
  }
});

test("BUD-F02: clearing filters and navigating back to an ordinary route discard the budget scope", () => {
  let routeEffect, clear;
  function visit(node) {
    if(ts.isCallExpression(node) && node.expression.getText(ast)==="useEffect" && node.arguments[0].getText(ast).includes("setFilterState(initialFilterState(undefined")) routeEffect=node.arguments[0].getText(ast);
    if(ts.isVariableDeclaration(node) && node.name.getText(ast)==="handleClearFilters") clear=node.initializer.getText(ast);
    ts.forEachChild(node,visit);
  }
  visit(ast); assert.ok(routeEffect); assert.ok(clear);
  let state=defaults;
  const context={
    initialAction:undefined,initialBudgetScope:undefined,initialCategoryId:undefined,initialDatePreset:undefined,
    initialAccountId:undefined,initialType:undefined,initialLabelId:undefined,initialFlow:undefined,initialExactCategory:undefined,
    initialFilterState:filters.initialFilterState,DEFAULT_TRANSACTION_FILTERS:defaults,setSearchQuery() {},
    setFilterState:value=>{state=typeof value==="function"?value(state):value;},
  };
  const period=getBudgetPeriodInfo("daily",new Date(2026,10,15));
  context.initialBudgetScope=JSON.stringify(getBudgetTransactionScope({budget:budgets[0],category,periodStart:period.startDate,periodEnd:period.endDate},budgets));
  evaluate("("+routeEffect+")();",context); assert.equal(state.categoryAmountScope,true);
  evaluate("("+clear+")();",context); assert.equal(state,defaults);
  evaluate("("+routeEffect+")();",context); assert.equal(state.categoryAmountScope,true);
  context.initialBudgetScope=undefined;
  evaluate("("+routeEffect+")();",context); assert.equal(state,defaults);
});

test("BUD-F02: category-share labels format native currency and respect privacy", () => {
  const text=source("../components/transaction-row.tsx");
  const tree=ts.createSourceFile("row.tsx",text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let expression;
  function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==="categoryShareLabel")expression=node.initializer.getText(tree);ts.forEachChild(node,visit);}
  visit(tree);assert.ok(expression);
  const currency=evaluate(source("../../../utils/currency.ts"));
  for(const isPrivate of [false,true]) {
    const result=evaluate("exports.label = "+expression+";",{
      transaction:{amountMinorUnits:-100000,categoryAmountMinorUnits:-30000,accountCurrency:"PHP"},isPrivate,
      formatCurrency:currency.formatCurrency,t:(key,values)=>values.amount,
    });
    assert.equal(result.label,isPrivate?"••••••":currency.formatCurrency(-30000,"PHP",false));
  }
});
