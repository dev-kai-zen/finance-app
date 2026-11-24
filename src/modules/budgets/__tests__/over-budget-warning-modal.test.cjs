const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require(name) {
      assert.ok(name in dependencies, "Unexpected dependency: " + name);
      return dependencies[name];
    },
  });
  return exports;
}

const currency = load("../../../utils/currency.ts");
const catalogs = Object.fromEntries(["en", "fil", "es"].map(language => [language,
  load(`../../../infrastructure/localization/translations/${language}.ts`)[language],
]));

function harness() {
  let hookReads = 0, dismissed = 0, cancelled = 0, proceeded = 0;
  const t = (key, values = {}) => {
    const template = key.split(".").reduce((value, part) => value?.[part], catalogs.en);
    assert.equal(typeof template, "string", "Missing translation " + key);
    return template.replace(/%\{(\w+)\}/g, (_, name) => values[name]);
  };
  const theme = { colors: { danger: "red" }, spacing: {}, borderRadius: {} };
  const native = Object.fromEntries(["Modal", "Pressable", "ScrollView", "Text", "View"].map(name => [name, name]));
  native.Keyboard = { dismiss: () => dismissed++ };
  native.StyleSheet = { create: styles => styles };
  native.useWindowDimensions = () => ({ width: 390, height: 800 });
  const { OverBudgetWarningModal } = load("../components/over-budget-warning-modal.tsx", {
    react: { memo: component => component, useCallback: callback => callback },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "react-native": native,
    "lucide-react-native": { AlertTriangle: "AlertTriangle" },
    "@/components": { AppButton: "AppButton" },
    "@/constants/layout": { isTabletOrDesktop: () => false },
    "@/hooks/use-app-theme": {
      useAppTheme: () => { hookReads++; return theme; },
      useThemeStyles: create => create(theme),
    },
    "@/infrastructure/localization": { useLocalization: () => ({ t }) },
    "@/utils/currency": currency,
  });
  function expand(node) {
    if (Array.isArray(node)) return node.map(expand);
    if (!node || typeof node !== "object") return node;
    if (typeof node.type === "function") return expand(node.type(node.props));
    return { ...node, props: { ...node.props, children: expand(node.props.children) } };
  }
  return {
    render: props => expand(OverBudgetWarningModal({ visible: true, onCancel: () => cancelled++, onProceed: () => proceeded++, ...props })),
    get hookReads() { return hookReads; }, get dismissed() { return dismissed; },
    get cancelled() { return cancelled; }, get proceeded() { return proceeded; },
  };
}
function find(node, predicate) {
  if (Array.isArray(node)) {
    for (const child of node) { const found = find(child, predicate); if (found) return found; }
  } else if (node && typeof node === "object") {
    if (predicate(node)) return node;
    return find(node.props?.children, predicate);
  }
}
const result = {
  budgetId: "food", categoryName: "Food", periodLabel: "November 2026", budgetCurrencyCode: "PHP",
  effectiveBudgetCents: 500000, currentSpentCents: 450000, additionalExpenseCents: 60000,
  newSpentCents: 510000, exceededByCents: 10000, exceeds: true,
};

test("BUD-F03: combined confirmation renders every budget and amount inside a bounded scroll area", () => {
  const h = harness();
  assert.equal(h.render({ visible: false, results: [result] }), null);
  assert.equal(h.hookReads, 0, "Closed warnings mount no theme or domain subtree");
  const tree = h.render({ results: [result, { ...result, budgetId: "travel", categoryName: "Travel", budgetCurrencyCode: "KWD" }] });
  const text = JSON.stringify(tree);
  assert.ok(text.includes("Food")); assert.ok(text.includes("Travel"));
  assert.ok(text.includes("2 budgets")); assert.ok(text.includes("5,100.00"));
  assert.ok(text.includes(currency.formatCurrency(510000, "KWD", false)));
  assert.equal(find(tree, node => node.type === "ScrollView").props.keyboardShouldPersistTaps, "handled");
  assert.ok(find(tree, node => node.props?.style?.[0]?.maxHeight === "90%"));
  find(tree, node => node.props?.label === "Cancel & Edit").props.onPress();
  assert.equal(h.cancelled, 1); assert.equal(h.dismissed, 1); assert.equal(h.proceeded, 0);
  find(tree, node => node.props?.label === "Proceed Anyway").props.onPress();
  assert.equal(h.proceeded, 1); assert.equal(h.dismissed, 2);
});

