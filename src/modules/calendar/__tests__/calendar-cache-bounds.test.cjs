const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// Pure representation matching src/modules/calendar/utils/calendar-cache.ts
const MAX_CALENDAR_CACHED_MONTHS = 4;

function getCachedMonthTransactions(cache, key) {
  if (!cache.has(key)) return undefined;
  const data = cache.get(key);
  cache.delete(key);
  cache.set(key, data);
  return data;
}

function setCachedMonthTransactions(
  cache,
  key,
  data,
  maxCapacity = MAX_CALENDAR_CACHED_MONTHS,
) {
  cache.delete(key);
  if (cache.size >= maxCapacity) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, data);
}

describe("CAL-F07: Calendar Month LRU Cache Bounds & Eviction", () => {
  it("stores months up to the maximum capacity without evicting", () => {
    const cache = new Map();

    setCachedMonthTransactions(cache, "2026-01", [{ id: "tx-1" }]);
    setCachedMonthTransactions(cache, "2026-02", [{ id: "tx-2" }]);
    setCachedMonthTransactions(cache, "2026-03", [{ id: "tx-3" }]);
    setCachedMonthTransactions(cache, "2026-04", [{ id: "tx-4" }]);

    assert.equal(cache.size, 4);
    assert.ok(cache.has("2026-01"));
    assert.ok(cache.has("2026-02"));
    assert.ok(cache.has("2026-03"));
    assert.ok(cache.has("2026-04"));
  });

  it("evicts the least recently used month when exceeding capacity", () => {
    const cache = new Map();

    setCachedMonthTransactions(cache, "2026-01", [{ id: "tx-1" }]);
    setCachedMonthTransactions(cache, "2026-02", [{ id: "tx-2" }]);
    setCachedMonthTransactions(cache, "2026-03", [{ id: "tx-3" }]);
    setCachedMonthTransactions(cache, "2026-04", [{ id: "tx-4" }]);

    // Inserting a 5th month must evict 2026-01 (the oldest inserted)
    setCachedMonthTransactions(cache, "2026-05", [{ id: "tx-5" }]);

    assert.equal(cache.size, 4);
    assert.equal(cache.has("2026-01"), false, "2026-01 should be evicted");
    assert.ok(cache.has("2026-02"));
    assert.ok(cache.has("2026-03"));
    assert.ok(cache.has("2026-04"));
    assert.ok(cache.has("2026-05"));
  });

  it("refreshes LRU recency on getCachedMonthTransactions to prevent premature eviction", () => {
    const cache = new Map();

    setCachedMonthTransactions(cache, "2026-01", [{ id: "tx-1" }]);
    setCachedMonthTransactions(cache, "2026-02", [{ id: "tx-2" }]);
    setCachedMonthTransactions(cache, "2026-03", [{ id: "tx-3" }]);
    setCachedMonthTransactions(cache, "2026-04", [{ id: "tx-4" }]);

    // Access 2026-01, promoting it to most recently used
    const retrieved = getCachedMonthTransactions(cache, "2026-01");
    assert.deepEqual(retrieved, [{ id: "tx-1" }]);

    // Inserting a 5th month should now evict 2026-02 instead of 2026-01
    setCachedMonthTransactions(cache, "2026-05", [{ id: "tx-5" }]);

    assert.equal(cache.size, 4);
    assert.ok(cache.has("2026-01"), "2026-01 was refreshed and must remain in cache");
    assert.equal(cache.has("2026-02"), false, "2026-02 should be evicted as least recently used");
    assert.ok(cache.has("2026-03"));
    assert.ok(cache.has("2026-04"));
    assert.ok(cache.has("2026-05"));
  });

  it("re-setting an existing key updates data and moves it to most recent without eviction", () => {
    const cache = new Map();

    setCachedMonthTransactions(cache, "2026-01", [{ id: "tx-1" }]);
    setCachedMonthTransactions(cache, "2026-02", [{ id: "tx-2" }]);
    setCachedMonthTransactions(cache, "2026-03", [{ id: "tx-3" }]);
    setCachedMonthTransactions(cache, "2026-04", [{ id: "tx-4" }]);

    // Update 2026-02 with fresh transactions
    const updated = [{ id: "tx-2-fresh" }];
    setCachedMonthTransactions(cache, "2026-02", updated);

    assert.equal(cache.size, 4);
    assert.deepEqual(cache.get("2026-02"), updated);

    // Now insert 2026-05: 2026-01 is oldest (since 2026-02 was moved to the end)
    setCachedMonthTransactions(cache, "2026-05", [{ id: "tx-5" }]);

    assert.equal(cache.size, 4);
    assert.equal(cache.has("2026-01"), false, "2026-01 should be evicted");
    assert.ok(cache.has("2026-02"), "2026-02 was updated recently and should remain");
    assert.ok(cache.has("2026-03"));
    assert.ok(cache.has("2026-04"));
    assert.ok(cache.has("2026-05"));
  });

  it("clears all cached months cleanly on cache invalidation", () => {
    const cache = new Map();

    setCachedMonthTransactions(cache, "2026-01", [{ id: "tx-1" }]);
    setCachedMonthTransactions(cache, "2026-02", [{ id: "tx-2" }]);

    cache.clear();

    assert.equal(cache.size, 0);
    assert.equal(getCachedMonthTransactions(cache, "2026-01"), undefined);
  });
});
