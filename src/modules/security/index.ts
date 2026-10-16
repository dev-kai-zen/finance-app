export { AppLockGate } from "./components/app-lock-gate";
export { ForgotPasswordModal } from "./components/forgot-password-modal";
export { LockScreen } from "./components/lock-screen";
export { SecuritySettingsModal } from "./components/security-settings-modal";
export { useAppLock } from "./hooks/use-app-lock";
export { useSecuritySettings } from "./hooks/use-security-settings";
export {
  getSecurityConfig,
  verifyCurrentPassword,
  setPassword,
  resetPasswordWithBiometrics,
  removePassword,
  removePasswordWithBiometrics,
  clearAllSecurityCredentials,
  setBiometricsEnabled,
} from "./services/security-state.service";
export {
  authenticateWithBiometrics,
  getBiometricCapabilities,
} from "./services/biometrics.service";
export { appLockLifecycle } from "./services/app-lock-lifecycle.service";
export type {
  BiometricAuthType,
  BiometricCapabilities,
  SecurityConfig,
  PasswordVerificationResult,
  SetPasswordInput,
} from "./types/security.types";
