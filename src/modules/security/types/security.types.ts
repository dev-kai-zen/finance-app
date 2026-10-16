export type BiometricAuthType = "fingerprint" | "facial" | "iris";

export interface BiometricCapabilities {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: BiometricAuthType[];
  biometricLabel: string;
}

export interface SecurityConfig {
  isPasswordSet: boolean;
  isBiometricsEnabled: boolean;
  autoLockTimeoutMs: number;
}

export interface PasswordVerificationResult {
  success: boolean;
  error?: string;
}

export interface SetPasswordInput {
  newPassword: string;
  currentPassword?: string;
}

export interface BiometricAuthResult {
  success: boolean;
  errorCode?: string;
  error?: string;
}

