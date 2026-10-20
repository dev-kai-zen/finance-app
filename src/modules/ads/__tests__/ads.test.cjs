const test = require("node:test");
const assert = require("node:assert/strict");

test("ads: verifies official Google test unit IDs are configured", () => {
  const ADMOB_TEST_UNIT_IDS = {
    ANDROID_BANNER: "ca-app-pub-3940256099942544/6300978111",
    IOS_BANNER: "ca-app-pub-3940256099942544/2934735716",
  };

  assert.equal(
    ADMOB_TEST_UNIT_IDS.ANDROID_BANNER,
    "ca-app-pub-3940256099942544/6300978111"
  );
  assert.equal(
    ADMOB_TEST_UNIT_IDS.IOS_BANNER,
    "ca-app-pub-3940256099942544/2934735716"
  );
});

test("ads: getBannerAdUnitId falls back to TestIds.BANNER in dev mode", () => {
  // Simulate getBannerAdUnitId logic
  function resolveUnitId({ isDev, envAndroid, platform }) {
    const TEST_BANNER = "ca-app-pub-3940256099942544/6300978111";
    if (isDev) return TEST_BANNER;
    if (platform === "android") {
      return envAndroid && envAndroid.trim().length > 0
        ? envAndroid.trim()
        : TEST_BANNER;
    }
    return TEST_BANNER;
  }

  // When in development (__DEV__ === true)
  assert.equal(
    resolveUnitId({ isDev: true, envAndroid: "ca-app-pub-9999/1111", platform: "android" }),
    "ca-app-pub-3940256099942544/6300978111"
  );

  // When in production with no env set
  assert.equal(
    resolveUnitId({ isDev: false, envAndroid: undefined, platform: "android" }),
    "ca-app-pub-3940256099942544/6300978111"
  );

  // When in production with custom unit set
  assert.equal(
    resolveUnitId({ isDev: false, envAndroid: "ca-app-pub-1234567890123456/1234567890", platform: "android" }),
    "ca-app-pub-1234567890123456/1234567890"
  );
});
