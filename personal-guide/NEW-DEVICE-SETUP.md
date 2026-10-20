# Finance App: new Windows device setup

This guide prepares a new Windows computer to run and build this app locally. The project uses Expo SDK 57, React Native 0.86, Expo Router, and a local SQLite database. It does **not** use EAS Build: the debug APK, release APK, and Play Store bundle are made with the locally generated Android/Gradle project.

The Android application ID is currently `com.financeapp.app`. Change it to an identifier you own before publishing an app under your own Google Play developer account.

## 1. Install the required tools

Install the following on the new Windows computer:

1. Git.
2. Node.js **22.13 or newer**. Expo SDK 57 requires Node 22.13+.
3. Android Studio (stable channel).
4. JDK 17.

In Android Studio, open **More Actions > SDK Manager** and install:

- Android SDK Platform 36
- Android SDK Build-Tools 36.0.0
- Android SDK Platform-Tools
- Android SDK Command-line Tools (latest)

Set these **Windows User** environment variables in **System Properties > Environment Variables**. Replace `<you>` with your Windows username:

```text
JAVA_HOME=C:\Program Files\Java\jdk-17
ANDROID_HOME=C:\Users\<you>\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT=C:\Users\<you>\AppData\Local\Android\Sdk
```

Add these entries to the user `Path`:

```text
%JAVA_HOME%\bin
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%ANDROID_HOME%\cmdline-tools\latest\bin
```

Close and reopen VS Code and every terminal after changing environment variables. In PowerShell, confirm the tools are available:

```powershell
node --version
java -version
adb version
```

## 2. Clone the project and install its locked dependencies

```powershell
git clone <your-repository-url>
Set-Location finance-app
npm ci
npx expo-doctor
```

Use `npm ci`, not `npm install`, because this repository contains `package-lock.json`; it restores the tested dependency versions exactly.

## 3. Generate the native Android project

The `android/` directory is intentionally ignored by Git, so it will not be present in a fresh clone. Generate it from the Expo configuration:

```powershell
npm run android:prebuild
```

Then create `android/local.properties` so Gradle can find your Android SDK. Replace `<you>` with your Windows username:

```powershell
Set-Content android/local.properties 'sdk.dir=C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk'
```

`android/local.properties` is specific to your computer and must never be committed. If you later change `app.json`, add a native Expo package, or change a config plugin, regenerate the native project with `npm run android:prebuild`. Do not use `--clean` if you have customized `android/app/build.gradle` for release signing; it recreates the native project.

## 4. Run the app while developing

For the first local Android run, start an emulator in Android Studio or connect an Android device with USB debugging enabled, then run:

```powershell
npm run android
```

This compiles, installs a debug build, and starts Metro. After that first native build, use this for JavaScript/TypeScript-only changes:

```powershell
npm start
```

Press `a` in the Metro terminal to open the installed app on Android. Rebuild with `npm run android` after native/configuration changes.

## 5. Build a debug APK

A debug APK is signed with the Android debug key and is intended for local testing only. It does not need release credentials.

```powershell
npm run android:apk:debug
```

Artifact:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

To install it on a USB-connected device:

```powershell
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## 6. Configure signing for a release APK or Play Store bundle

> [!CAUTION]
> **Do NOT run `keytool -genkeypair` on a new computer.**  
> Google Play has already registered your upload key with fingerprint `SHA1: 96:24:CF:31:2A:3F:DB:CC:50:C9:DE:59:50:68:B5:05:48:46:A7:13`.  
> Copy your backed-up `upload-keystore.jks` file to `android/app/upload-keystore.jks`. Refer to [KEYSTORE_SETUP_GUIDE.md](file:///c:/expo-app/finance-app/personal-guide/KEYSTORE_SETUP_GUIDE.md) for full details.

1. **Copy the keystore file:**
   Place your backed-up `upload-keystore.jks` into `android/app/upload-keystore.jks`.

2. **Add credentials to Gradle:**
   Add to `android/gradle.properties` (or `~/.gradle/gradle.properties`):
   ```properties
   MYAPP_UPLOAD_STORE_FILE=upload-keystore.jks
   MYAPP_UPLOAD_KEY_ALIAS=upload
   MYAPP_UPLOAD_STORE_PASSWORD=YOUR_KEYSTORE_PASSWORD
   MYAPP_UPLOAD_KEY_PASSWORD=YOUR_KEYSTORE_PASSWORD
   ```

3. **Configure `android/app/build.gradle`:**
   Ensure `signingConfigs.release` is defined and used by `buildTypes.release`:
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
               signingConfig (project.hasProperty('MYAPP_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug)
               ...
           }
       }
   ```

## 7. Build the signed release APK

After completing signing setup, create a direct-install release APK:

```powershell
npm run android:apk:release
```

Artifact:

```text
android/app/build/outputs/apk/release/app-release.apk
```

This is a production-style, signed APK suitable for direct tester installation. It is not the preferred Google Play upload format.

## 8. Build the signed release bundle (AAB)

After the same signing setup, create the Google Play upload artifact:

```powershell
npm run android:aab:release
```

Artifact:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

An `.aab` cannot be installed directly on a device. Upload it through Google Play Console, using an internal testing track first when possible.

Before every Play upload, increment `expo.android.versionCode` in `app.json`. Update `expo.version` when the user-visible version should change. Then rerun `npm run android:prebuild`, reapply the local signing configuration from step 6, and build the AAB.

## 9. Build-command quick reference

Run these commands from the project root.

| Need                      | Command                       | Output                                                     |
| ------------------------- | ----------------------------- | ---------------------------------------------------------- |
| Native project generation | `npm run android:prebuild`    | `android/`                                                 |
| Debug APK                 | `npm run android:apk:debug`   | `android/app/build/outputs/apk/debug/app-debug.apk`        |
| Signed release APK        | `npm run android:apk:release` | `android/app/build/outputs/apk/release/app-release.apk`    |
| Signed Play bundle        | `npm run android:aab:release` | `android/app/build/outputs/bundle/release/app-release.aab` |

## 10. Troubleshooting

### `SDK location not found`

Create `android/local.properties` as shown in step 3. If Gradle then reports missing SDK packages, install Platform 36 and Build-Tools 36.0.0 in Android Studio's SDK Manager.

### `Missing android/keystore.properties`

This is intentional: release builds must not silently use a debug key. Follow step 6, then run the release command again. Debug APKs do not need this file.

### `keytool` cannot create `android/app/upload-keystore.jks`

Run the command from the project root after `npm run android:prebuild`, so the `android/app` directory exists.

### The app compiles but changes are missing

For TypeScript/JavaScript changes, run `npm start` and reload the app. For native dependency, plugin, or `app.json` changes, rerun `npm run android:prebuild`, reapply the release-signing customization if building a release, and rebuild.

# Optional: Installation of Expo Skills

npx skills@latest add expo/skills --skill '\*'

## References

- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
- [Expo: create a debug build locally](https://docs.expo.dev/guides/local-app-development/)
- [Expo: create a release build locally](https://docs.expo.dev/guides/local-app-production/)
- [Android: sign your app](https://developer.android.com/studio/publish/app-signing)
