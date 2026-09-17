# React Native Expo --- Windows Local Android Release Build Setup

This guide documents the Windows setup that worked for building the
**Kaizen Finance** React Native Expo app locally as an Android APK/AAB.
Its main purpose is to avoid the Windows/CMake/Ninja **260-character
path** problem we encountered during native release builds.

## 1. Recommended project location

Keep the repository path short. For example:

``` text
C:\expo-repo\finance-app
```

Avoid deeply nested locations such as Desktop/Documents/OneDrive folders
with long parent paths. React Native native dependencies, Gradle,
Prefab, CMake, and Ninja can generate very long paths internally.

## 2. Required software

Install these before building:

-   Node.js (version compatible with the Expo SDK used by the project)
-   Git
-   Android Studio
-   Android SDK / Build Tools required by the project
-   Android SDK Platform required by the project
-   Android NDK required by the project
-   CMake required by the project
-   JDK 17

For the configuration that successfully built this project, Gradle
reported:

``` text
Gradle:      9.3.1
JDK:         17
Build Tools: 36.0.0
minSdk:      24
compileSdk:  36
targetSdk:   36
NDK:         27.1.12297006
Kotlin:      2.1.20
```

The project itself should remain the source of truth for SDK/package
versions. Do not manually change versions simply to match this document
if the project has since been upgraded.

## 3. Enable Windows long paths

Run PowerShell as Administrator and check:

``` powershell
Get-ItemProperty `
  -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name LongPathsEnabled
```

Expected:

``` text
LongPathsEnabled : 1
```

If it is already `1`, no change is needed.

> Long-path support helps Windows applications, but it does not
> guarantee that every native tool handles paths over 260 characters.
> Ninja/CMake can still encounter path-length problems, which is why the
> short Gradle home below is important.

## 4. Use a short Gradle user home

This was the critical fix for our build.

Do **not** put Gradle's user home inside the repository, such as:

``` text
C:\expo-repo\finance-app\.gradle-user-home
```

Also avoid long temporary locations such as:

``` text
C:\Users\<USER>\AppData\Local\Temp\finance-app-gradle
```

Use a very short location instead:

``` text
C:\g
```

For the current PowerShell session:

``` powershell
$env:GRADLE_USER_HOME="C:\g"
```

Verify:

``` powershell
echo $env:GRADLE_USER_HOME
```

Expected:

``` text
C:\g
```

### Optional: make it persistent for your Windows user

Once the setup has been confirmed working on the new machine:

``` powershell
[Environment]::SetEnvironmentVariable(
  "GRADLE_USER_HOME",
  "C:\g",
  "User"
)
```

Close and reopen PowerShell afterward, then verify again:

``` powershell
echo $env:GRADLE_USER_HOME
```

## 5. Clone and install the project

Example:

``` powershell
cd C:\expo-repo
git clone <YOUR_REPOSITORY_URL> finance-app
cd finance-app
npm install
```

Do not manually modify files inside `node_modules` to fix build
warnings.

## 6. Verify Java and Gradle

From the Android directory:

``` powershell
cd C:\expo-repo\finance-app\android
java -version
.\gradlew --version
```

Confirm that JDK 17 is being used.

Also verify the Gradle home before building:

``` powershell
echo $env:GRADLE_USER_HOME
```

It should be:

``` text
C:\g
```

## 7. Build a release APK

From the same PowerShell session:

``` powershell
cd C:\expo-repo\finance-app\android
$env:GRADLE_USER_HOME="C:\g"
$env:NODE_ENV="production"
.\gradlew assembleRelease --no-daemon
```

A successful build ends with:

``` text
BUILD SUCCESSFUL
```

The APK is normally generated at:

``` text
C:\expo-repo\finance-app\android\app\build\outputs\apk\release\app-release.apk
```

Verify it with:

``` powershell
Get-Item .\app\build\outputs\apk\release\app-release.apk
```

## 8. Build an Android App Bundle (AAB)

For Google Play distribution:

``` powershell
cd C:\expo-repo\finance-app\android
$env:GRADLE_USER_HOME="C:\g"
$env:NODE_ENV="production"
.\gradlew bundleRelease --no-daemon
```

The AAB is normally generated at:

``` text
C:\expo-repo\finance-app\android\app\build\outputs\bundle\release\app-release.aab
```

Release signing must also be configured correctly before publishing to
Google Play.

## 9. The path-length failure we encountered

Our release build originally failed during native C++ compilation with
errors similar to:

``` text
ninja: error: Stat(...): Filename longer than 260 characters
```

The failing React Native Prefab dependency was being resolved through a
long Gradle cache path similar to:

``` text
C:\Users\<USER>\AppData\Local\Temp\finance-app-gradle\caches\9.3.1\transforms\...\react-android-...\prefab\...
```

The JavaScript/Metro bundle itself completed successfully. The failure
occurred later in native CMake/Ninja tasks such as
`react-native-screens` and `expo-modules-core`.

Changing `GRADLE_USER_HOME` to `C:\g` was necessary, but old generated
CMake files still contained the previous absolute Gradle cache path.
Therefore those generated caches also had to be cleared.

## 10. Recovery procedure for a stale Gradle/CMake path

Only use this section if a build reports an old Gradle path or a
`Filename longer than 260 characters` Ninja error.

### Step 1 --- Stop Gradle

``` powershell
cd C:\expo-repo\finance-app\android
.\gradlew --stop
```

### Step 2 --- Confirm the desired Gradle home

``` powershell
$env:GRADLE_USER_HOME="C:\g"
echo $env:GRADLE_USER_HOME
```

### Step 3 --- Remove generated `.cxx` directories

From the project root:

``` powershell
cd C:\expo-repo\finance-app

