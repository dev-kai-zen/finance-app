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

## 6. Set up signing once for a release APK or bundle

Both release artifacts require an upload keystore. Create it once on a secure machine, keep a protected backup outside the repository, and reuse the same keystore for every update to the same Google Play app.

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Create `android/keystore.properties` with the values chosen above:

```powershell
@'
storeFile=upload-keystore.jks
storePassword=<your-keystore-password>
keyAlias=upload
keyPassword=<your-key-password>
'@ | Set-Content android/keystore.properties
```

The keystore and `keystore.properties` are private. Do not commit, email, or paste either into chat. This repository ignores `.jks` files and `android/keystore.properties`.

### Make the generated Gradle project use the private signing file

`android/` is generated and ignored, so a fresh prebuild produces Expo's default Gradle file without this app's local release-signing customization. Before running either release command, update `android/app/build.gradle` as follows:

1. Immediately after `def projectRoot = ...`, add:

```groovy
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
def isReleaseBuild = gradle.startParameter.taskNames.any { it.toLowerCase().contains("release") }
```

2. In the existing `signingConfigs` block, add this `release` configuration after `debug`:

```groovy
release {
    if (keystorePropertiesFile.exists()) {
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
    }
}
```

3. In `buildTypes { release { ... } }`, replace Expo's default `signingConfig signingConfigs.debug` line with:

```groovy
if (!keystorePropertiesFile.exists() && isReleaseBuild) {
    throw new GradleException("Missing android/keystore.properties. Follow NEW-DEVICE-SETUP.md before building a release.")
}
if (keystorePropertiesFile.exists()) {
    signingConfig signingConfigs.release
}
```

This is the signing configuration currently used on the original development machine. Reapply it whenever a fresh or clean prebuild recreates `android/app/build.gradle`.

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
