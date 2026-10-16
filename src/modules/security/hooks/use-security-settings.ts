import { useCallback, useEffect, useState } from "react";
import { appLockLifecycle } from "../services/app-lock-lifecycle.service";
import { getBiometricCapabilities } from "../services/biometrics.service";
import {
  getSecurityConfig,
  removePassword,
  setBiometricsEnabled,
  setPassword,
} from "../services/security-state.service";
import type {
  BiometricCapabilities,
  SecurityConfig,
} from "../types/security.types";

export function useSecuritySettings() {
  const [config, setConfig] = useState<SecurityConfig>({
    isPasswordSet: false,
    isBiometricsEnabled: false,
    autoLockTimeoutMs: 0,
  });
  const [biometrics, setBiometrics] = useState<BiometricCapabilities>({
    hasHardware: false,
    isEnrolled: false,
    supportedTypes: [],
    biometricLabel: "Fingerprint",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [freshConfig, freshBiometrics] = await Promise.all([
        getSecurityConfig(),
        getBiometricCapabilities(),
      ]);
      setConfig(freshConfig);
      setBiometrics(freshBiometrics);
    } catch (e) {
      console.warn("[useSecuritySettings] Error refreshing:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const savePassword = useCallback(
    async (newPassword: string, currentPassword?: string) => {
      setBusy(true);
      setError(null);
      try {
        const result = await setPassword(newPassword, currentPassword);
        if (!result.success) {
          setError(result.error ?? "Failed to save password.");
          return false;
        }
        await refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const deletePassword = useCallback(
    async (currentPassword: string) => {
      setBusy(true);
      setError(null);
      try {
        const result = await removePassword(currentPassword);
        if (!result.success) {
          setError(result.error ?? "Failed to remove password.");
          return false;
        }
        appLockLifecycle.unlock();
        await refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const toggleBiometrics = useCallback(
    async (enable: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const result = await setBiometricsEnabled(enable);
        if (!result.success) {
          setError(result.error ?? "Failed to update fingerprint settings.");
          return false;
        }
        await refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return {
    config,
    biometrics,
    loading,
    busy,
    error,
    clearError: () => setError(null),
    refresh,
    savePassword,
    deletePassword,
    toggleBiometrics,
  };
}
