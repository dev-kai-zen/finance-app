# Android Release Keystore & Gradle Signing Guide

This guide details how your release keystore is set up for **Kaizen Finance**, how Gradle signs your production builds (`.aab` and `.apk`), and the exact steps to set up on a **new device** or after running `npx expo prebuild --clean`.

---

## ⚠️ Critical Rule: Never Generate a New Keystore

> [!CAUTION]
> **Google Play registers your upload key permanently on the first upload.**
> Every subsequent update of Kaizen Finance uploaded to Google Play **MUST** be signed with the exact same key:
> 
> **Registered Fingerprint:**  
> `SHA1: 96:24:CF:31:2A:3F:DB:CC:50:C9:DE:59:50:68:B5:05:48:46:A7:13`
>
> If you run `keytool -genkeypair` on a new computer, it will create a **different** key, and Google Play Console will reject your bundle with:  
> *"Your Android App Bundle is signed with the wrong key..."*  
> **Always copy your backed-up `upload-keystore.jks` file to your new device.**

---

## 1. Setup on a New Device (Office Laptop / Fresh Clone)

When you clone this project on a new laptop or after `npx expo prebuild --clean`, follow these 5 steps:

### Step 1: Generate the Android native project
Run from the project root:
```powershell
npm install
npm run android:prebuild
```

### Step 2: Copy your existing `upload-keystore.jks`
Copy your backed-up `upload-keystore.jks` file into:
```text
android/app/upload-keystore.jks
```
*(Do NOT run `keytool` to create a new one!)*

### Step 3: Add the Keystore credentials
Open `android/gradle.properties` (or your user-level `C:\Users\<username>\.gradle\gradle.properties`) and add to the bottom:

```properties
# Release Keystore Configuration for Google Play
MYAPP_UPLOAD_STORE_FILE=upload-keystore.jks
MYAPP_UPLOAD_KEY_ALIAS=upload
MYAPP_UPLOAD_STORE_PASSWORD=YOUR_KEYSTORE_PASSWORD
MYAPP_UPLOAD_KEY_PASSWORD=YOUR_KEYSTORE_PASSWORD
```

> [!TIP]
> **Best Practice:** If you put these 4 lines in `C:\Users\<username>\.gradle\gradle.properties`, they will **never** be wiped when running `npx expo prebuild --clean` and will never be committed to Git.

### Step 4: Configure `android/app/build.gradle` for Release Signing
By default, Expo generates `android/app/build.gradle` with release builds hardcoded to `signingConfigs.debug`.

Open [`android/app/build.gradle`](file:///c:/expo-app/finance-app/android/app/build.gradle) and make two checks:

1. **Inside `signingConfigs { ... }`**, ensure `release` is defined:
   ```groovy
       signingConfigs {
           debug {
               storeFile file('debug.keystore')
               storePassword 'android'
               keyAlias 'androiddebugkey'
               keyPassword 'android'
           }
           release {
               if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                   storeFile file(MYAPP_UPLOAD_STORE_FILE)
                   storePassword MYAPP_UPLOAD_STORE_PASSWORD
                   keyAlias MYAPP_UPLOAD_KEY_ALIAS
                   keyPassword MYAPP_UPLOAD_KEY_PASSWORD
               }
           }
       }
   ```

2. **Inside `buildTypes { release { ... } }`**, ensure `signingConfig` points to `release`:
   ```groovy
       buildTypes {
           debug {
               signingConfig signingConfigs.debug
           }
           release {
               // Uses release signing if upload properties are present, otherwise falls back to debug
               signingConfig (project.hasProperty('MYAPP_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug)
               def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
               ...
           }
       }
   ```

> [!IMPORTANT]
> If `signingConfigs.release` is missing, Gradle will silently sign your bundle using `debug.keystore` (SHA1: `5E:8F:16:06...`), causing Google Play to reject it.

### Step 5: Verify Version Code
Before building an update for Google Play, ensure `versionCode` is incremented and matches in both:
- [`app.json`](file:///c:/expo-app/finance-app/app.json) ➔ `expo.android.versionCode`
- [`android/app/build.gradle`](file:///c:/expo-app/finance-app/android/app/build.gradle) ➔ `android.defaultConfig.versionCode`

---

## 2. Building the Signed Bundle (AAB)

Run from the project root:
```powershell
npm run android:aab:release
```

The output file will be generated at:
```text
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 3. How to Verify the AAB Before Uploading

You can verify that the `.aab` is signed with the correct key before uploading it to Google Play Console:

```powershell
keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab
```

**Check the output:**
```text
Certificate fingerprints:
    SHA1: 96:24:CF:31:2A:3F:DB:CC:50:C9:DE:59:50:68:B5:05:48:46:A7:13
```

- If it displays `96:24:CF:...`, your bundle is signed correctly with your Google Play upload key!
- If it displays `5E:8F:16:...`, it was signed with the debug key. Check Step 3 and Step 4 above.

---

## 4. Keystore Backup & Security Checklist

1. **Keep multiple secure backups of `upload-keystore.jks`:**
   - Store a copy in your password manager, cloud vault (Google Drive / OneDrive in a secure ZIP), or an encrypted USB drive.
2. **Never commit keystores or passwords to Git:**
   - Notice that `*.jks`, `keystore.properties`, and `android/` are ignored in [`.gitignore`](file:///c:/expo-app/finance-app/.gitignore).
3. **What if the keystore is permanently lost?**
   - If you ever lose `upload-keystore.jks`, you will have to request a key reset from Google Play Developer Support, which can take days to verify your identity. Keeping backups prevents this completely.
