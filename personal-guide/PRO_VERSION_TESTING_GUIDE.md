# Kaizen Pro Version Testing & Troubleshooting Guide

This guide explains why you encountered the RevenueCat **"Wrong API Key"** dialog, why the debug build hung on the logo, and how to properly test purchasing Lifetime Pro and restoring it after uninstalling the app.

---

## 1. Why Did You Encounter the Issues?

### Issue A: "Wrong API Key" on `npm run android:apk:release`

When building with `npm run android:apk:release`, the app was compiled in **Release mode** (`assembleRelease`, which sets Android Java's `BuildConfig.DEBUG = false`).

In `.env`, you had:
```env
EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=test_OvIsZkGFMQuXFOrDOdgJBNwtxyo
```

* **Why RevenueCat blocked it:**
  Keys starting with `test_` are **RevenueCat Test Store Sandbox keys**. RevenueCat's native Android SDK has an intentional, built-in security safeguard: **test keys are strictly prohibited in release builds**. If a release build detects a `test_` key, RevenueCat displays the native modal:
  > *"Wrong API Key. This app is using a test API key: test_... To prepare for release, update your RevenueCat settings to use a production key... The app will close now to protect the security of test purchases."*
  
  And then it terminates the app process. This prevents developers from accidentally distributing an APK to real users with mock purchases.

### Issue B: Debug APK Stuck at the Logo

When you ran `gradlew.bat assembleDebug` (standard debug build), React Native's Gradle plugin **skips embedding the JavaScript bundle**. 
* React Native expects standard debug APKs to connect over Wi-Fi / USB to a running Metro dev server (`http://localhost:8081`).
* Because you installed the APK on the phone without Metro running on your PC, the app was stuck waiting indefinitely for the bundle on the splash screen.

**The Fix:**
We configured `android/app/build.gradle` and added a new script in `package.json`:
```bash
npm run android:apk:debug:standalone
```
This forces Gradle to run `createBundleDebugJsAndAssets` (`bundleInDebug=true`), packaging the entire JavaScript code and assets directly inside `app-debug.apk`. It will **never** get stuck on the logo and runs 100% offline without Metro.

---

## 2. Will Other Features Be Affected in a Debug APK?

**No. All features will work identically.**

| Component | Behavior in Standalone Debug APK vs Release APK |
| :--- | :--- |
| **SQLite & Drizzle ORM** | **Identical**. Local database runs exactly the same. |
| **Migrations** | **Identical**. Database migrations execute on startup. |
| **Reports & Charts** | **Identical**. Cash flow, Net Worth, Expense breakdown calculations. |
| **Security & Passcode** | **Identical**. Hardware biometric & PIN auth work. |
| **Translations** | **Identical**. English, Filipino, Spanish. |
| **Google Drive Backup** | **Identical**. (If OAuth client ID is configured for your SHA-1). |
| **UI & Performance** | **Virtually Identical**. Release has Hermes byte-code minification and is slightly smaller (~5-10MB difference); debug has development logging enabled. |

---

## 3. How to Test: Choose Your Testing Path

Depending on whether you want to test right now **locally** or through the **Google Play Store**, choose Method A or Method B:

---

### Method A: Fast Local Testing (RevenueCat Test Store)
> **Best for:** Immediate testing without creating products or credentials in Google Play Console.

1. **Keep your test key in `.env`:**
   ```env
   EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=test_OvIsZkGFMQuXFOrDOdgJBNwtxyo
   ```

2. **Build the Standalone Debug APK:**
   ```bash
   npm run android:apk:debug:standalone
   ```
   *Output APK:* `android/app/build/outputs/apk/debug/app-debug.apk`

3. **Install and Test:**
   * Install `app-debug.apk` on your Android phone or emulator.
   * Open the app (it loads immediately without Metro).
   * Open the Sidebar -> Tap **Upgrade to Lifetime Pro** (or open **Reports**).
   * The Pro Paywall modal opens. Tap **Get Lifetime Pro Access**.
   * RevenueCat will complete the test purchase.
   * All reports unlock, and the Pro badge displays "Pro Active".

#### Important note on "Uninstall & Restore" with Test Store (`test_` key):
* **Why does local data reset on uninstall?** Android completely wipes the app's internal storage (`expo-secure-store`, SQLite, SharedPreferences) when an app is uninstalled.
* **Test Store limitation:** Because RevenueCat Test Store is an internal mock sandbox that **does not communicate with Google Play Billing**, Google Play has no receipt of this test purchase. By default, RevenueCat uses an *anonymous user ID*. When you uninstall, that anonymous ID is deleted; when you reinstall, RevenueCat generates a brand-new anonymous ID.
* To test the restore flow with a test key:
  * In the RevenueCat Dashboard -> Project Settings -> General -> Set **Restore Behavior** to **"Transfer to new App User ID"**.
  * Or use the built-in **Developer Settings**:
    * Go to **Settings** -> Scroll down to **Developer Options**.
    * Toggle **"Simulate Pro Version"** on/off to test UI locking.
    * Tap **"Reset Pro Status (Dev)"** to clear your local purchase and re-test the purchase button.

---

### Method B: True Production Testing (Google Play License Testing)
> **Best for:** Testing the exact end-to-end production flow with Google Play: purchasing for free ($0.00), uninstalling the app, reinstalling, and testing restore.

With Google Play License Testing, **you can test with `npm run android:apk:release` without paying real money**.

#### Step 1: Get your Production Key from RevenueCat
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/).
2. Select your Project -> **Project Settings** -> **API Keys**.
3. Copy the **Public Google API Key** (starts with `goog_...`).
4. Update your `.env` file:
   ```env
   EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=goog_your_production_key_here
   ```

