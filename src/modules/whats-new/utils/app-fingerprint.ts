import * as Application from "expo-application";
import Constants from "expo-constants";

export function getAppFingerprint(): string {
  const marketingVersion =
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    "0.0.0";
  const buildVersion =
    Application.nativeBuildVersion ??
    String(Constants.expoConfig?.android?.versionCode ?? "0");

  return `${marketingVersion}+${buildVersion}`;
}

export function getMarketingVersionFromFingerprint(fingerprint: string): string {
  const [marketing] = fingerprint.split("+");
  return marketing || "0.0.0";
}
