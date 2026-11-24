const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

function saveHarness() {
  const file = path.resolve(__dirname, '../components/transaction-form-modal.tsx');
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler, proceed, cancel, requestClose, cancelCheck;
  function visit(node) {
    if (ts.isVariableDeclaration(node)) {
      const name = node.name.getText(ast);
      if (name === 'handleSave') handler = node.initializer.getText(ast);
      if (name === 'handleProceedOverBudget') proceed = node.initializer.getText(ast);
      if (name === 'handleCancelOverBudget') cancel = node.initializer.getText(ast);
      if (name === 'handleRequestClose') requestClose = node.initializer.getText(ast);
      if (name === 'cancelBudgetCheck') cancelCheck = node.initializer.getText(ast);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(handler);
  let finish, calls = 0, closed = 0;
  const budgetChecks = new Set();
  const context = {
    exports: {}, submittingRef: { current: false }, amountMinorUnits: 100,
    useCallback: callback => callback, Keyboard: { dismiss() {} }, pending: false, checkingBudgets: false, isDirty: false,
    cancelBudgetCheckRef: { current: null }, budgetCheckRequestRef: { current: 0 }, setCheckingBudgets() {},
    runDeferredSyncQuery(options, query) {
      options.setLoading(true);
      const run = () => { query(); options.setLoading(false); };
      budgetChecks.add(run);
      return () => budgetChecks.delete(run);
    },
    selectedAccountId: 'source', selectedPocketId: null, transferToAccountId: 'destination', transferToPocketId: null,
    isEditing: false, saveAsQuickPreset: false, appliedPresetId: null,
    name: '', note: '', occurredAt: new Date(), mode: 'transfer', feeEnabled: false, isTransferCrossCurrency: false,
    selectedLabelIds: [], labels: [], attachmentDraft: { changes: {} },
    setLocalError() {}, triggerHaptic() {}, playTransactionSavedSound: async () => {}, onClose() { closed++; },
    onSaveTransfer() { calls++; return new Promise(resolve => { finish = resolve; }); },
    splitEnabled: false, canUseSplit: false, selectedCategoryId: 'category', amountSign: '-',
    canConfigureInstallments: false, selectedAccount: { creditCardDetails: {} }, postedExpenseMinorUnitsAbs: 100,
    checkCreditLimitExceeded: () => ({ hasCreditCard: true, exceeds: true }),
    setPendingCreditLimitWarning() {}, setIsCreditLimitWarningOpen() {},
    accountCurrencyCode: 'PHP', entryCurrency: 'PHP', isCrossCurrencyEntry: false, installmentFieldsLocked: false,
    onSaveTransaction() { calls++; return new Promise(resolve => { finish = resolve; }); },
  };
  vm.runInNewContext(ts.transpileModule('const cancelBudgetCheck = ' + cancelCheck + '; const handleSave = ' + handler + '; exports.save = handleSave; exports.proceed = ' + proceed + '; exports.cancel = ' + cancel + '; exports.requestClose = ' + requestClose + '; exports.unmount = cancelBudgetCheck;', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  return { context, flushBudgetChecks: () => { const jobs=[...budgetChecks]; budgetChecks.clear(); jobs.forEach(run=>run()); }, save: context.exports.save, requestClose: context.exports.requestClose, unmount: context.exports.unmount, proceed: context.exports.proceed, cancel: context.exports.cancel, finish: value => finish(value), get calls() { return calls; }, get closed() { return closed; } };
}

test('P2-11b: same-frame transfer and transaction saves are mutually exclusive and release on completion', async () => {
  for (const mode of ['transfer', 'expense']) {
    const h = saveHarness(); h.context.mode = mode;
    const bypass = { bypassCreditLimit: true, bypassMaintainingBalance: true, bypassBudget: true };
    const first = h.save(bypass); await h.save(bypass);
    assert.equal(h.calls, 1); h.finish(true); await first;
    assert.equal(h.closed, 1); assert.equal(h.context.submittingRef.current, false);
    const retry = h.save(bypass); assert.equal(h.calls, 2); h.finish(false); await retry;
    assert.equal(h.context.submittingRef.current, false);
  }
});

test('P2-11b: validation, warning, and rejected saves release the synchronous guard', async () => {
  const h = saveHarness();
  h.context.amountMinorUnits = 0; await h.save(); assert.equal(h.calls, 0);
  assert.equal(h.context.submittingRef.current, false);
  h.context.amountMinorUnits = 100; h.context.mode = 'expense'; await h.save();
  assert.equal(h.calls, 0); assert.equal(h.context.submittingRef.current, false);
  h.context.mode = 'transfer'; h.context.onSaveTransfer = async () => { throw new Error('failed'); };
  await assert.rejects(h.save(), /failed/); assert.equal(h.context.submittingRef.current, false);
});

test('P2-11c: daily and biweekly boundaries use calendar days across US/EU DST and negative anchor offsets', () => {
  const file = path.resolve(__dirname, '../../budgets/utils/budget-period.ts');
  const script = `
    const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
    require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,f);
    const {getBudgetPeriodInfo:get}=require(process.env.BUDGET_PERIOD_FILE);
    const ordinal=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000;
    const anchor=new Date(2025,0,1);
    for(let day=-40;day<400;day++) {
      const d=new Date(2025,0,1+day,0,15);
      const daily=get('daily',d);
      assert.equal(ordinal(daily.previousStartDate),ordinal(d)-1);
      assert.equal(daily.previousEndDate.getTime()+1,daily.startDate.getTime());
      const period=get('biweekly',d,anchor);
      assert.ok(period.startDate<=d && period.endDate>=d);
      assert.equal(ordinal(period.startDate),ordinal(anchor)+Math.floor((ordinal(d)-ordinal(anchor))/14)*14);
      assert.equal(ordinal(period.endDate)-ordinal(period.startDate),13);
      assert.equal(period.previousEndDate.getTime()+1,period.startDate.getTime());
      assert.equal(period.startDate.getHours(),0); assert.equal(period.endDate.getHours(),23);
    }
  `;
  for (const zone of ['America/New_York', 'Europe/Berlin', 'Asia/Singapore']) {
    execFileSync(process.execPath, ['-e', script], { env: { ...process.env, TZ: zone, BUDGET_PERIOD_FILE: file }, stdio: 'pipe' });
  }
});


test('BUD-F03: shared-budget split warns before saving; Cancel writes nothing and Proceed submits the full split once', async () => {
  const h=saveHarness();
  let warnings=[],visible=false,groupedChecks=0;
  const result={budgetId:'food',hasBudget:true,isEnabled:true,categoryName:'Food',budgetCurrencyCode:'PHP',frequency:'monthly',periodLabel:'November 2026',
    effectiveBudgetCents:500000,currentSpentCents:450000,additionalExpenseCents:60000,newSpentCents:510000,
    remainingBeforeCents:50000,remainingAfterCents:-10000,exceeds:true,exceededByCents:10000,notifyOnExceeded:true};
  Object.assign(h.context,{
    mode:'expense',selectedAccount:{},amountMinorUnits:60000,postedExpenseMinorUnitsAbs:60000,splitTotalMinorUnits:60000,
    splitEnabled:true,canUseSplit:true,splitLines:[{categoryId:'dining',amountMinorUnits:30000},{categoryId:'groceries',amountMinorUnits:30000}],
    checkBudgetExceeded:input=>({...result,newSpentCents:450000+input.amountMinorUnits,exceeds:false}),
    checkExpenseBudgets:input=>{groupedChecks++;assert.equal(input.lines.length,2);return [result];},
    setPendingBudgetWarning:value=>{warnings=[value];},setPendingBudgetWarnings:value=>{warnings=value;},
    setIsBudgetWarningOpen:value=>{visible=value;},
  });
  const first=h.save();
  if(h.calls)h.finish(false); // Let the pre-fix path finish, then assert it incorrectly wrote.
  assert.equal(groupedChecks,0,"Budget reads wait until after paint");
  h.flushBudgetChecks();
  await first;
  assert.equal(h.calls,0,'No persistence callback before budget confirmation');
  assert.equal(groupedChecks,1);assert.equal(visible,true);
  assert.equal(warnings.length,1);assert.equal(warnings[0].additionalExpenseCents,60000);
  h.cancel();assert.equal(visible,false);assert.equal(h.calls,0);
  const retry=h.save();h.flushBudgetChecks();await retry;assert.equal(visible,true);
  const proceed=h.proceed();const duplicate=h.proceed();
  assert.equal(h.calls,1);h.finish(true);await Promise.all([proceed,duplicate]);
  assert.equal(h.closed,1);assert.equal(h.context.submittingRef.current,false);
});


test('BUD-F03: all enabled exceeded budgets reach confirmation, including the edit exclusion', async () => {
  const h=saveHarness();let warnings=[];
  Object.assign(h.context,{
    mode:'expense',selectedAccount:{},amountMinorUnits:60000,postedExpenseMinorUnitsAbs:60000,splitTotalMinorUnits:60000,
    splitEnabled:true,canUseSplit:true,splitLines:[{categoryId:'a',amountMinorUnits:30000},{categoryId:'b',amountMinorUnits:30000}],
    isEditing:true,initialTransaction:{id:'old_split',type:'expense'},
    checkExpenseBudgets:input=>{
      assert.equal(input.excludeTransactionId,'old_split');assert.equal(input.expenseCurrencyCode,'PHP');
      return [{budgetId:'one',exceeds:true,notifyOnExceeded:true},{budgetId:'two',exceeds:true,notifyOnExceeded:true},
        {budgetId:'opted_out',exceeds:true,notifyOnExceeded:false},{budgetId:'within_limit',exceeds:false,notifyOnExceeded:true}];
    },
    setPendingBudgetWarnings:value=>{warnings=value;},setIsBudgetWarningOpen() {},
  });
  const saving=h.save();h.flushBudgetChecks();await saving;
  assert.deepEqual(Array.from(warnings,row=>row.budgetId),['one','two']);assert.equal(h.calls,0);
});

test('BUD-F03: close/unmount cancels deferred reads and prevents stale warnings or writes', async () => {
  for(const action of ['close','unmount']) {
    const h=saveHarness();let reads=0,prompt=false,loading=false;
    Object.assign(h.context,{
      mode:'expense',selectedAccount:{},checkingBudgets:false,isDirty:true,
      checkExpenseBudgets:()=>{reads++;return [];},setCheckingBudgets:value=>{loading=value;},setShowUnsavedPrompt:value=>{prompt=value;},
    });
    const saving=h.save();assert.equal(loading,true);assert.equal(reads,0);
    if(action==='close')h.requestClose();else h.unmount();
    await saving;h.flushBudgetChecks();
    assert.equal(reads,0);assert.equal(h.calls,0);assert.equal(h.context.submittingRef.current,false);
    if(action==='close'){assert.equal(prompt,true);assert.equal(loading,false);}
  }
});

test('BUD-F03: a failed budget read reports an error and a retry can save; refunds skip expense checks', async () => {
  const h=saveHarness();let error,loading;
  Object.assign(h.context,{
    mode:'expense',selectedAccount:{},t:key=>key,setLocalError:value=>{error=value;},setCheckingBudgets:value=>{loading=value;},
    checkExpenseBudgets:()=>{throw Error('database read failure');},
  });
  const failed=h.save();h.flushBudgetChecks();await failed;
  assert.equal(error,'transactions.budgetWarningCheckFailed');assert.equal(loading,false);assert.equal(h.calls,0);
  h.context.checkExpenseBudgets=()=>[];
  const retry=h.save();h.flushBudgetChecks();await Promise.resolve();
  assert.equal(h.calls,1);h.finish(true);await retry;assert.equal(error,null);
  const refund=saveHarness();Object.assign(refund.context,{mode:'expense',selectedAccount:{},amountSign:'+',checkExpenseBudgets:()=>{throw Error('Refunds must not be checked as extra expense');}});
  const saved=refund.save();assert.equal(refund.calls,1);refund.finish(true);await saved;
});
