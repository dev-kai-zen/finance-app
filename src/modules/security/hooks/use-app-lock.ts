import { useCallback, useEffect, useRef, useState } from "react";
import { appLockLifecycle } from "../services/app-lock-lifecycle.service";
import {
  authenticateWithBiometrics,
  getBiometricCapabilities,
} from "../services/biometrics.service";
import {
  getSecurityConfig,
  subscribeSecurityConfigChanged,
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
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const [isLocked, setIsLocked] = useState(appLockLifecycle.getIsLocked());
  const [isReady, setIsReady] = useState(false);
  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_CONFIG);
  const [biometrics, setBiometrics] =
    useState<BiometricCapabilities>(DEFAULT_BIOMETRICS);

  const refreshState = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const [freshConfig, freshBiometrics] = await Promise.all([
      getSecurityConfig(),
      getBiometricCapabilities(),
    ]);

    if (!mountedRef.current || requestId !== requestIdRef.current) return;

    setConfig(freshConfig);
    setBiometrics(freshBiometrics);

    if (!freshConfig.isPasswordSet) {
      appLockLifecycle.unlock();
      setIsLocked(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const unsubscribeConfig = subscribeSecurityConfigChanged(() => {
      void refreshState().catch((error) => {
        console.warn("[useAppLock] Error refreshing security configuration:", error);
      });
    });

    async function init() {
      await refreshState();
      if (!mountedRef.current) return;

      await appLockLifecycle.initialize();
      if (!mountedRef.current) return;
      setIsReady(true);
    }

    void init();

    const unsubscribe = appLockLifecycle.subscribe((locked) => {
      if (mountedRef.current) {
        setIsLocked(locked);
      }
    });

    return () => {
      mountedRef.current = false;
      ++requestIdRef.current;
      unsubscribeConfig();
      unsubscribe();
    };
  }, [refreshState]);

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
