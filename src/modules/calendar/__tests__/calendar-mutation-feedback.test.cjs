const test = require("node:test");
const assert = require("node:assert/strict");

// Harness to test CAL-F04 mutation feedback logic and state coordination
function createCalendarMutationHarness({
  postOccurrenceReturns = true,
  postOccurrenceErrorMessage = "Account maintains insufficient balance for posting",
  skipOccurrenceReturns = true,
  skipOccurrenceErrorMessage = "Cannot skip an already processed occurrence",
  deleteTxReturns = true,
  deleteTxErrorMessage = "Transaction is locked and cannot be deleted",
} = {}) {
  // State variables replicating calendar-screen and useCalendarData
  let pendingPostScheduleId = null;
  let pendingSkipScheduleId = null;
  let pendingDeleteTxId = null;
  let inspectedTransaction = null;
  let formModalOpen = false;

  let refreshAllCalledCount = 0;

  // Schedule mutation state (from useScheduledTransactions via useCalendarData)
  let schedulesPendingAction = false;
  let schedulesError = null;

  // Transaction mutation state (from useTransactions)
  let txPendingAction = false;
  let txError = null;

  // Fatal calendar error computation
  function getFatalCalendarError(calendarError) {
    const isScheduleActionPending = Boolean(
      pendingPostScheduleId || pendingSkipScheduleId,
    );
    return isScheduleActionPending ? null : calendarError;
  }

  // Hook functions
  function postOccurrence(id) {
    schedulesPendingAction = true;
    schedulesError = null;
    if (postOccurrenceReturns) {
      schedulesPendingAction = false;
      return true;
    } else {
      schedulesPendingAction = false;
      schedulesError = postOccurrenceErrorMessage;
      return false;
    }
  }

  function skipOccurrence(id) {
    schedulesPendingAction = true;
    schedulesError = null;
    if (skipOccurrenceReturns) {
      schedulesPendingAction = false;
      return true;
    } else {
      schedulesPendingAction = false;
      schedulesError = skipOccurrenceErrorMessage;
      return false;
    }
  }

  function deleteTx(id) {
    txPendingAction = true;
    txError = null;
    if (deleteTxReturns) {
      txPendingAction = false;
      return true;
    } else {
      txPendingAction = false;
      txError = deleteTxErrorMessage;
      return false;
    }
  }

  function clearSchedulesError() {
    schedulesError = null;
  }

  function clearTxError() {
    txError = null;
  }

  function refreshAll() {
    refreshAllCalledCount += 1;
  }

  // Screen handlers
  function handleConfirmPostSchedule() {
    if (!pendingPostScheduleId) return;
    const ok = postOccurrence(pendingPostScheduleId);
    if (ok) {
      pendingPostScheduleId = null;
      refreshAll();
    }
  }

  function handleCancelPostSchedule() {
    pendingPostScheduleId = null;
    clearSchedulesError();
  }

  function handleConfirmSkipSchedule() {
    if (!pendingSkipScheduleId) return;
    const ok = skipOccurrence(pendingSkipScheduleId);
    if (ok) {
      pendingSkipScheduleId = null;
      refreshAll();
    }
  }

  function handleCancelSkipSchedule() {
    pendingSkipScheduleId = null;
    clearSchedulesError();
  }

  function handleConfirmDeleteTx() {
    if (!pendingDeleteTxId) return;
    const success = deleteTx(pendingDeleteTxId);
    if (success) {
      inspectedTransaction = null;
      pendingDeleteTxId = null;
      refreshAll();
    }
  }

  function handleCancelDeleteTx() {
    pendingDeleteTxId = null;
    clearTxError();
  }

  return {
    get pendingPostScheduleId() { return pendingPostScheduleId; },
    set pendingPostScheduleId(val) { pendingPostScheduleId = val; },
    get pendingSkipScheduleId() { return pendingSkipScheduleId; },
    set pendingSkipScheduleId(val) { pendingSkipScheduleId = val; },
    get pendingDeleteTxId() { return pendingDeleteTxId; },
    set pendingDeleteTxId(val) { pendingDeleteTxId = val; },
    get inspectedTransaction() { return inspectedTransaction; },
    set inspectedTransaction(val) { inspectedTransaction = val; },
    get formModalOpen() { return formModalOpen; },
    set formModalOpen(val) { formModalOpen = val; },
    get schedulesPendingAction() { return schedulesPendingAction; },
    get schedulesError() { return schedulesError; },
    get txPendingAction() { return txPendingAction; },
    get txError() { return txError; },
    get refreshAllCalledCount() { return refreshAllCalledCount; },
    getFatalCalendarError,
    handleConfirmPostSchedule,
    handleCancelPostSchedule,
    handleConfirmSkipSchedule,
    handleCancelSkipSchedule,
    handleConfirmDeleteTx,
    handleCancelDeleteTx,
    clearTxError,
    clearSchedulesError,
  };
}

