# Google Drive Backup Setup

The implementation stores encrypted `.kfb` snapshots in the signed-in user's
visible `Kaizen Finance/Backups` folder. The app uses the non-sensitive
`drive.file` scope so it can manage only the files it creates. It temporarily
retains `drive.appdata` access to discover and copy backups created by older
versions of the app.

## Google Cloud

1. Create or select a Google Cloud project.
2. Enable the **Google Drive API**.
3. Configure the OAuth consent screen. Add
   `https://www.googleapis.com/auth/drive.file` and
   `https://www.googleapis.com/auth/drive.appdata`, then add your Google account
   as a test user while the app is in testing mode.
4. Create a **Web application** OAuth client. Copy its client ID into a local
   `.env.local` file as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
5. Create an **Android** OAuth client with package name
   `com.kaizen.finance.app` and the SHA-1 fingerprint for every certificate that
   signs the app (debug, release/upload, and Play App Signing when applicable).

Copy `.env.example` to `.env.local` and replace the placeholder. OAuth client
IDs are public identifiers; do not put a client secret in the app.

## Android debug SHA-1

For the generated local debug keystore, run from the repository root:

```powershell
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

After changing OAuth or native configuration, rebuild the native app. Google
Sign-In does not run in Expo Go:

```powershell
npx expo run:android
```

## iOS before building

Create an iOS OAuth client for the final bundle identifier, set
`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and replace the temporary
`iosUrlScheme` in `app.json` with the client's reversed ID:

```text
Client ID:       123-example.apps.googleusercontent.com
iosUrlScheme:    com.googleusercontent.apps.123-example
```

The placeholder URL scheme lets Android prebuilds run, but it is intentionally
not valid for iOS authentication.

## Backup behavior

- The app creates `Kaizen Finance/Backups` automatically and provides an action
  to open it in Google Drive.
- Existing hidden backups are copied to the visible folder without decrypting
  them. Hidden originals are retained as a safety fallback.
- Drive folder IDs and private app properties are used for discovery, so users
  may rename the visible folders without breaking backup or restore.
- The passphrase is never stored or uploaded.
- Scrypt derives a unique AES-256 key for each backup.
- AES-GCM encrypts and authenticates the SQLite snapshot and its metadata.
- Restore validates the encrypted archive, SHA-256 checksum, SQLite integrity,
  expected tables, migrations, and foreign keys before keeping the replacement.
- If replacement validation fails, the app restores an in-memory safety copy of
  the current local database.
