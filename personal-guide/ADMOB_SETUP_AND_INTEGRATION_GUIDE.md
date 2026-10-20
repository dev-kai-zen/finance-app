# Complete Guide: Google AdMob Banner Setup & Integration (Expo SDK 57 / React Native)

A complete, end-to-end blueprint for setting up Google AdMob, creating banner ad units, and integrating them into **Kaizen Finance** (`com.kaizen.finance.app`).

---

## Table of Contents

1. [High-Level Architecture & Pro Removal Flow](#1-high-level-architecture--pro-removal-flow)
2. [Step-by-Step Google AdMob Account Setup](#2-step-by-step-google-admob-account-setup)
   - [Step 2.1: Create & Activate AdMob Account](#step-21-create--activate-admob-account)
   - [Step 2.2: Register Kaizen Finance in AdMob](#step-22-register-kaizen-finance-in-admob)
   - [Step 2.3: Create Banner Ad Units](#step-23-create-banner-ad-units)
3. [Mandatory: Setting Up `app-ads.txt`](#3-mandatory-setting-up-app-adstxt)
4. [Crucial Safety: Test Devices & Avoiding AdMob Bans](#4-crucial-safety-test-devices--avoiding-admob-bans)
5. [Codebase Integration Blueprint](#5-codebase-integration-blueprint)
   - [5.1 Environment Variables (`.env`)](#51-environment-variables-env)
   - [5.2 App Configuration (`app.json` / `app.config.js`)](#52-app-configuration-appjson--appconfigjs)
   - [5.3 Clean Architecture Module (`src/modules/ads/`)](#53-clean-architecture-module-srcmodulesads)
   - [5.4 Automatic Pro Hiding Flow](#54-automatic-pro-hiding-flow)
6. [Placement Recommendations & Policy Rules](#6-placement-recommendations--policy-rules)
7. [Testing & Build Workflow](#7-testing--build-workflow)
8. [Troubleshooting & Gotchas](#8-troubleshooting--gotchas)

---

## 1. High-Level Architecture & Pro Removal Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                       Kaizen Finance                        │
│                                                             │
│   ┌────────────────────────┐    ┌───────────────────────┐   │
│   │   useProStatus() Hook  │    │  AdMob Environment    │   │
│   │   (@/modules/pro)      │    │  (App ID & Unit IDs)  │   │
│   └───────────┬────────────┘    └───────────┬───────────┘   │
│               │                             │               │
│               ▼                             ▼               │
│   ┌─────────────────────────────────────────────────────┐   │
│   │           <AdBanner /> (@/modules/ads)              │   │
│   │                                                     │   │
│   │  • If isPro === true ───> Return null (No Ad Calls) │   │
│   │  • If __DEV__        ───> Use Google Test Unit ID   │   │
│   │  • If Production     ───> Load Live AdMob Banner    │   │
│   │  • If Load Fails     ───> Collapse cleanly (No gap) │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles:
1. **Zero Tracking for Pro Users**: When a user purchases Lifetime Pro (or enables dev simulation mode), `<AdBanner />` unmounts immediately. Zero ad requests are sent to Google, protecting user privacy and saving battery/network.
2. **Env-Driven**: Add credentials into `.env`, and the application automatically switches from test IDs to production IDs.
3. **Fail-Safe Fallbacks**: If the environment variables are not yet populated, the app falls back to Google's official test IDs so local builds never crash.

---

## 2. Step-by-Step Google AdMob Account Setup

### Step 2.1: Create & Activate AdMob Account

1. Go to [https://admob.google.com](https://admob.google.com) and click **Sign Up**.
2. Sign in with your primary Google account (recommended: the same Google account used for your Google Play Console).
3. Fill in your country, time zone, and billing currency.
4. Accept the AdMob terms and conditions.
5. **Important - Complete Payments Profile**:
   - In the left sidebar, navigate to **Payments** > **Set up payments**.
   - Enter your legal name/business entity, address, and tax information.
   - *Note: AdMob accounts undergo verification before serving live ads. Completing your payment information immediately prevents "Ad serving limit" delays.*

---

### Step 2.2: Register Kaizen Finance in AdMob

1. In the left navigation sidebar, click **Apps** > **Add App**.
2. **Platform**: Select **Android**.
3. **Is the app listed on a supported app store?**:
   - If your app is already published on Google Play: Select **Yes**, search for `com.kaizen.finance.app`, and link it.
   - If your app is not yet published: Select **No**. Enter **Kaizen Finance** as the app name. (You can link it to Google Play later once published).
4. Click **Add App**.
5. You will see your **AdMob App ID** displayed on screen:
   ```text
   Format: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
   ```
   > ⚠️ **Save this ID**: This is your `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`. It has a **tilde (`~`)** in the middle.

---

### Step 2.3: Create Banner Ad Units

1. After creating the app, click **Add Ad Unit**.
2. Choose **Banner** (Click *Select*).
3. **Ad unit name**: Enter a descriptive name, e.g.:
   - `kaizen_banner_dashboard`
   - or `kaizen_banner_global` (if sharing one unit across screens).
4. **Advanced Settings (Recommended)**:
   - **Automatic refresh**: Keep enabled (*Google optimized*). This automatically refreshes the banner every 30–60 seconds while the screen is open, maximizing impressions.
   - **eCPM floor**: Keep at *Google optimized (All prices)* initially so fill rates are 95%+.
5. Click **Create Ad Unit**.
6. You will see your **Ad Unit ID**:
   ```text
   Format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
   ```
   > ⚠️ **Notice the difference**: An Ad Unit ID has a **slash (`/`)** in the middle, while an App ID has a **tilde (`~`)**.

---

## 3. Mandatory: Setting Up `app-ads.txt`

Google AdMob requires an `app-ads.txt` file hosted on your developer website to verify you own the app. **If you do not set this up, Google will stop serving live ads after 14–30 days.**

1. In the AdMob console, go to **Apps** > **All apps** > **app-ads.txt**.
2. Copy the code snippet provided by AdMob. It looks like:
   ```text
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```
3. Create a plain text file named `app-ads.txt` containing that single line.
4. Host it at the root of your developer website URL listed in Google Play Store listing (e.g., `https://yourdomain.com/app-ads.txt`).
   - *Tip: If you do not have a custom domain, you can host it for free using **GitHub Pages** (e.g. `https://yourusername.github.io/app-ads.txt`) and link that URL as the website in your Google Play Store Store Listing!*
5. In AdMob, click **Check for updates**. AdMob will verify it within 24 hours.

---

## 4. Crucial Safety: Test Devices & Avoiding AdMob Bans

> 🚨 **CRITICAL WARNING**: **Never click your own live ads.** Google has automated fraud detection bots. Clicking your own live ads or repeatedly loading live ads on your personal phone during development will result in an immediate and permanent AdMob account suspension.

### How to Stay Safe:

1. **Use Google Test IDs in Development**:
   - Google provides official sample ad units that always serve mock test ads.
   - Our implementation automatically uses `TestIds.BANNER` whenever `__DEV__` is true or when credentials are not configured.
2. **Register Your Physical Phone as a Test Device**:
   - When running the app on your physical device, check your `adb logcat` or Metro console. The AdMob SDK will print:
     ```text
     Use RequestConfiguration.Builder().setTestDeviceIds(Arrays.asList("33BE2250B43518CCDA7DE426D04EE231"))
     ```
   - Copy that device hash string.
   - In the AdMob console, go to **Settings** > **Test devices** > **Add test device**.
   - Paste the ID and select Android.
   - Any live ad shown on this device will automatically display a **"Test Ad"** badge, preventing account penalties.

---

## 5. Codebase Integration Blueprint

### 5.1 Environment Variables (`.env`)

Add the following keys to your root `.env` and `.env.example`:

```env
# Google AdMob Configuration
# App ID (contains tilde ~)
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX

# Banner Ad Unit IDs (contains slash /)
EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
```

---

### 5.2 App Configuration (`app.json`)

Install the official package:
```bash
npx expo install react-native-google-mobile-ads
```

Add the plugin configuration in `app.json` (inside the `"plugins"` array):

```json
[
  "react-native-google-mobile-ads",
  {
    "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
    "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
  }
]
```

*Note: If you prefer reading `process.env` dynamically, convert `app.json` to `app.config.js` or configure the fallback test ID:*
```javascript
// Defaulting to Google's official Android Test App ID if .env is missing:
const androidAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || "ca-app-pub-3940256099942544~3347511713";
```

---

### 5.3 Clean Architecture Module (`src/modules/ads/`)

Following `AGENTS.md` rules, create `src/modules/ads/`:

```text
src/modules/ads/
├── components/
│   └── ad-banner.tsx         # Adaptive banner ad with pro hiding and error collapsing
├── constants/
│   └── ads.constants.ts      # Ad unit IDs, test fallbacks, sizes
├── services/
│   └── ads.service.ts        # SDK initialization and consent handling
├── hooks/
│   └── use-ad-visibility.ts  # Combines Pro check + env validation
├── types/
│   └── ads.types.ts
└── index.ts                  # Public exports boundary
```

#### Core Component Implementation Pattern (`ad-banner.tsx`):
```tsx
import { useState } from "react";
import { StyleSheet, View, Platform } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { useProStatus } from "@/modules/pro";
import { getBannerAdUnitId } from "../constants/ads.constants";

export function AdBanner() {
  const { isPro } = useProStatus();
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Pro users see NO ads and trigger NO network calls
  if (isPro) {
    return null;
  }

  // 2. Mobile ads are not supported on web
  if (Platform.OS === "web") {
    return null;
  }

  const adUnitId = __DEV__ ? TestIds.BANNER : getBannerAdUnitId();

  if (!adUnitId || hasError) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          setIsLoaded(true);
          setHasError(false);
        }}
        onAdFailedToLoad={(error) => {
          console.warn("[AdMob] Banner load failed:", error.message);
          setHasError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
});
```

---

### 5.4 Automatic Pro Hiding Flow

Because `useProStatus()` connects to RevenueCat and local secure storage:
1. When a user purchases **Lifetime Pro**, `isPro` transitions from `false` to `true`.
2. The `<AdBanner />` component re-renders and returns `null`.
3. In developer settings, if you toggle **"Dev Simulation: Lifetime Pro"**, the banner immediately disappears, making testing effortless.

---

## 6. Placement Recommendations & Policy Rules

### Strategy Comparison:

| Screen | Recommended Position | Impression Quality | User Experience Rating |
| :--- | :--- | :--- | :--- |
| **Dashboard** (`/`) | **Inline Card** (Between Net Worth Card and Recent Transactions) | ⭐⭐⭐⭐⭐ (100% of sessions) | **Excellent** (Feels native, doesn't crowd navigation) |
| **Dashboard** (`/`) | **Below Nav Header** (Top) | ⭐⭐⭐⭐⭐ | **Fair** (Requires careful padding to avoid accidental clicks) |
| **Transactions** (`/transactions`) | **Anchored Bottom** or **Inline after 5th item** | ⭐⭐⭐⭐⭐ (High dwell time) | **Great** |
| **Reports** (`/reports`) | **Bottom of Screen** (Below charts) | ⭐⭐⭐⭐ (Highest view duration) | **Excellent** (Doesn't interrupt chart analysis) |
| **Budgets** (`/budgets`) | **Bottom of Screen** | ⭐⭐⭐⭐ | **Great** |

### Where to NEVER place banner ads:
- ❌ **Transaction Entry / Calculator Modals**: High rate of accidental touches when entering numbers; causes immediate AdMob policy penalties.
- ❌ **Biometric PIN Screen (`AppLockGate`)**: Degrades app security feel.
- ❌ **Onboarding Screens**: Causes early user drop-off.

---

## 7. Testing & Build Workflow

Because `react-native-google-mobile-ads` includes native code (Google Play Services Ads), it **requires a standalone development build or release APK** (cannot run in standard Expo Go).

### 1. Rebuild Android native code:
```powershell
npm run android:prebuild
```

### 2. Build and test standalone debug APK:
```powershell
npm run android:apk:debug:standalone
```

### 3. Verify in App:
- Open Dashboard: You should see the Google Test Banner ("Test Ad - Nice job, you're all set!").
- Open Developer Settings: Enable "Dev Simulation: Lifetime Pro" -> Banner disappears!
- Disable Dev Simulation -> Banner returns!

---

## 8. Troubleshooting & Gotchas

1. **"The Google Mobile Ads SDK was initialized without an App ID" crash**:
   - Cause: Missing `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" ... />` in `AndroidManifest.xml`.
   - Fix: Ensure `react-native-google-mobile-ads` is in `app.json` plugins and re-run `npm run android:prebuild`.
2. **Error Code 3: ERROR_CODE_NO_FILL**:
   - Cause: Brand new ad units can take 1–2 hours to begin serving ads.
   - Fix: In development, always use `TestIds.BANNER`.
3. **Banner pushes content down abruptly**:
   - Fix: Wrap the banner in a container with a fixed minimum height or animate height with layout transitions.
