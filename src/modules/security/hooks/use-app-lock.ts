import { useCallback, useEffect, useState } from "react";
import { appLockLifecycle } from "../services/app-lock-lifecycle.service";
import {
  authenticateWithBiometrics,
  getBiometricCapabilities,
} from "../services/biometrics.service";
import {
  getSecurityConfig,
  verifyCurrentPassword,
} from "../services/security-state.service";
import type {
  BiometricCapabilities,
  SecurityConfig,
} from "../types/security.types";

const DEFAULT_CONFIG: SecurityConfig = {
  isPasswordSet: false,
  isBiometricsEnabled: false,
  autoLockTimeoutMs: 0,
};

const DEFAULT_BIOMETRICS: BiometricCapabilities = {
  hasHardware: false,
  isEnrolled: false,
  supportedTypes: [],
  biometricLabel: "Fingerprint",
};

export function useAppLock() {
  const [isLocked, setIsLocked] = useState(appLockLifecycle.getIsLocked());
  const [isReady, setIsReady] = useState(false);
  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_CONFIG);
  const [biometrics, setBiometrics] =
    useState<BiometricCapabilities>(DEFAULT_BIOMETRICS);

  const refreshState = useCallback(async () => {
    const [freshConfig, freshBiometrics] = await Promise.all([
      getSecurityConfig(),
      getBiometricCapabilities(),
    ]);

    setConfig(freshConfig);
    setBiometrics(freshBiometrics);

    if (!freshConfig.isPasswordSet) {
      appLockLifecycle.unlock();
      setIsLocked(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const [freshConfig, freshBiometrics] = await Promise.all([
        getSecurityConfig(),
        getBiometricCapabilities(),
      ]);

      if (!mounted) return;
      setConfig(freshConfig);
      setBiometrics(freshBiometrics);

      await appLockLifecycle.initialize();
      if (!mounted) return;
      setIsReady(true);
    }

    void init();

    const unsubscribe = appLockLifecycle.subscribe((locked) => {
      if (mounted) {
        setIsLocked(locked);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const unlockWithPassword = useCallback(async (password: string) => {
    const verification = await verifyCurrentPassword(password);
    if (verification.success) {
      appLockLifecycle.unlock();
      return { success: true };
    }
    return { success: false, error: verification.error ?? "Incorrect password" };
  }, []);

  const unlockWithBiometrics = useCallback(async () => {
    if (!config.isBiometricsEnabled || !biometrics.hasHardware || !biometrics.isEnrolled) {
      return { success: false, error: "Biometrics not available" };
    }

    const auth = await authenticateWithBiometrics(
      "Unlock Kaizen Finance",
      "Use Password",
    );

    if (auth.success) {
      appLockLifecycle.unlock();
      return { success: true };
    }

    return { success: false, errorCode: auth.errorCode, error: auth.error };
  }, [config.isBiometricsEnabled, biometrics.hasHardware, biometrics.isEnrolled]);

  const lockNow = useCallback(() => {
    if (config.isPasswordSet) {
      appLockLifecycle.lock();
    }
  }, [config.isPasswordSet]);

  return {
    isLocked: isReady && config.isPasswordSet ? isLocked : false,
    isReady,
    config,
    biometrics,
    unlockWithPassword,
    unlockWithBiometrics,
    lockNow,
    refreshState,
  };
}
