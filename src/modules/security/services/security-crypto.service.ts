import * as Crypto from "expo-crypto";

/**
 * Generates a random cryptographic salt.
 */
export async function generateSalt(): Promise<string> {
  try {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // Fallback using randomUUID or Math.random
    return Crypto.randomUUID().replace(/-/g, "");
  }
}

/**
 * Computes a salted SHA-256 hash of the given password.
 */
export async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
  const payload = `${salt}:${password}`;
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    payload,
  );
}

/**
 * Verifies a candidate password against the stored salt and hash.
 */
export async function verifyPasswordHash(
  candidate: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  if (!candidate || !salt || !expectedHash) return false;
  const computedHash = await hashPassword(candidate, salt);
  return computedHash === expectedHash;
}
