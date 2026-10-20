# Complete Guide: Integrating Google Play Billing with RevenueCat (Expo / React Native)

A complete, battle-tested, end-to-end blueprint for integrating Google Play In-App Purchases and Subscriptions using RevenueCat in an Expo / React Native application. 

Follow this guide whenever you need to integrate Google Play Billing in a new app or re-configure an existing one.

---

## Table of Contents

1. [High-Level Architecture & How It Works](#1-high-level-architecture--how-it-works)
2. [Code & Environment Setup](#2-code--environment-setup)
   - [Dependencies & Android Permissions](#21-dependencies--android-permissions)
   - [Environment Variables (`.env`)](#22-environment-variables-env)
   - [Core Implementation Code](#23-core-implementation-code)
3. [Google Cloud Console Setup (APIs & Service Account)](#3-google-cloud-console-setup-apis--service-account)
   - [Step 3.1: Enable Required APIs](#step-31-enable-required-apis)
   - [Step 3.2: Create Service Account & Download JSON Key](#step-32-create-service-account--download-json-key)
4. [Google Play Console Setup](#4-google-play-console-setup)
   - [Step 4.1: Grant Permissions to Service Account](#step-41-grant-permissions-to-service-account)
   - [Step 4.2: Create the In-App Product](#step-42-create-the-in-app-product)
   - [Step 4.3: Configure License Testers & Internal Testing Track](#step-43-configure-license-testers--internal-testing-track)
5. [RevenueCat Dashboard Setup](#5-revenuecat-dashboard-setup)
   - [Step 5.1: Create Project & Android App](#step-51-create-project--android-app)
   - [Step 5.2: Upload Service Account Credentials JSON](#step-52-upload-service-account-credentials-json)
   - [Step 5.3: Create Entitlement](#step-53-create-entitlement)
   - [Step 5.4: Create/Verify Products](#step-54-createverify-products)
   - [Step 5.5: Configure Offering & Attach Store Product (Critical!)](#step-55-configure-offering--attach-store-product-critical)
6. [Testing the In-App Purchase Flow](#6-testing-the-in-app-purchase-flow)
7. [Troubleshooting & Common Gotchas](#7-troubleshooting--common-gotchas)

---

## 1. High-Level Architecture & How It Works

```text
┌────────────────┐           ┌──────────────────┐           ┌────────────────────┐
│   Mobile App   │  ======>  │    RevenueCat    │  ======>  │ Google Play Server │
│ (React Native) │           │     Backend      │           │    (Google APIs)   │
└────────────────┘           └──────────────────┘           └────────────────────┘
        │                             │                               │
        │ Uses Public SDK Key         │ Uses Service Account JSON     │ Validates Purchases
        │ (goog_xxx or test_xxx)      │ to query products & orders    │ & provides billing
        ▼                             ▼                               ▼
   `Purchases` SDK             Stores Entitlements              Pub/Sub real-time
   initiates UI flow           & cross-platform sync           developer notifications
```

- **App ➔ RevenueCat:** Your app communicates with RevenueCat using the **Public API Key** (`goog_...`).
- **RevenueCat ➔ Google Play:** RevenueCat talks to Google Play using the **Google Cloud Service Account JSON Key** and listens for purchase events via **Google Cloud Pub/Sub**.
- **Entitlement:** The feature unlocked for the user (e.g. `kaizen_finance_pro`).
- **Product:** The physical store SKU created in Google Play (e.g. `lifetime`).
- **Package:** RevenueCat's platform-agnostic wrapper (e.g. `$rc_lifetime`), which maps both Android SKUs and iOS SKUs to a single paywall button.

---

## 2. Code & Environment Setup

### 2.1 Dependencies & Android Permissions

1. Install the official RevenueCat Purchases SDK:
   ```bash
   npx expo install react-native-purchases
   ```

2. **Android Billing Permission**:
   You do **not** need to manually add `com.android.vending.BILLING` to `AndroidManifest.xml`. The `react-native-purchases` library includes it automatically in its native Android manifest merge step.

---

### 2.2 Environment Variables (`.env`)

In your `.env` file:

```env
# Google Play Production / Live Key from RevenueCat:
EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=goog_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ **CRITICAL WARNING ABOUT API KEYS:**
> - Keys starting with `test_` are **RevenueCat Test Store Sandbox keys** (mock simulator only).
> - Keys starting with `goog_` are **Google Play keys** (real Google Play Billing).
> - **Never use a `test_` key in a Release APK/AAB!** RevenueCat's native SDK intentionally displays a blocking *"Wrong API Key"* dialog and terminates release builds if a test key is detected.

---

### 2.3 Core Implementation Code

Create a dedicated billing service (e.g. `src/modules/pro/services/pro-billing.service.ts`):

```typescript
import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  LOG_LEVEL,
  type PurchasesPackage,
} from "react-native-purchases";

// Constants
export const PRO_CONSTANTS = {
  ENTITLEMENT_ID: "kaizen_finance_pro",
  LEGACY_ENTITLEMENT_ID: "pro",
  LIFETIME_PRODUCT_ID: "lifetime",
  FALLBACK_PRICE: "$9.99",
  FALLBACK_TITLE: "Lifetime Pro Access",
} as const;

let isConfigured = false;
let cachedCurrentPackage: PurchasesPackage | null = null;

function getApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY;
  if (!key || key.trim() === "" || key.includes("your_api_key")) return null;
  return key.trim();
}

/**
 * 1. Initialize RevenueCat
 */
export async function initializeRevenueCat(): Promise<boolean> {
  if (isConfigured) return true;
  if (Platform.OS !== "android" && Platform.OS !== "ios") return false;

  const apiKey = getApiKey();
  if (!apiKey) return false;

  // Guard against using test_* key in release builds
  if (typeof __DEV__ !== "undefined" && !__DEV__ && apiKey.startsWith("test_")) {
    console.warn("[ProBilling] Cannot use test key in release build.");
    return false;
  }

  try {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey });
    isConfigured = true;
    return true;
  } catch (error) {
    console.warn("[ProBilling] Failed to configure Purchases:", error);
    return false;
  }
}

/**
 * 2. Fetch Packages & Live Price
 */
export async function fetchProPackage() {
  const configured = await initializeRevenueCat();
  if (!configured) return null;

  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current && offerings.current.availablePackages.length > 0) {
      const lifetimePkg =
        offerings.current.lifetime ?? offerings.current.availablePackages[0];

      if (lifetimePkg) {
        cachedCurrentPackage = lifetimePkg;
        return {
          identifier: lifetimePkg.identifier,
          productId: lifetimePkg.product.identifier,
          priceString: lifetimePkg.product.priceString, // e.g. "₱99.00" or "$9.99"
          title: lifetimePkg.product.title,
          description: lifetimePkg.product.description,
        };
      }
    }
  } catch (error) {
    console.warn("[ProBilling] Failed to fetch offerings:", error);
  }
  return null;
}

/**
 * 3. Purchase Lifetime Package
 */
export async function purchaseLifetimePackage() {
  const configured = await initializeRevenueCat();
  if (!configured) {
    return { success: false, error: "Store billing unavailable." };
  }

  try {
    if (!cachedCurrentPackage) {
      await fetchProPackage();
    }

    if (!cachedCurrentPackage) {
      return { success: false, error: "Product package not found in store." };
    }

    const { customerInfo } = await Purchases.purchasePackage(cachedCurrentPackage);
    const isPro = hasProEntitlement(customerInfo);

    return { success: isPro, isPro };
  } catch (error: any) {
    if (error?.userCancelled) {
      return { success: false, userCancelled: true };
    }
    return { success: false, error: error?.message || "Purchase failed." };
  }
}

/**
 * 4. Restore Purchases
 */
export async function restorePurchasesFromStore() {
  const configured = await initializeRevenueCat();
  if (!configured) return { success: false, isPro: false };

  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPro = hasProEntitlement(customerInfo);
    return { success: true, isPro };
  } catch (error) {
    return { success: false, isPro: false };
  }
}

/**
 * 5. Verify Entitlement
 */
export function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  const active = customerInfo.entitlements.active;
  return (
    active[PRO_CONSTANTS.ENTITLEMENT_ID] !== undefined ||
    active[PRO_CONSTANTS.LEGACY_ENTITLEMENT_ID] !== undefined
  );
}
```

---

## 3. Google Cloud Console Setup (APIs & Service Account)

RevenueCat communicates with Google Play through a **Google Cloud Service Account**.

### Step 3.1: Enable Required APIs
1. Open the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Select your Google Cloud Project (or create a new project, e.g. `Kaizen Finance App`).
3. Enable the two required APIs:
   - **Google Play Android Developer API**:  
     👉 [Enable Link](https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com)
   - **Cloud Pub/Sub API** (Required for instant real-time purchase updates):  
     👉 [Enable Link](https://console.cloud.google.com/apis/library/pubsub.googleapis.com)

---

### Step 3.2: Create Service Account & Download JSON Key
1. Go to **[IAM & Admin ➔ Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)**.
2. Click **`+ CREATE SERVICE ACCOUNT`**:
   - **Name**: `revenuecat-billing`
   - **Description**: `RevenueCat Play Store billing access`
3. Click **CREATE AND CONTINUE**, then click **DONE** (no project-level IAM role needed).
4. Find the newly created service account in the list:
   - **Copy its email address** (e.g. `revenuecat-billing@your-project-id.iam.gserviceaccount.com`).
   - Click the **three dots `⋮`** under Actions ➔ **Manage keys**.
5. Click **ADD KEY** ➔ **Create new key**.
6. Select **JSON** and click **CREATE**.
7. The `.json` file will automatically download to your computer. Store it securely.

---

## 4. Google Play Console Setup

### Step 4.1: Grant Permissions to Service Account
Google Play Console now manages service account permissions through **Users and permissions**:

1. Open **[Google Play Console](https://play.google.com/console)**.
2. In the left menu, click **Manage account** (or Developer account settings).
3. Click **Users and permissions** ➔ click **Invite new users**.
4. In the **Email address** field, paste your service account email:
   ```text
   revenuecat-billing@your-project-id.iam.gserviceaccount.com
   ```
5. Under **App permissions**:
   - Click **Add app** ➔ select your app (e.g. **Kaizen Finance**) ➔ click **Apply**.
6. Under **Account permissions** (or financial permissions for the app):
   - Check ✅ **View app information and download bulk reports (read-only)**
   - Check ✅ **View financial data, orders, and cancellation survey responses**
   - Check ✅ **Manage orders and subscriptions**
7. Click **Invite user** / **Save changes**.

---

### Step 4.2: Create the In-App Product
1. In Google Play Console, open your app.
2. In the left menu, navigate to **Monetize** ➔ **Products** ➔ **In-app products**.
3. Click **Create product**:
   - **Product ID**: `lifetime` *(Must match your code's `PRO_CONSTANTS.LIFETIME_PRODUCT_ID`)*
   - **Name**: `Lifetime Pro Access`
   - **Description**: `One-time unlock for lifetime pro features`
   - **Price**: Set your price (e.g. ₱99.00 or $9.99)
4. Click **Save** and then click **Activate**. Ensure the product status is **Active**.

---

### Step 4.3: Configure License Testers & Internal Testing Track
Google Play will reject in-app billing requests unless the test user is authorized:

1. **License Testing (Free testing without credit card charge):**
   - In Google Play Console ➔ **Manage account** ➔ **Play apps settings** ➔ **License testing**.
   - Add your tester's Gmail address.
   - Set **License response** to `RESPOND_NORMALLY`.
2. **Internal Testing Track:**
   - Go to **Test and release** ➔ **Internal testing**.
   - Create a release and upload your signed `.aab` at least once so Google registers the billing permissions.
   - In the **Testers** tab, create or select an email list with your tester's email.
3. **Accept Opt-In Invitation (Crucial!):**
   - Under the Testers tab, copy the **"Join on Android"** or **"Join on the web"** URL.
   - **Open this URL on the test device with the tester Google account and tap "Accept Invitation"**.

---

## 5. RevenueCat Dashboard Setup

### Step 5.1: Create Project & Android App
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/).
2. Create your Project (e.g. `Kaizen Finance`).
3. In Project Settings ➔ **Apps**, click **New app** ➔ select **Google Play Store**.
4. Set:
   - **App name**: `Kaizen Finance`
   - **Google Play package name**: `com.kaizen.finance.app` (must match `app.json` `android.package`)
5. Click **Save**. Copy the **Public API Key** (`goog_...`) into your `.env`:
   ```env
   EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=goog_...
   ```

---

### Step 5.2: Upload Service Account Credentials JSON
1. Under your Google Play App settings in RevenueCat, scroll down to **Service Account Credentials JSON**.
2. Upload the `.json` file downloaded in Step 3.2.
3. Click **Save changes** / **Check credentials**.
4. All checks should turn green:
   - ✅ Can read Google Play in-app product catalog
   - ✅ Can read Google Play subscription catalog
   - ✅ Can validate Google Play subscription purchases

---

### Step 5.3: Create Entitlement
1. Go to **Product catalog** ➔ **Entitlements**.
2. Click **New entitlement**:
   - **Identifier**: `kaizen_finance_pro` (matches your code's `ENTITLEMENT_ID`)
   - **Description**: `Kaizen Finance Pro`
3. Click **Save**.

---

### Step 5.4: Create/Verify Products
1. Go to **Product catalog** ➔ **Products**.
2. Click **Import** (or **New product**):
   - **Identifier**: `lifetime`
   - **App**: `Kaizen Finance` (Google Play)
   - **Product type**: `Non-consumable` (one-time purchase)
3. Once imported/created, status should show **Published** with a green badge.
4. Under **Entitlements**, attach `kaizen_finance_pro`.

---

### Step 5.5: Configure Offering & Attach Store Product (CRITICAL!)
> 🚨 **This is where 90% of developers get stuck with "Product package not found in store".**

An Offering package is an abstract container. You **must explicitly map the Google Play product** to it:

1. Go to **Product catalog** ➔ **Offerings**.
2. Click into the **`default`** offering (ensure it is marked as Current).
3. Click the blue **`✏️ Edit`** button at the top-right.
4. Under the **`$rc_lifetime`** package:
   - Look at **Products**:
     - `[RC] Test Store`: `Lifetime`
     - `[Android] Kaizen Finance`: **Select `Lifetime Pro Access (lifetime)` from the dropdown!**
5. Click **Save**.
6. Verify: The package card must show the **green Android robot icon** next to `Lifetime Pro Access`.

---

## 6. Testing the In-App Purchase Flow

Once all steps are completed:

1. Build or download the latest release or standalone debug build.
2. Open the app on the physical Android test device.
3. Tap **Upgrade to Pro**.
4. The native Google Play sheet will slide up displaying:
   - **Product Name**: `Lifetime Pro Access`
   - **Store Price**: `₱99.00` (or your local currency)
   - **Payment Method**: `Test card, always approves`
   - Notice: *"This is a test order, you will not be charged."*
5. Tap **1-tap buy**.
6. Google Play approves the order ➔ RevenueCat registers the entitlement ➔ Your app unlocks Pro features immediately!

---

## 7. Troubleshooting & Common Gotchas

| Error / Symptom | Root Cause | Fix |
| :--- | :--- | :--- |
| **"Restore Failed, Product package not found in store"** | In RevenueCat Offerings, the package only had `[RC] Test Store` attached, while Google Play showed `No product`. | Edit the Offering package in RevenueCat and select `Lifetime Pro Access (lifetime)` under the Android app dropdown. |
| **"Connection issue. Make sure the Service Account Credentials JSON is configured properly"** | Missing Service Account JSON in RevenueCat, or Google Play Developer API is disabled in Google Cloud. | Follow Section 3 & 4: Enable Google Play Android Developer API in GCP, download Service Account JSON, and upload to RevenueCat. |
| **"Credentials need attention: Can validate Google Play subscription purchases [X]"** | Service account missing Financial or Order Management permissions in Google Play Console. | In Google Play Console ➔ Users and permissions ➔ Click service account email ➔ Check *View financial data* & *Manage orders and subscriptions*. |
| **"Google Cloud Pub/Sub API must first be enabled"** | Pub/Sub is not enabled in your Google Cloud project. | Go to GCP and enable [Cloud Pub/Sub API](https://console.cloud.google.com/apis/library/pubsub.googleapis.com). |
| **"Wrong API Key" dialog pops up & app crashes** | Used a `test_...` sandbox key in a Release build (`assembleRelease`). | Use the real Google Play key (`goog_...`) in `.env` for release builds, or test with a debug build. |
| **Google Play modal shows "Item unavailable for purchase"** | Tester did not accept the internal testing invite link, or the product ID is not Active in Play Console. | Open the Internal Testing web invite URL on the phone and click *Accept Invitation*. Verify product status is Active in Google Play Console. |
| **Price shows fallback price instead of store currency** | `Purchases.getOfferings()` failed to fetch from store. | Ensure device has active internet, Google Play Services is updated, and the Offering is marked as *Current*. |
