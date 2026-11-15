const { test } = require("node:test");
const assert = require("node:assert/strict");

/**
 * Pure dirty check calculation matching SortableListModal
 */
function computeIsDirty({
  visible,
  items,
  initialOrder,
  externalIsDirty,
}) {
  if (externalIsDirty !== undefined) return externalIsDirty;
  if (!visible || initialOrder.length === 0) return false;
  if (items.length !== initialOrder.length) return false;
  return items.some((item, index) => item.id !== initialOrder[index]);
}

test("sortable-list-dirty: returns false when modal is not visible", () => {
  const isDirty = computeIsDirty({
    visible: false,
    items: [{ id: "2" }, { id: "1" }],
    initialOrder: ["1", "2"],
  });
  assert.equal(isDirty, false);
});

test("sortable-list-dirty: returns false when items match initial order", () => {
  const isDirty = computeIsDirty({
    visible: true,
    items: [{ id: "c1" }, { id: "c2" }, { id: "c3" }],
    initialOrder: ["c1", "c2", "c3"],
  });
  assert.equal(isDirty, false);
});

test("sortable-list-dirty: returns true when any item position changed", () => {
  const isDirty = computeIsDirty({
    visible: true,
    items: [{ id: "c2" }, { id: "c1" }, { id: "c3" }],
    initialOrder: ["c1", "c2", "c3"],
  });
  assert.equal(isDirty, true);
});

test("sortable-list-dirty: returns false when reordered back to initial order", () => {
  const initial = ["c1", "c2", "c3"];
  // Reorder
  let items = [{ id: "c3" }, { id: "c1" }, { id: "c2" }];
  assert.equal(
    computeIsDirty({ visible: true, items, initialOrder: initial }),
    true,
  );

  // Restore original order
  items = [{ id: "c1" }, { id: "c2" }, { id: "c3" }];
  assert.equal(
    computeIsDirty({ visible: true, items, initialOrder: initial }),
    false,
  );
});

test("sortable-list-dirty: respects externalIsDirty override if provided", () => {
  const isDirtyFalse = computeIsDirty({
    visible: true,
    items: [{ id: "c2" }, { id: "c1" }],
    initialOrder: ["c1", "c2"],
    externalIsDirty: false,
  });
  assert.equal(isDirtyFalse, false);

  const isDirtyTrue = computeIsDirty({
    visible: true,
    items: [{ id: "c1" }, { id: "c2" }],
    initialOrder: ["c1", "c2"],
    externalIsDirty: true,
  });
  assert.equal(isDirtyTrue, true);
});

