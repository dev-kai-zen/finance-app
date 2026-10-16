import {
  deleteSecureItem,
  getSecureItem,
  setSecureItem,
  SECURE_STORAGE_KEYS,
} from "../repositories/secure-storage.repository";
import {
  generateSalt,
  hashPassword,
  verifyPasswordHash,
} from "./security-crypto.service";
import {
  authenticateWithBiometrics,
  getBiometricCapabilities,
} from "./biometrics.service";
import type {
  PasswordVerificationResult,
  SecurityConfig,
} from "../types/security.types";

/**
 * Retrieves the current security configuration from secure storage.
 */
export async function getSecurityConfig(): Promise<SecurityConfig> {
  const [hash, biometricsRaw, timeoutRaw] = await Promise.all([
    getSecureItem(SECURE_STORAGE_KEYS.PASSWORD_HASH),
    getSecureItem(SECURE_STORAGE_KEYS.BIOMETRICS_ENABLED),
    getSecureItem(SECURE_STORAGE_KEYS.AUTO_LOCK_TIMEOUT_MS),
  ]);

  const isPasswordSet = Boolean(hash && hash.length > 0);
  // Biometrics cannot be enabled without a password
  const isBiometricsEnabled = isPasswordSet && biometricsRaw === "true";
  const autoLockTimeoutMs = timeoutRaw ? parseInt(timeoutRaw, 10) : 0;

  return {
    isPasswordSet,
    isBiometricsEnabled,
    autoLockTimeoutMs: Number.isNaN(autoLockTimeoutMs) ? 0 : autoLockTimeoutMs,
  };
}

/**
 * Verifies if candidate password matches the stored password.
 */
export async function verifyCurrentPassword(
  candidate: string,
): Promise<PasswordVerificationResult> {
  const [storedHash, salt] = await Promise.all([
    getSecureItem(SECURE_STORAGE_KEYS.PASSWORD_HASH),
    getSecureItem(SECURE_STORAGE_KEYS.PASSWORD_SALT),
  ]);

  if (!storedHash || !salt) {
    return { success: false, error: "No password has been set." };
  }

  const isValid = await verifyPasswordHash(candidate, salt, storedHash);
  if (!isValid) {
    return { success: false, error: "Incorrect password." };
  }

  return { success: true };
}

/**
 * Sets a new password. If a password is already configured, requires the correct currentPassword.
 */
export async function setPassword(
  newPassword: string,
  currentPassword?: string,
  options?: { skipCurrentPasswordVerification?: boolean },
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.trim().length === 0) {
    return { success: false, error: "Password cannot be empty." };
  }

  const existingHash = await getSecureItem(SECURE_STORAGE_KEYS.PASSWORD_HASH);
  if (existingHash && !options?.skipCurrentPasswordVerification) {
    if (!currentPassword) {
      return {
        success: false,
        error: "Current password is required to change password.",
      };
    }
    const verification = await verifyCurrentPassword(currentPassword);
    if (!verification.success) {
      return { success: false, error: verification.error ?? "Incorrect current password." };
    }
  }

  const salt = await generateSalt();
  const hash = await hashPassword(newPassword, salt);

  await Promise.all([
    setSecureItem(SECURE_STORAGE_KEYS.PASSWORD_HASH, hash),
    setSecureItem(SECURE_STORAGE_KEYS.PASSWORD_SALT, salt),
  ]);

  return { success: true };
}

/**
 * Removes the configured password and disables biometrics.
 */
export async function removePassword(
  currentPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const verification = await verifyCurrentPassword(currentPassword);
  if (!verification.success) {
    return { success: false, error: verification.error ?? "Incorrect password." };
  }

  await Promise.all([
    deleteSecureItem(SECURE_STORAGE_KEYS.PASSWORD_HASH),
    deleteSecureItem(SECURE_STORAGE_KEYS.PASSWORD_SALT),
    deleteSecureItem(SECURE_STORAGE_KEYS.BIOMETRICS_ENABLED),
  ]);

  return { success: true };
}

/**
 * Enables or disables biometric authentication.
 * Enabling requires a password to be set and hardware verification.
 */
export async function setBiometricsEnabled(
  enabled: boolean,
): Promise<{ success: boolean; error?: string }> {
  if (!enabled) {
    await setSecureItem(SECURE_STORAGE_KEYS.BIOMETRICS_ENABLED, "false");
    return { success: true };
  }

  // Enabling biometrics requires a password first
  const config = await getSecurityConfig();
  if (!config.isPasswordSet) {
    return {
      success: false,
      error: "You must set a password before enabling fingerprint authentication.",
    };
  }

  const capabilities = await getBiometricCapabilities();
  if (!capabilities.hasHardware) {
    return {
      success: false,
      error: "This device does not support biometric authentication.",
    };
  }

  if (!capabilities.isEnrolled) {
    return {
      success: false,
      error:
        "No biometrics enrolled. Please set up a fingerprint in device settings.",
    };
  }

  // Prompt the user to confirm biometric enrollment right now
  const prompt = await authenticateWithBiometrics(
    "Verify fingerprint to enable biometric unlock",
  );

  if (!prompt.success) {
    return {
      success: false,
      error: prompt.error ?? "Biometric verification failed.",
    };
  }

  await setSecureItem(SECURE_STORAGE_KEYS.BIOMETRICS_ENABLED, "true");
  return { success: true };
}

/**
 * Resets the password using biometric authentication instead of current password.
 */
export async function resetPasswordWithBiometrics(
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.trim().length === 0) {
    return { success: false, error: "Password cannot be empty." };
  }

  const config = await getSecurityConfig();
  if (!config.isBiometricsEnabled) {
    return {
      success: false,
      error: "Biometric unlock is not enabled.",
    };
  }

  const auth = await authenticateWithBiometrics(
    "Verify fingerprint to reset password",
  );

  if (!auth.success) {
    return {
      success: false,
      error: auth.error ?? "Biometric authentication failed.",
    };
  }

  return setPassword(newPassword, undefined, {
    skipCurrentPasswordVerification: true,
  });
}

/**
 * Removes the configured password using biometric authentication instead of current password.
 */
export async function removePasswordWithBiometrics(): Promise<{
  success: boolean;
  error?: string;
}> {
  const config = await getSecurityConfig();
  if (!config.isBiometricsEnabled) {
    return {
      success: false,
      error: "Biometric unlock is not enabled.",
    };
  }

  const auth = await authenticateWithBiometrics(
    "Verify fingerprint to remove password",
  );

  if (!auth.success) {
    return {
      success: false,
      error: auth.error ?? "Biometric authentication failed.",
    };
  }

  await Promise.all([
    deleteSecureItem(SECURE_STORAGE_KEYS.PASSWORD_HASH),
    deleteSecureItem(SECURE_STORAGE_KEYS.PASSWORD_SALT),
    deleteSecureItem(SECURE_STORAGE_KEYS.BIOMETRICS_ENABLED),
  ]);

  return { success: true };
}

/**
 * Clears all security credentials (password hash, salt, biometrics preference, auto-lock timeout)
 * from secure storage. Used during emergency reset.
 */
export async function clearAllSecurityCredentials(): Promise<void> {
  await Promise.all([
    deleteSecureItem(SECURE_STORAGE_KEYS.PASSWORD_HASH),
    deleteSecureItem(SECURE_STORAGE_KEYS.PASSWORD_SALT),
    deleteSecureItem(SECURE_STORAGE_KEYS.BIOMETRICS_ENABLED),
    deleteSecureItem(SECURE_STORAGE_KEYS.AUTO_LOCK_TIMEOUT_MS),
  ]);
}
