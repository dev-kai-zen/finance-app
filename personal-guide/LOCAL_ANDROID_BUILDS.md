# Local Android builds for this Expo app

This project creates Android artifacts entirely on your computer. It does **not** use EAS Build, Expo's cloud build service, or Expo Go.

## 1. Before you build

### Install local prerequisites

1. Install Node.js and run `npm install` in the project root.
2. Install Android Studio. In **SDK Manager**, install Android SDK Platform 36, Android SDK Build-Tools 36.0.0, and Android SDK Command-line Tools.
3. Install JDK 17. Set `JAVA_HOME` to that JDK and put `%JAVA_HOME%\\bin` on `PATH`.
4. Create `android/local.properties` as described below so Gradle can find the Android SDK.

Confirm the setup in PowerShell:

```powershell
java -version
adb version
npm --version
```

### Generate the native Android project

This repository ignores `android/`. On another device or fresh clone, create it after installing dependencies:

```powershell
npm run android:prebuild
```

Do not use `expo start --android` to create APKs; it starts a development server rather than packaging an artifact.

### Configure the Android SDK location

Gradle must know where the local Android SDK is installed. The usual Windows location is `C:\Users\<username>\AppData\Local\Android\Sdk`.

Create `android/local.properties` on every machine. This is local configuration; do not commit it.

**PowerShell** (from the project root):

```powershell
Set-Content android/local.properties 'sdk.dir=C\:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk'
```

**Git Bash / MINGW64** (from the project root):

```bash
printf '%s\n' 'sdk.dir=C\:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk' > android/local.properties
```

Replace `YOUR_USERNAME` with the Windows username. You may instead set `ANDROID_HOME` to the SDK directory, but `android/local.properties` keeps the Gradle configuration local to this project.

### Project configuration

- The Android application ID is `com.financeapp.app` in `app.json`. Change it to an identifier you own before publishing.
- Increment `expo.android.versionCode` in `app.json` for every Play Store upload. Change `expo.version` for the display version.
- Avoid `npx expo prebuild --clean` after customizing `android/app/build.gradle`, because it recreates `android/`. If you use it, restore the signing configuration before building releases.

### Release-signing setup (required for release APK and AAB)

A release APK/AAB must be signed with your own upload key. Keep the keystore and passwords private.

From the project root, create the keystore once:

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Create the private properties file by copying the example:

**PowerShell:**

```powershell
Copy-Item android/keystore.properties.example android/keystore.properties
```

**Git Bash:**

```bash
cp android/keystore.properties.example android/keystore.properties
```

Then edit `android/keystore.properties`:

```properties
storeFile=upload-keystore.jks
storePassword=your-keystore-password
keyAlias=upload
keyPassword=your-key-password
```

`android/app/build.gradle` loads this file for release builds. Back up `upload-keystore.jks` and its passwords securely. Never commit or share them.

## 2. Assemble the debug APK

A debug APK uses Android's standard debug keystore. It is for development and testing, not publishing.

```powershell
npm run android:apk:debug
```

Output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Install it on a connected device/emulator with USB debugging enabled:

```powershell
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## 3. Assemble the signed release APK

Complete release signing first, then run:

```powershell
npm run android:apk:release
```

Output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

The build runs locally and embeds the production JavaScript bundle. For Google Play distribution, prefer the AAB below.

## 4. Generate the signed release bundle (.aab)

Complete the same release-signing setup, then run:

```powershell
npm run android:aab:release
```

Output:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Upload the `.aab` to Google Play Console. An AAB is not installed directly with `adb`.

## Troubleshooting: issues encountered during setup

### `SDK location not found`

Example error:

```text
SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable
or by setting the sdk.dir path in android/local.properties.
```

The Android SDK was installed, but Gradle could not locate it. Create `android/local.properties` using the shell-specific command in **Configure the Android SDK location**, then rerun the build. If Gradle next reports missing packages, install Android SDK Platform 36 and Build-Tools 36.0.0 in Android Studio's SDK Manager.

### `Set-Content: command not found`

`Set-Content` is a PowerShell command. It fails in Git Bash/MINGW64. Use the Git Bash `printf` command shown above, or switch to PowerShell.

### `Missing android/keystore.properties`

Release builds deliberately fail until `android/keystore.properties` exists. Create the upload keystore and copy the example properties file as described in **Release-signing setup**. Debug builds do not need these files.

### `keytool ... FileNotFoundException: android\\app\\upload-keystore.jks`

This occurs when `keytool` runs outside the project root, so the relative `android/app/...` path does not exist. Change directory first:

```powershell
Set-Location C:\expo-app\finance-app
```

Or in Git Bash:

```bash
cd /c/expo-app/finance-app
```

Then rerun the `keytool` command. If the password confirmation does not match, `keytool` simply asks you to enter it again.

### Release signing paths and values

The `storeFile` value in `android/keystore.properties` is relative to `android/app/`. For this project use `storeFile=upload-keystore.jks` and `keyAlias=upload`. Passwords and alias values must exactly match those selected while creating the keystore.

## Useful local Gradle commands

Run these from `android/` when you need a clean rebuild or diagnostics:

```powershell
.\\gradlew.bat clean
.\\gradlew.bat assembleDebug --stacktrace
.\\gradlew.bat bundleRelease --stacktrace
```

First-time Gradle builds may download Android/Gradle dependencies, but compilation and artifact creation remain local.