test("CAL-F04: Failed post schedule retains modal, exposes error, and prevents screen-level error page", () => {
  const harness = createCalendarMutationHarness({ postOccurrenceReturns: false });

  // User opens confirmation dialog to post occurrence
  harness.pendingPostScheduleId = "occ-123";
  assert.equal(harness.pendingPostScheduleId, "occ-123");

  // Confirm posting
  harness.handleConfirmPostSchedule();

  // MUST keep modal open (ID retained) and expose error
  assert.equal(harness.pendingPostScheduleId, "occ-123", "Modal must NOT close on failure");
  assert.equal(
    harness.schedulesError,
    "Account maintains insufficient balance for posting",
  );
  assert.equal(harness.refreshAllCalledCount, 0, "refreshAll must not trigger on failure");

  // Modal error binding: ConfirmModal error prop receives schedulesError
  const modalErrorProp = harness.pendingPostScheduleId ? harness.schedulesError : null;
  assert.equal(modalErrorProp, "Account maintains insufficient balance for posting");

  // Screen background error guard: must NOT crash background into PageErrorState
  const fatalError = harness.getFatalCalendarError(harness.schedulesError);
  assert.equal(fatalError, null, "Modal mutation error must not turn entire page into PageErrorState");

  // User cancels/dismisses dialog
  harness.handleCancelPostSchedule();
  assert.equal(harness.pendingPostScheduleId, null);
  assert.equal(harness.schedulesError, null);
});

test("CAL-F04: Successful post schedule closes modal and triggers refresh", () => {
  const harness = createCalendarMutationHarness({ postOccurrenceReturns: true });

  harness.pendingPostScheduleId = "occ-123";
  harness.handleConfirmPostSchedule();

  assert.equal(harness.pendingPostScheduleId, null, "Modal must close on success");
  assert.equal(harness.schedulesError, null);
  assert.equal(harness.refreshAllCalledCount, 1, "refreshAll must be called once on success");
});

test("CAL-F04: Failed skip schedule retains modal, exposes error, and cancellation clears state", () => {
  const harness = createCalendarMutationHarness({ skipOccurrenceReturns: false });

  harness.pendingSkipScheduleId = "occ-456";
  harness.handleConfirmSkipSchedule();

  assert.equal(harness.pendingSkipScheduleId, "occ-456", "Modal must stay open on failure");
  assert.equal(
    harness.schedulesError,
    "Cannot skip an already processed occurrence",
  );
  assert.equal(harness.refreshAllCalledCount, 0);

  // Cancellation clears pending ID and error
  harness.handleCancelSkipSchedule();
  assert.equal(harness.pendingSkipScheduleId, null);
  assert.equal(harness.schedulesError, null);
});

test("CAL-F04: Successful skip schedule closes modal and triggers refresh", () => {
  const harness = createCalendarMutationHarness({ skipOccurrenceReturns: true });

  harness.pendingSkipScheduleId = "occ-456";
  harness.handleConfirmSkipSchedule();

  assert.equal(harness.pendingSkipScheduleId, null);
  assert.equal(harness.schedulesError, null);
  assert.equal(harness.refreshAllCalledCount, 1);
});

test("CAL-F04: Failed delete transaction retains confirmation modal and surfaces txError", () => {
  const harness = createCalendarMutationHarness({ deleteTxReturns: false });

  harness.inspectedTransaction = { id: "tx-789", description: "Locked Tx" };
  harness.pendingDeleteTxId = "tx-789";

  harness.handleConfirmDeleteTx();

  // Failed delete preserves pending ID so ConfirmModal stays visible with error
  assert.equal(harness.pendingDeleteTxId, "tx-789");
  assert.equal(harness.txError, "Transaction is locked and cannot be deleted");
  assert.equal(harness.refreshAllCalledCount, 0);

  const modalErrorProp = harness.pendingDeleteTxId ? harness.txError : null;
  assert.equal(modalErrorProp, "Transaction is locked and cannot be deleted");

  // User cancels: clears ID and txError
  harness.handleCancelDeleteTx();
  assert.equal(harness.pendingDeleteTxId, null);
  assert.equal(harness.txError, null);
});

test("CAL-F04: Successful delete transaction clears pending ID, inspected transaction, and refreshes", () => {
  const harness = createCalendarMutationHarness({ deleteTxReturns: true });

  harness.inspectedTransaction = { id: "tx-789", description: "To Delete" };
  harness.pendingDeleteTxId = "tx-789";

  harness.handleConfirmDeleteTx();

  assert.equal(harness.pendingDeleteTxId, null);
  assert.equal(harness.inspectedTransaction, null);
  assert.equal(harness.txError, null);
  assert.equal(harness.refreshAllCalledCount, 1);
});
