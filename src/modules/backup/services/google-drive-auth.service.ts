import Constants from "expo-constants";
import type { OneTapUser } from "react-native-nitro-google-signin";

import type { GoogleDriveUser } from "@/modules/backup/types/backup.types";

export const GOOGLE_DRIVE_APPDATA_SCOPE =
  "https://www.googleapis.com/auth/drive.appdata";
export const GOOGLE_DRIVE_FILE_SCOPE =
  "https://www.googleapis.com/auth/drive.file";

const GOOGLE_DRIVE_SCOPES = [
  GOOGLE_DRIVE_APPDATA_SCOPE,
  GOOGLE_DRIVE_FILE_SCOPE,
];

type GoogleSignInModule = typeof import("react-native-nitro-google-signin");

let modulePromise: Promise<GoogleSignInModule> | null = null;
let configuredClientId: string | null = null;

export function getGoogleDriveConfigurationError(): string | null {
  if (process.env.EXPO_OS === "web") {
    return "Google Drive backup is currently available on Android and iOS only.";
  }

  if (isExpoGo()) {
    return "Google Drive backup requires a development build. Run `npx expo run:android` (or iOS) instead of Expo Go.";
  }

  if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()) {
    return "Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and rebuild the app to enable Google Drive backup.";
  }

  return null;
}

export async function restoreGoogleDriveSession(): Promise<GoogleDriveUser | null> {
  const google = await getConfiguredGoogleModule();
  const current = google.GoogleOneTapSignIn.getCurrentUser();
  if (!current) return null;

  await ensureGoogleDriveScopes(google, current.scopes);
  return toGoogleDriveUser(current.user);
}

export async function connectGoogleDrive(): Promise<GoogleDriveUser | null> {
  const google = await getConfiguredGoogleModule();
  await google.GoogleOneTapSignIn.checkPlayServices();

  let response = await google.GoogleOneTapSignIn.signIn();
  if (google.isNoSavedCredentialFoundResponse(response)) {
    response = await google.GoogleOneTapSignIn.createAccount();
  }
  if (google.isNoSavedCredentialFoundResponse(response)) {
    response = await google.GoogleOneTapSignIn.presentExplicitSignIn();
  }
  if (google.isCancelledResponse(response)) return null;
  if (!google.isSuccessResponse(response)) {
    throw new Error("Google sign-in could not be completed.");
  }

  await ensureGoogleDriveScopes(google, response.data.scopes);

  return toGoogleDriveUser(response.data.user);
}

export async function disconnectGoogleDrive(): Promise<void> {
  const google = await getConfiguredGoogleModule();
  await google.GoogleOneTapSignIn.signOut();
}

export async function withGoogleDriveAccessToken<T>(
  operation: (accessToken: string) => Promise<T>,
): Promise<T> {
  const google = await getConfiguredGoogleModule();
  let { accessToken } = await google.GoogleOneTapSignIn.getTokens();

  try {
    return await operation(accessToken);
  } catch (error) {
    if (!isUnauthorizedError(error)) throw error;
    await google.GoogleOneTapSignIn.clearCachedAccessToken(accessToken);
    ({ accessToken } = await google.GoogleOneTapSignIn.getTokens());
    return operation(accessToken);
  }
}

async function getConfiguredGoogleModule(): Promise<GoogleSignInModule> {
  const configurationError = getGoogleDriveConfigurationError();
  if (configurationError) throw new Error(configurationError);

  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!.trim();
  modulePromise ??= import("react-native-nitro-google-signin").catch((error) => {
    modulePromise = null;
    throw new Error(getNativeModuleErrorMessage(error));
  });
  const google = await modulePromise;

  if (configuredClientId !== clientId) {
    google.GoogleOneTapSignIn.configure({
      webClientId: clientId,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || null,
      scopes: GOOGLE_DRIVE_SCOPES,
      offlineAccess: false,
      autoSelectOnSignIn: false,
    });
    configuredClientId = clientId;
  }

  return google;
}

async function ensureGoogleDriveScopes(
  google: GoogleSignInModule,
  grantedScopes: string[],
): Promise<void> {
  const missingScopes = GOOGLE_DRIVE_SCOPES.filter(
    (scope) => !grantedScopes.includes(scope),
  );
  if (missingScopes.length === 0) return;

  const authorization =
    await google.GoogleOneTapSignIn.requestScopes(missingScopes);
  if (!authorization.accessToken) {
    throw new Error(
      "Google Drive permission is required to create the visible backup folder.",
    );
  }
}

function toGoogleDriveUser(user: OneTapUser): GoogleDriveUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

function isUnauthorizedError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 401
  );
}

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo" || Constants.expoVersion != null;
}

function getNativeModuleErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes("NitroModules")) {
    return "Google Sign-In native modules are missing. Run `npx expo run:android` (or iOS) after changing native dependencies.";
  }

  if (error instanceof Error && error.message) return error.message;
  return "Google Sign-In native modules could not be loaded.";
}