test("BUD-F03: pending confirmation blocks Proceed, Cancel, backdrop and Android back", () => {
  const h = harness();
  const tree = h.render({ results: [result], pending: true });
  find(tree, node => node.props?.label === "Proceed Anyway").props.onPress();
  find(tree, node => node.props?.label === "Cancel & Edit").props.onPress();
  find(tree, node => node.type === "Pressable").props.onPress();
  find(tree, node => node.type === "Modal").props.onRequestClose();
  assert.equal(h.cancelled, 0); assert.equal(h.proceeded, 0);
});

test("BUD-F03: warning text and interpolation keys exist in English, Filipino and Spanish", () => {
  const keys = Object.keys(catalogs.en.transactions).filter(key => key.startsWith("budgetWarning"));
  assert.ok(keys.length >= 12);
  for (const language of ["fil", "es"]) for (const key of keys) {
    const value = catalogs[language].transactions[key];
    assert.equal(typeof value, "string", `${language}.${key}`);
    assert.deepEqual(value.match(/%\{\w+\}/g)?.sort(), catalogs.en.transactions[key].match(/%\{\w+\}/g)?.sort());
  }
});


test('BUD-F04: zero-limit confirmation displays monetary excess without a fictitious percentage', () => {
  const h=harness();
  const tree=h.render({results:[{...result,effectiveBudgetCents:0,currentSpentCents:0,additionalExpenseCents:10000,newSpentCents:10000,exceededByCents:10000}]});
  assert.ok(JSON.stringify(tree).includes(currency.formatCurrency(10000,'PHP',false)));
  assert.equal(find(tree,node=>node.type==='Text' && String(JSON.stringify(node.props.children)).includes('%')),undefined);
  assert.doesNotMatch(JSON.stringify(tree),/NaN|Infinity/);
  assert.ok(find(h.render({results:[result]}),node=>node.type==='Text' && JSON.stringify(node.props.children).includes('102')),'Positive-limit percentage is retained');
});


test('BUD-F04: live indicator shows zero-limit excess and never a zero-limit near warning', () => {
  const evaluator=load('../services/check-budget-exceeded.service.ts', {
    '@/infrastructure/database/client':{}, '@/modules/categories':{}, '@/modules/currencies':{},
    '@/utils/currency':currency, '../repositories/category-budgets.repository':{}, './calculate-category-budget.service':{},
  }).evaluateBudgetSnapshot;
  let reads=0,slot=0;const cache=[];
  let stateSlot=0;const stateCache=[];
  let effectSlot=0;const effectCache=[];
  const snapshot={hasBudget:true,isEnabled:true,effectiveBudgetCents:0,currentSpentCents:0,remainingBeforeCents:0,expenseCurrency:'PHP',budgetCurrencyCode:'PHP',categoryName:'Food',periodLabel:'November 2026',notifyOnExceeded:true,ratesMap:new Map()};
  const theme={colors:{danger:'red',warning:'orange',success:'green'},spacing:{},borderRadius:{}};
  const {BudgetLiveIndicator}=load('../components/budget-live-indicator.tsx', {
    react:{
      memo:c=>c,
      useMemo:(fn,deps)=>{const i=slot++;if(!cache[i]||deps.some((v,j)=>v!==cache[i].deps[j]))cache[i]={deps,value:fn()};return cache[i].value;},
      useState:(initial)=>{const i=stateSlot++;if(!(i in stateCache))stateCache[i]=typeof initial==='function'?initial():initial;return [stateCache[i],next=>{stateCache[i]=typeof next==='function'?next(stateCache[i]):next;}];},
      useEffect:(effect,deps)=>{const i=effectSlot++;if(!effectCache[i]||deps.some((v,j)=>v!==effectCache[i].deps[j])){effectCache[i]={deps,cleanup:effect?.()};}},
    },
    '@/utils/schedule-after-paint':{
      scheduleAfterPaint:cb=>{cb();return ()=>{};},
    },
    'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    'react-native':{StyleSheet:{create:s=>s},Text:'Text',View:'View'},
    'lucide-react-native':{AlertCircle:'AlertCircle',AlertTriangle:'AlertTriangle',CheckCircle2:'CheckCircle2'},
    '@/hooks/use-app-theme':{useAppTheme:()=>theme,useThemeStyles:create=>create(theme)},
    '@/utils/currency':currency,
    '../services/check-budget-exceeded.service':{getBudgetLiveSnapshot:()=>{reads++;return snapshot;},evaluateBudgetSnapshot:evaluator},
  });
  const render=amount=>{
    slot=0;stateSlot=0;effectSlot=0;
    BudgetLiveIndicator({categoryId:'food',amountMinorUnits:amount});
    slot=0;stateSlot=0;effectSlot=0;
    return BudgetLiveIndicator({categoryId:'food',amountMinorUnits:amount});
  };
  const zero=JSON.stringify(render(0)); assert.doesNotMatch(zero,/Near |% used/);
  const expense=JSON.stringify(render(10000));assert.match(expense,/Exceeds November 2026 budget by/);assert.match(expense,/100.00/);
  assert.doesNotMatch(expense,/% used|NaN|Infinity/);
  for(let i=0;i<50;i++)render(i*100);
  assert.equal(reads,1,'Typing only evaluates the cached baseline');
});