Get-ChildItem .\node_modules -Directory -Recurse -Force -ErrorAction SilentlyContinue |
Where-Object { $_.Name -eq ".cxx" } |
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Remove-Item -Recurse -Force .\android\app\.cxx -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\android\.cxx -ErrorAction SilentlyContinue
```

These `.cxx` directories are generated native build state. This
procedure does not edit package source files.

### Step 4 --- Remove generated build outputs containing stale native configuration

``` powershell
Remove-Item -Recurse -Force .\android\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\android\app\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\node_modules\expo-modules-core\android\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\node_modules\react-native-screens\android\build -ErrorAction SilentlyContinue
```

### Step 5 --- Remove an obsolete temporary Gradle home, if it exists

First check:

``` powershell
Test-Path "$env:TEMP\finance-app-gradle"
```

If it is an obsolete Gradle home from an earlier setup, stop Gradle
first and remove it:

``` powershell
Remove-Item -Recurse -Force "$env:TEMP\finance-app-gradle" -ErrorAction SilentlyContinue
```

Verify:

``` powershell
Test-Path "$env:TEMP\finance-app-gradle"
```

Expected:

``` text
False
```

### Step 6 --- Search for stale references

``` powershell
Get-ChildItem `
  .\android, .\node_modules `
  -Recurse -File `
  -Include *.txt,*.cmake,*.json,*.properties,*.ninja `
  -ErrorAction SilentlyContinue |
Select-String -Pattern "finance-app-gradle" |
Select-Object Path, LineNumber, Line
```

For our issue, the correct result after cleanup was **no output**.

### Step 7 --- Rebuild

``` powershell
cd C:\expo-repo\finance-app\android
$env:NODE_ENV="production"
.\gradlew assembleRelease --no-daemon
```

The regenerated native build should now use paths beginning with:

``` text
C:\g\caches\...
```

instead of the obsolete long temporary Gradle path.

## 11. Warnings that were not the cause

During the successful troubleshooting process we also saw warnings
about:

-   `NODE_ENV` not being specified
-   deprecated React Native APIs
-   `react-native-safe-area-context` manifest namespace/package
    configuration
-   deprecated Gradle features and future Gradle 10 compatibility

These warnings should be reviewed separately, but they were **not** the
cause of the Ninja 260-character filename failure.

Do not edit package files in `node_modules` merely to silence these
warnings.

## 12. Rules for AI-assisted build troubleshooting

When using an AI coding assistant on this project, use these
constraints:

1.  Diagnose the exact build error before modifying files.
2.  Do not modify `node_modules` package source code.
3.  Do not change Gradle, Expo, React Native, NDK, CMake, or SDK
    versions without evidence that version compatibility is the problem.
4.  Do not recreate the `android` folder as the first troubleshooting
    step.
5.  Do not create custom Gradle homes inside the repository.
6.  Treat `.cxx`, Gradle caches, and Android `build` directories as
    generated output; source/configuration files are different.
7.  Prefer reversible environment/configuration changes before
    destructive changes.
8.  After a path-related failure, search generated files for the
    obsolete absolute path before rebuilding repeatedly.

## Quick setup checklist

-   [ ] Repository stored in a short path such as
    `C:\expo-repo\finance-app`
-   [ ] JDK 17 installed
-   [ ] Android Studio and required Android SDK components installed
-   [ ] Windows `LongPathsEnabled` is `1`
-   [ ] `GRADLE_USER_HOME` is `C:\g`
-   [ ] `NODE_ENV=production` for direct release builds
-   [ ] Dependencies installed with the project's package manager
-   [ ] `java -version` and `.\gradlew --version` work
-   [ ] No obsolete `finance-app-gradle` path is being injected
-   [ ] Build APK with `.\gradlew assembleRelease --no-daemon`
-   [ ] Build AAB with `.\gradlew bundleRelease --no-daemon`

------------------------------------------------------------------------

**Key lesson:** On Windows, keeping both the repository and Gradle cache
paths short is important for React Native/Expo native builds. If the
Gradle home is changed after CMake has already configured native
modules, clear the generated `.cxx`/native build state so CMake and
Ninja do not continue using stale absolute paths.
