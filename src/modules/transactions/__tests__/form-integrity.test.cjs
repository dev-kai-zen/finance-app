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
  let handler;
  function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleSave') handler = node.initializer.getText(ast); ts.forEachChild(node, visit); }
  visit(ast); assert.ok(handler);
  let finish, calls = 0, closed = 0;
  const context = {
    exports: {}, submittingRef: { current: false }, amountMinorUnits: 100,
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
  vm.runInNewContext(ts.transpileModule('const handleSave = ' + handler + '; exports.save = handleSave;', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  return { context, save: context.exports.save, finish: value => finish(value), get calls() { return calls; }, get closed() { return closed; } };
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