test('BUD-F04: zero-limit card shows monetary excess without 100% text', () => {
  const theme={colors:{danger:'red'},spacing:{},borderRadius:{}};
  const {BudgetCard}=load('../components/budget-card.tsx', {
    react:{memo:c=>c,useCallback:cb=>cb}, 'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    'react-native':{StyleSheet:{create:s=>s},Text:'Text',View:'View',Pressable:'Pressable'},
    'lucide-react-native':{AlertCircle:'AlertCircle',AlertTriangle:'AlertTriangle',ArrowRight:'ArrowRight',RotateCw:'RotateCw'},
    '@/components':{IconHelper:'IconHelper',ThemedSwitch:'ThemedSwitch'},
    '@/hooks/use-app-theme':{useAppTheme:()=>theme,useThemeStyles:create=>create(theme)},
    '@/modules/currencies':{useCurrencyPreferences:()=>({preferences:{}})},
    '@/modules/hex-colors':{useResolveEntityColor:()=>()=>null}, '@/utils/currency':currency,
  });
  const tree=BudgetCard({status:{budget:{isEnabled:true,currencyCode:'PHP',frequency:'custom_monthly'},category:{name:'Food'},effectiveTargetCents:0,spentCents:10000,remainingCents:-10000,percentage:100,isExceeded:true},onPress:()=>{},onToggle:()=>{}});
  assert.ok(JSON.stringify(tree).includes('Over by'));
  assert.equal(find(tree,node=>node.type==='Text' && String(JSON.stringify(node.props.children)).includes('%')),undefined);
});

test('BUD-F12: live indicator defers SQLite query after paint and cancels pending request on category switch', () => {
  let reads=0;
  let slot=0;const cache=[];
  let stateSlot=0;const stateCache=[];
  let effectSlot=0;const effectCache=[];
  let scheduledCb=null;
  const cancelledCalls=[];
  const snapshot={hasBudget:true,isEnabled:true,effectiveBudgetCents:10000,currentSpentCents:2000,remainingBeforeCents:8000,expenseCurrency:'PHP',budgetCurrencyCode:'PHP',categoryName:'Food',periodLabel:'November 2026',notifyOnExceeded:true,ratesMap:new Map()};
  const theme={colors:{danger:'red',warning:'orange',success:'green'},spacing:{},borderRadius:{}};

  const {BudgetLiveIndicator}=load('../components/budget-live-indicator.tsx', {
    react:{
      memo:c=>c,
      useMemo:(fn,deps)=>{const i=slot++;if(!cache[i]||deps.some((v,j)=>v!==cache[i].deps[j]))cache[i]={deps,value:fn()};return cache[i].value;},
      useState:(initial)=>{const i=stateSlot++;if(!(i in stateCache))stateCache[i]=typeof initial==='function'?initial():initial;return [stateCache[i],next=>{stateCache[i]=typeof next==='function'?next(stateCache[i]):next;}];},
      useEffect:(effect,deps)=>{
        const i=effectSlot++;
        if(!effectCache[i]||deps.some((v,j)=>v!==effectCache[i].deps[j])){
          effectCache[i]?.cleanup?.();
          effectCache[i]={deps,cleanup:effect?.()};
        }
      },
    },
    '@/utils/schedule-after-paint':{
      scheduleAfterPaint:cb=>{
        scheduledCb=cb;
        return ()=>{ cancelledCalls.push(true); };
      },
    },
    'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    'react-native':{StyleSheet:{create:s=>s},Text:'Text',View:'View'},
    'lucide-react-native':{AlertCircle:'AlertCircle',AlertTriangle:'AlertTriangle',CheckCircle2:'CheckCircle2'},
    '@/hooks/use-app-theme':{useAppTheme:()=>theme,useThemeStyles:create=>create(theme)},
    '@/utils/currency':currency,
    '../services/check-budget-exceeded.service':{
      getBudgetLiveSnapshot:()=>{reads++;return snapshot;},
      evaluateBudgetSnapshot:(snap,amount)=>({hasBudget:true,isEnabled:true,effectiveBudgetCents:snap.effectiveBudgetCents,newSpentCents:amount,remainingAfterCents:snap.effectiveBudgetCents-amount,exceeds:amount>snap.effectiveBudgetCents,exceededByCents:Math.max(0,amount-snap.effectiveBudgetCents),budgetCurrencyCode:'PHP',periodLabel:snap.periodLabel}),
    },
  });

  // 1. Initial render does NOT run SQL synchronously during render pass
  slot=0;stateSlot=0;effectSlot=0;
  const initialTree=BudgetLiveIndicator({categoryId:'food',amountMinorUnits:5000});
  assert.equal(reads,0,'Render phase must not execute SQLite snapshot queries synchronously');
  assert.equal(initialTree,null,'Initial tree is null before snapshot commits');
  assert.ok(typeof scheduledCb==='function','Snapshot query must be scheduled after paint');

  // 2. Painting runs the scheduled callback and populates snapshot
  scheduledCb();
  assert.equal(reads,1,'Invoking scheduled callback executes snapshot query');

  slot=0;stateSlot=0;effectSlot=0;
  const paintedTree=BudgetLiveIndicator({categoryId:'food',amountMinorUnits:5000});
  assert.ok(paintedTree!==null,'Tree renders once snapshot state is set');
  assert.equal(reads,1,'Subsequent render does not re-query database');

  // 3. Fast category change cancels the in-flight scheduled snapshot
  slot=0;stateSlot=0;effectSlot=0;
  BudgetLiveIndicator({categoryId:'transport',amountMinorUnits:5000});
  assert.equal(cancelledCalls.length,1,'Switching category must cancel stale scheduled query');
});

