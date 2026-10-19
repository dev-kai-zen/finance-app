# Android Release Keystore & Gradle Signing Guide

This guide details how your release keystore is set up for **Kaizen Finance**, how Gradle signs your production builds (`.aab` and `.apk`), and what to check before running release builds.

---

## 1. Setup Status Checklist

| Component | Status | Details |
| :--- | :--- | :--- |
| **Keystore File** | ✅ **Created** | Located at `android/app/upload-keystore.jks` |
| **Key Alias** | ✅ **Configured** | Alias name: `upload` |
| **`android/app/build.gradle`** | ✅ **Updated** | `signingConfigs.release` is configured and linked to `MYAPP_UPLOAD_*` |
| **`android/gradle.properties`** | ⚠️ **Action Required** | Put your keystore password in `MYAPP_UPLOAD_STORE_PASSWORD` |
| **App Bundle Command** | ✅ **Ready** | `npm run android:aab:release` |

---

## 2. How to Generate the Keystore

If you ever need to generate the keystore on a fresh machine or clone, use the `keytool` utility bundled with Java/JDK:

### Command:
Run this command from the repository root in PowerShell:

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

### What Each Parameter Means:
* `-storetype PKCS12`: The modern cryptographic storage format required by Java and Google.
* `-keystore android/app/upload-keystore.jks`: The output path where the key will be saved.
* `-alias upload`: The nickname used by Gradle to locate this specific key within the file.
* `-keyalg RSA -keysize 2048`: 2048-bit RSA encryption standard required for Google Play.
* `-validity 10000`: Valid for ~27 years (Google Play requires certificates valid past the year 2049).

### Interactive Prompts Walkthrough:
When you execute the command, terminal prompts will ask:

1. **Enter keystore password:** Type a secure password *(characters will not appear as you type)*.
2. **Re-enter new password:** Retype the same password to confirm.
3. **What is your first and last name?** Enter your name (e.g. `John Paul Arellano`).
4. **What is the name of your organizational unit?** Enter `Kaizen Finance` (or leave blank).
5. **What is the name of your organization?** Enter `Kaizen Finance`.
6. **What is the name of your City or Locality?** Enter your city (e.g. `Guinayangan`).
7. **What is the name of your State or Province?** Enter your province (e.g. `Quezon`).
8. **What is the two-letter country code?** Enter `PH`.
9. **Is CN=... correct?** Type `yes` and press Enter.

The file `android/app/upload-keystore.jks` will be created.

---

## 3. Immediate Next Step: Add Your Password

Open [`android/gradle.properties`](file:///c:/expo-repo/finance-app/android/gradle.properties) and look at the bottom:

```properties
# Release Keystore Configuration for Google Play
MYAPP_UPLOAD_STORE_FILE=upload-keystore.jks
MYAPP_UPLOAD_KEY_ALIAS=upload
MYAPP_UPLOAD_STORE_PASSWORD=YOUR_KEYSTORE_PASSWORD
MYAPP_UPLOAD_KEY_PASSWORD=YOUR_KEYSTORE_PASSWORD
```

Replace `YOUR_KEYSTORE_PASSWORD` with the password you entered when running `keytool`. Both passwords should be the same.

---

## 4. How Gradle Uses Your Keystore Behind the Scenes

### In `android/app/build.gradle`
We added the following release signing configuration:

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
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Uses release signing if upload properties are present, otherwise falls back to debug
            signingConfig (project.hasProperty('MYAPP_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug)
            ...
        }
    }
```

### Flow of Execution:
1. When you run `npm run android:aab:release`, Gradle executes task `bundleRelease`.
2. Gradle checks for the property `MYAPP_UPLOAD_STORE_FILE` in `android/gradle.properties`.
3. Gradle reads `android/app/upload-keystore.jks` using your alias and password.
4. Gradle cryptographically signs the final `.aab` (or release `.apk`).
5. Google Play Console accepts the upload because it is signed with a valid release key, not the debug key.

---

## 5. Building the Bundle

Once you save your password in `android/gradle.properties`, run:

```bash
npm run android:aab:release
```

The signed Android App Bundle will be output to:
```text
android/app/build/outputs/bundle/release/app-release.aab
```

This is the exact file to upload to **Google Play Console ➔ Internal Testing**.

---

## 6. Security & Keystore Backup (CRITICAL)

1. **Back up your keystore file:**
   Copy `android/app/upload-keystore.jks` to a secure location (e.g. your password manager, encrypted USB, or secure drive).
2. **Never commit passwords or keys to Git:**
   * Notice that `*.jks` and `android/` are already in your [`.gitignore`](file:///c:/expo-repo/finance-app/.gitignore). They will never be accidentally committed to GitHub.
3. **Google Play App Signing:**
   When you upload your first AAB to Google Play, Google registers this upload key. Every future update of Kaizen Finance uploaded to Google Play must be signed with this exact key.

---

## 7. What if You Run `npx expo prebuild --clean` in the Future?

If you ever run a clean prebuild (`npx expo prebuild --clean` or delete `android/`):
1. `android/app/upload-keystore.jks` and `android/gradle.properties` might be deleted if inside `android/`.
2. **Best Practice:** Keep a copy of `upload-keystore.jks` in a safe backup folder outside `android/` so you can restore it whenever needed.
3. Re-add the 4 properties in `android/gradle.properties` and the `signingConfigs.release` block in `android/app/build.gradle`.
