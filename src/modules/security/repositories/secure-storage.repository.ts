import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const SECURE_STORAGE_KEYS = {
  PASSWORD_HASH: "kaizen_security_password_hash",
  PASSWORD_SALT: "kaizen_security_password_salt",
  BIOMETRICS_ENABLED: "kaizen_security_biometrics_enabled",
  AUTO_LOCK_TIMEOUT_MS: "kaizen_security_auto_lock_timeout_ms",
} as const;

// In-memory fallback for environments where SecureStore is unavailable (e.g., node tests or web without native keychain)
const memoryStore = new Map<string, string>();

async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      return await SecureStore.getItemAsync(key);
    }
  } catch (error) {
    console.warn(`[SecureStorage] Error reading key "${key}":`, error);
  }

  // Fallback to memoryStore
  return memoryStore.get(key) ?? null;
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
      return;
    }
  } catch (error) {
    console.warn(`[SecureStorage] Error writing key "${key}":`, error);
  }

  memoryStore.set(key, value);
}

export async function deleteSecureItem(key: string): Promise<void> {
  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
  } catch (error) {
    console.warn(`[SecureStorage] Error deleting key "${key}":`, error);
  }

  memoryStore.delete(key);
}
