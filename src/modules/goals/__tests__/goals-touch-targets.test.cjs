const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function parseSource(relPath) {
  const fullPath = path.resolve(__dirname, relPath);
  const source = fs.readFileSync(fullPath, "utf8");
  const sf = ts.createSourceFile(fullPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return { sf, source };
}

test("GOAL-F10: GoalAccountPickerModal guarantees 44x44 touch targets and explicit keyboard dismissal", () => {
  const { sf, source } = parseSource("../components/goal-account-picker-modal.tsx");

  assert.ok(source.includes("Keyboard.dismiss()"), "Must call Keyboard.dismiss()");
  assert.ok(source.includes("handleDismiss"), "Must have handleDismiss callback");
  assert.ok(source.includes("onRequestClose={handleDismiss}"), "onRequestClose must use handleDismiss");
  assert.ok(source.includes("<Pressable onPress={handleDismiss} style={styles.scrim}"), "Scrim must use handleDismiss");

  // Verify closeBtn hitSlop and accessibilityRole
  let foundCloseBtn = false;
  function visit(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const text = node.getText(sf);
      if (text.includes("styles.closeBtn")) {
        foundCloseBtn = true;
        assert.ok(text.includes('accessibilityRole="button"'), "closeBtn must have accessibilityRole='button'");
        assert.ok(text.includes("hitSlop="), "closeBtn must have hitSlop");
        assert.ok(text.includes("top: 8") && text.includes("bottom: 8"), "closeBtn must have >= 8px top/bottom hitSlop for 44px minimum");
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.ok(foundCloseBtn, "closeBtn must be present in AST");
});

test("GOAL-F10: GoalFormModal accountChipRemove has accessibilityRole='button' and 44x44 hitSlop", () => {
  const { sf, source } = parseSource("../components/goal-form-modal.tsx");

  let foundAccountRemove = false;
  let foundPocketRemove = false;

  function visit(node) {
    if (ts.isJsxElement(node)) {
      const text = node.getText(sf);
      if (text.includes("removeAccount(account.id)")) {
        foundAccountRemove = true;
        assert.ok(text.includes('accessibilityRole="button"'), "accountChipRemove must have accessibilityRole='button'");
        assert.ok(text.includes("hitSlop="), "accountChipRemove must have hitSlop");
        assert.ok(text.includes("top: 13") || text.includes("top: 12"), "accountChipRemove must have hitSlop expanding to 44px");
      }
      if (text.includes("removePocket(pocket.id)")) {
        foundPocketRemove = true;
        assert.ok(text.includes('accessibilityRole="button"'), "pocketChipRemove must have accessibilityRole='button'");
        assert.ok(text.includes("hitSlop="), "pocketChipRemove must have hitSlop");
        assert.ok(text.includes("top: 13") || text.includes("top: 12"), "pocketChipRemove must have hitSlop expanding to 44px");
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.ok(foundAccountRemove, "account unlink button found");
  assert.ok(foundPocketRemove, "pocket unlink button found");
});

test("GOAL-F10: FullScreenFormModal handleRequestClose explicitly dismisses software keyboard", () => {
  const { source } = parseSource("../../../components/full-screen-form-modal.tsx");
  assert.ok(source.includes("Keyboard.dismiss()"), "FullScreenFormModal must call Keyboard.dismiss()");
  assert.ok(
    /Keyboard\.dismiss\(\);\s+if\s*\(pending\)/.test(source),
    "handleRequestClose must dismiss keyboard before pending/dirty checks",
  );
});

test("GOAL-F10: GoalCard action buttons and header buttons guarantee 44x44 touch targets and accessibilityRole='button'", () => {
  const { sf, source } = parseSource("../components/goal-card.tsx");

  let foundHeaderEdit = false;
  let foundHeaderDelete = false;
  let foundAddFunds = false;
  let foundCompleteOrReopen = false;

  function visit(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const text = node.getText(sf);
      if (text.startsWith("<Pressable") && text.includes("onPress={onEdit}") && text.includes("styles.iconButton")) {
        foundHeaderEdit = true;
        assert.ok(text.includes('accessibilityRole="button"'), "Header edit must have accessibilityRole='button'");
        assert.ok(text.includes("hitSlop="), "Header edit must have hitSlop");
      }
      if (text.startsWith("<Pressable") && text.includes("onPress={onDelete}") && text.includes("styles.iconButton")) {
        foundHeaderDelete = true;
        assert.ok(text.includes('accessibilityRole="button"'), "Header delete must have accessibilityRole='button'");
        assert.ok(text.includes("hitSlop="), "Header delete must have hitSlop");
      }
      if (text.startsWith("<Pressable") && text.includes("styles.addFundsButton")) {
        foundAddFunds = true;
        assert.ok(text.includes('accessibilityRole="button"'), "addFundsButton must have accessibilityRole='button'");
        assert.ok(text.includes("hitSlop="), "addFundsButton must have hitSlop");
      }
      if (text.startsWith("<Pressable") && (text.includes("styles.completeButton") || text.includes("styles.reopenButton"))) {
        foundCompleteOrReopen = true;
        assert.ok(text.includes('accessibilityRole="button"'), "complete/reopen button must have accessibilityRole='button'");
        assert.ok(text.includes("hitSlop="), "complete/reopen button must have hitSlop");
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.ok(foundHeaderEdit, "Header edit button found");
  assert.ok(foundHeaderDelete, "Header delete button found");
  assert.ok(foundAddFunds, "addFunds button found");
  assert.ok(foundCompleteOrReopen, "complete or reopen button found");
});
