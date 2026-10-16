import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";
import type {
  BiometricAuthType,
  BiometricCapabilities,
} from "../types/security.types";

/**
 * Checks hardware capabilities and user enrollment for biometric authentication.
 */
export async function getBiometricCapabilities(): Promise<BiometricCapabilities> {
  if (Platform.OS === "web") {
    return {
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      biometricLabel: "Fingerprint",
    };
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = hasHardware
      ? await LocalAuthentication.isEnrolledAsync()
      : false;
    const types = hasHardware
      ? await LocalAuthentication.supportedAuthenticationTypesAsync()
      : [];

    const supportedTypes: BiometricAuthType[] = [];
    let hasFingerprint = false;
    let hasFacial = false;

    for (const t of types) {
      if (t === LocalAuthentication.AuthenticationType.FINGERPRINT) {
        supportedTypes.push("fingerprint");
        hasFingerprint = true;
      } else if (
        t === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      ) {
        supportedTypes.push("facial");
        hasFacial = true;
      } else if (t === LocalAuthentication.AuthenticationType.IRIS) {
        supportedTypes.push("iris");
      }
    }

    let biometricLabel = "Fingerprint";
    if (Platform.OS === "ios" && hasFacial) {
      biometricLabel = "Face ID";
    } else if (hasFingerprint && hasFacial) {
      biometricLabel = "Biometrics";
    } else if (hasFingerprint) {
      biometricLabel = "Fingerprint";
    } else if (hasFacial) {
      biometricLabel = "Face Recognition";
    }

    return {
      hasHardware,
      isEnrolled,
      supportedTypes,
      biometricLabel,
    };
  } catch (error) {
    console.warn("[Biometrics] Error querying capabilities:", error);
    return {
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      biometricLabel: "Fingerprint",
    };
  }
}

/**
 * Prompts the user with native biometric authentication.
 * Uses disableDeviceFallback: true so failure delegates to in-app password instead of OS passcode.
 */
export async function authenticateWithBiometrics(
  promptMessage = "Unlock Kaizen Finance",
  fallbackLabel = "Use Password",
): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === "web") {
    return { success: false, error: "Biometrics not supported on web" };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel,
      cancelLabel: "Cancel",
      disableDeviceFallback: true,
    });

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error || "Authentication cancelled",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}