#### Step 2: Configure In-App Product on Google Play Console
1. In [Google Play Console](https://play.google.com/console), open your app.
2. Go to **Monetize** -> **Products** -> **In-app products**.
3. Create a product with:
   * **Product ID:** `lifetime` (matching `PRO_CONSTANTS.LIFETIME_PRODUCT_ID`).
   * **Name:** Lifetime Pro Access
   * Set price (e.g. $9.99) and activate it.
4. In RevenueCat Dashboard -> **Products** -> Link Google Play product `lifetime` to your Offering and Entitlement `kaizen_finance_pro`.

#### Step 3: Enable License Testing on Google Play Console
1. In Google Play Console -> **Setup** -> **License Testing**.
2. Add your Google email address (the Google account logged into your physical Android device).
3. Set **License response** to `RESPOND_NORMALLY`.

#### Step 4: Build Release APK and Test
1. Build the release APK:
   ```bash
   npm run android:apk:release
   ```
   *Output APK:* `android/app/build/outputs/apk/release/app-release.apk`

2. Install `app-release.apk` on your phone:
   * Open the app. Notice there is **NO "Wrong API Key" error** because you are using a `goog_` key.
   * Open Sidebar -> Tap **Upgrade to Lifetime Pro**.
   * When Google Play's payment dialog appears, it will say:
     > **"Test card, always approves"** with price **$0.00**.
   * Confirm the purchase. Your Pro status is unlocked!

#### Step 5: Test Uninstall and Restore!
1. **Uninstall the app** from your phone. (All local data is wiped).
2. **Re-install `app-release.apk`**.
3. Launch the app. (Initial state starts on the Free tier).
4. Go to **Settings** -> **Kaizen Pro** -> Tap **Restore Purchases** (or open the Paywall and tap "Restore Purchases").
5. **Result:** RevenueCat queries Google Play Billing for the active Google account on your device. Google Play confirms that your Google account owns `lifetime`. Pro status is instantly restored, and you will see:
   > *"Purchases Restored: Your Kaizen Pro lifetime access has been restored successfully."*

---

## 4. Built-In Protection Added to Codebase

To ensure your app never crashes in release mode even if you accidentally leave a `test_` key in `.env`:
1. `src/modules/pro/services/pro-billing.service.ts` now safely intercepts `test_` keys in release builds. Instead of allowing RevenueCat's native SDK to crash with the dialog, it logs a warning and falls back cleanly to local sandbox mode.
2. `package.json` now includes `android:apk:debug:standalone` which embeds all JavaScript into the debug APK.
3. `android/app/build.gradle` supports the `-PbundleInDebug=true` flag.

---

## 5. Quick Command Summary

| Goal | Command | RevenueCat Key | Cost |
| :--- | :--- | :--- | :--- |
| **Fast offline testing (no Google Console)** | `npm run android:apk:debug:standalone` | `test_...` | Free (Test Store) |
| **Real Google Play test with uninstall/restore** | `npm run android:apk:release` | `goog_...` + License Tester | Free ($0.00 Test Card) |
| **Developer toggle testing (Free vs Pro)** | In app: Settings -> Developer Options -> "Simulate Pro Version" | Any | Instant |
| **Reset purchase back to Free** | In app: Settings -> Developer Options -> "Reset Pro Status (Dev)" | Any | Instant |
