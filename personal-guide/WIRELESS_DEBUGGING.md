# Wireless debugging for dev and release

Use this when the phone and PC are on the same Wi-Fi and you want to run Kaizen Finance without a USB cable.

There are two different workflows:

| Goal | Command | What you get |
| --- | --- | --- |
| Everyday coding | `npm run android`, then `npm start` on later days | Debug app. Save a file and the phone updates. No new APK for ordinary screen, style, or logic changes. |
| Check the real install | `npm run android:apk:release` | Release APK. JavaScript is packed inside the file. Every change needs a new build and install. |
| Release build with in-app developer tools | `npm run android:apk:dev` | Also a release APK. Same limitation: no live reload. Developer tools are unlocked because `EXPO_PUBLIC_ENABLE_DEV_MODE=true` was set at build time. |

Debug and release share the package name `com.kaizen.finance.app`, so installing one removes the other. A debug session also feels slower than release. That is expected: the debug app keeps extra checks on and stays connected to the dev server. Judge speed from a release APK.

Prerequisites (Android SDK, JDK 17, `adb` on `PATH`, a generated `android/` folder) are in [NEW-DEVICE-SETUP.md](./NEW-DEVICE-SETUP.md) and [LOCAL_ANDROID_BUILDS.md](./LOCAL_ANDROID_BUILDS.md).

## 1. Pair the phone once

Android 11 or newer. Phone and PC must be on the same Wi-Fi. A guest network that isolates devices will not work.

1. On the phone, open **Settings → Developer options → Wireless debugging** and turn it on.
2. Tap **Pair device with pairing code**. Leave that screen open. It shows an IP address, a **pairing** port, and a 6-digit code.
3. On the PC, from the project root:

```bash
adb pair 10.10.3.2:44483
```

Use the IP and port from the pairing screen, then type the 6-digit code. A successful pair looks like:

```text
Successfully paired to 10.10.3.2:44483
```

The numbers above are an example from one session. They change. Always copy what the phone shows.

## 2. Connect with the other port

The pairing port closes as soon as pairing succeeds. Connecting to that same port fails:

```text
cannot connect to 10.10.3.2:44483: No connection could be made because the target machine actively refused it. (10061)
```

Close the pairing dialog and look at the main **Wireless debugging** screen. Under the phone name there is a second line, with a different port:

```text
10.10.3.2:37845
```

Connect with that line:

```bash
adb connect 10.10.3.2:37845
adb devices
```

`adb devices` must list the phone as `device` before you continue. If `adb` is not found, it is usually at `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`.

You only pair once. After a reboot, or after Wireless debugging is turned off, open that screen again and run `adb connect` with the IP and port shown there. The connection port often changes. The pairing code is only needed again if the computer was forgotten.

## 3. Dev: hot reload

With the phone listed in `adb devices`:

```bash
npm run android
```

This is `expo run:android`. The first run compiles the native debug app, which takes several minutes (about 8 minutes on a clean build), then Metro starts and installs:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Unlock the phone. Kaizen Finance opens when the install finishes. If it stays on the home screen, open the app manually.

Leave that terminal open. Saving a file reloads the phone. Developer tools are already available in this build, because debug mode turns them on. You do not need `npm run android:apk:dev` for that.

The next day, connect and start Metro only:

```bash
adb connect 10.10.3.2:37845
npm start
```

Then open Kaizen Finance on the phone. If the app cannot find the computer, run this once while the phone is connected, then reload:

```bash
adb reverse tcp:8081 tcp:8081
```

If Windows Firewall asks, allow Node.js on private networks.

Run `npm run android` again only when native code changed: a new native package, an Expo plugin change in `app.json` or `app.config.ts`, or a change under `android/`. Ordinary screen and logic edits do not need a rebuild.

## 4. Release: still a full build

Connect first, then build and install. A release APK cannot hot-reload.

Production install:

```bash
adb connect 10.10.3.2:37845
npm run android:apk:release
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Release build with in-app developer tools unlocked:

```bash
npm run android:apk:dev
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

`npm run android:apk:dev` runs `assembleRelease` with `EXPO_PUBLIC_ENABLE_DEV_MODE=true`. It is for checking release behavior while those tools stay available. It is not a live-reload session. Play Store builds use `npm run android:aab:release`, which keeps those tools locked. See [LOCAL_ANDROID_BUILDS.md](./LOCAL_ANDROID_BUILDS.md) for signing and the AAB output path.

Either release install removes the debug app. To get instant updates back:

```bash
npm run android
```

## 5. What to use when

- Editing screens or logic: debug app, Metro left running.
- Confirming speed, signing, or the install a user would get: `npm run android:apk:release`.
- Checking developer tools inside a release binary: `npm run android:apk:dev`.
- Back to coding: `npm run android` once, so the debug app is installed again.
