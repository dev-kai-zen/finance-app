import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { isDevModeAllowed } from "@/utils/dev-mode";
import { PRO_SECURE_KEYS } from "../constants/pro.constants";

const memoryStore = new Map<string, string>();

async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function getSecureValue(key: string): Promise<string | null> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      return await SecureStore.getItemAsync(key);
    }
  } catch (error) {
    console.warn(`[ProStorage] Error reading secure key "${key}":`, error);
  }
  return memoryStore.get(key) ?? null;
}

async function setSecureValue(key: string, value: string): Promise<void> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
      return;
    }
  } catch (error) {
    console.warn(`[ProStorage] Error writing secure key "${key}":`, error);
  }
  memoryStore.set(key, value);
}

async function deleteSecureValue(key: string): Promise<void> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
  } catch (error) {
    console.warn(`[ProStorage] Error deleting secure key "${key}":`, error);
  }
  memoryStore.delete(key);
}

export interface CachedProState {
  isPro: boolean;
  unlockedAt: string | null;
  productId: string | null;
  isDevSimulated: boolean;
}

export async function readCachedProState(): Promise<CachedProState> {
  const [isProVal, unlockedAt, productId, devSimVal] = await Promise.all([
    getSecureValue(PRO_SECURE_KEYS.IS_PRO),
    getSecureValue(PRO_SECURE_KEYS.UNLOCKED_AT),
    getSecureValue(PRO_SECURE_KEYS.PRODUCT_ID),
    getSecureValue(PRO_SECURE_KEYS.DEV_SIMULATE_PRO),
  ]);

  const devAllowed = isDevModeAllowed();
  const isDevSimulated = devAllowed && devSimVal === "true";
  const isPro = isDevSimulated || isProVal === "true";

  if (!devAllowed && devSimVal === "true") {
    void deleteSecureValue(PRO_SECURE_KEYS.DEV_SIMULATE_PRO);
  }

  return {
    isPro,
    unlockedAt,
    productId,
    isDevSimulated,
  };
}

export async function writeCachedProUnlock(productId: string): Promise<void> {
  const now = new Date().toISOString();
  await Promise.all([
    setSecureValue(PRO_SECURE_KEYS.IS_PRO, "true"),
    setSecureValue(PRO_SECURE_KEYS.UNLOCKED_AT, now),
    setSecureValue(PRO_SECURE_KEYS.PRODUCT_ID, productId),
  ]);
}

export async function clearCachedProUnlock(): Promise<void> {
  await Promise.all([
    deleteSecureValue(PRO_SECURE_KEYS.IS_PRO),
    deleteSecureValue(PRO_SECURE_KEYS.UNLOCKED_AT),
    deleteSecureValue(PRO_SECURE_KEYS.PRODUCT_ID),
  ]);
}

export async function writeDevSimulatedPro(enabled: boolean): Promise<void> {
  if (!isDevModeAllowed()) {
    await deleteSecureValue(PRO_SECURE_KEYS.DEV_SIMULATE_PRO);
    return;
  }
  if (enabled) {
    await setSecureValue(PRO_SECURE_KEYS.DEV_SIMULATE_PRO, "true");
  } else {
    await deleteSecureValue(PRO_SECURE_KEYS.DEV_SIMULATE_PRO);
  }
}