test('BUD-F12: BudgetCard forwards parameterized callbacks to stable parent handlers', () => {
  const theme={colors:{danger:'red',primary:'blue'},spacing:{},borderRadius:{}};
  let pressedStatus=null;
  let toggledBudgetId=null;
  let toggledValue=null;
  let viewedTransactionsStatus=null;

  const {BudgetCard}=load('../components/budget-card.tsx', {
    react:{memo:c=>c,useCallback:cb=>cb},
    'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    'react-native':{StyleSheet:{create:s=>s},Text:'Text',View:'View',Pressable:'Pressable'},
    'lucide-react-native':{AlertCircle:'AlertCircle',AlertTriangle:'AlertTriangle',ArrowRight:'ArrowRight',RotateCw:'RotateCw'},
    '@/components':{IconHelper:'IconHelper',ThemedSwitch:'ThemedSwitch'},
    '@/hooks/use-app-theme':{useAppTheme:()=>theme,useThemeStyles:create=>create(theme)},
    '@/modules/currencies':{useCurrencyPreferences:()=>({preferences:{}})},
    '@/modules/hex-colors':{useResolveEntityColor:()=>()=>null},
    '@/utils/currency':currency,
  });

  const testStatus={
    budget:{id:'b-1',isEnabled:true,currencyCode:'PHP',frequency:'monthly'},
    category:{name:'Groceries',icon:'cart'},
    periodLabel:'November 2026',
    effectiveTargetCents:50000,
    spentCents:25000,
    remainingCents:25000,
    percentage:50,
    isExceeded:false,
    isNearLimit:false,
    rolloverCents:0,
  };

  const tree=BudgetCard({
    status:testStatus,
    onPress:(s)=>{pressedStatus=s;},
    onToggle:(id,val)=>{toggledBudgetId=id;toggledValue=val;},
    onViewTransactions:(s)=>{viewedTransactionsStatus=s;},
  });

  // Verify press handler dispatches status
  assert.ok(tree.props.onPress,'Card pressable has onPress');
  tree.props.onPress();
  assert.equal(pressedStatus,testStatus,'onPress receives status');

  // Verify switch onValueChange dispatches budgetId and value
  const switchElement=find(tree,node=>node.type==='ThemedSwitch');
  assert.ok(switchElement,'Switch element found');
  switchElement.props.onValueChange(false);
  assert.equal(toggledBudgetId,'b-1');
  assert.equal(toggledValue,false);

  // Verify view transactions link dispatches status
  const viewLink=find(tree,node=>node.type==='Pressable' && node.props.accessibilityRole==='button' && node!==tree);
  assert.ok(viewLink,'View transactions pressable found');
  viewLink.props.onPress();
  assert.equal(viewedTransactionsStatus,testStatus,'onViewTransactions receives status');
});
