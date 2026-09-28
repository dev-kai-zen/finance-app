import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
  CryptoDigestAlgorithm,
  digest,
  getRandomBytesAsync,
} from "expo-crypto";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

const ENCRYPTED_MAGIC = "KAIZENB1";
const UNPROTECTED_MAGIC = "KAIZENP1";
const FORMAT_VERSION = 1;
const HEADER_PREFIX_LENGTH = ENCRYPTED_MAGIC.length + 4;
const MAX_HEADER_BYTES = 64 * 1024;
const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_BYTES = 32;

interface BackupHeader {
  formatVersion: number;
  createdAt: string;
  appVersion: string;
  databaseBytes: number;
  databaseSha256: string;
  kdf: {
    name: "scrypt";
    saltBase64: string;
    N: number;
    r: number;
    p: number;
    keyBytes: number;
  };
  encryption: {
    name: "AES-256-GCM";
    ivBytes: number;
    tagBytes: 16;
  };
}

interface UnprotectedBackupHeader {
  formatVersion: number;
  createdAt: string;
  appVersion: string;
  databaseBytes: number;
  databaseSha256: string;
  protection: {
    name: "none";
  };
}

export interface DecryptedBackup {
  database: Uint8Array;
  createdAt: Date;
  appVersion: string;
}

export async function createDatabaseBackup(
  database: Uint8Array,
  passphrase: string | null,
  appVersion: string,
  createdAt = new Date(),
): Promise<Uint8Array> {
  if (passphrase !== null) {
    return encryptDatabaseBackup(database, passphrase, appVersion, createdAt);
  }

  const header: UnprotectedBackupHeader = {
    formatVersion: FORMAT_VERSION,
    createdAt: createdAt.toISOString(),
    appVersion,
    databaseBytes: database.byteLength,
    databaseSha256: await sha256(database),
    protection: { name: "none" },
  };
  const headerBytes = utf8ToBytes(JSON.stringify(header));
  return joinBytes(
    utf8ToBytes(UNPROTECTED_MAGIC),
    encodeUint32(headerBytes.byteLength),
    headerBytes,
    database,
  );
}

export async function readDatabaseBackup(
  archive: Uint8Array,
  passphrase: string | null,
): Promise<DecryptedBackup> {
  const magic = readMagic(archive);
  if (magic === ENCRYPTED_MAGIC) {
    if (passphrase === null) {
      throw new Error("This backup needs its password before it can be restored.");
    }
    return decryptDatabaseBackup(archive, passphrase);
  }
  if (magic !== UNPROTECTED_MAGIC) {
    throw new Error("This file is not a Kaizen Finance backup.");
  }

  const { headerBytes, payload } = splitArchive(archive);
  const header = parseAndValidateUnprotectedHeader(headerBytes);
  if (payload.byteLength !== header.databaseBytes) {
    throw new Error("The restored database size does not match the backup.");
  }
  if ((await sha256(payload)) !== header.databaseSha256) {
    throw new Error("The backup checksum is invalid.");
  }

  return {
    database: payload,
    createdAt: new Date(header.createdAt),
    appVersion: header.appVersion,
  };
}

export async function encryptDatabaseBackup(
  database: Uint8Array,
  passphrase: string,
  appVersion: string,
  createdAt = new Date(),
): Promise<Uint8Array> {
  assertPassphrase(passphrase);

  const salt = await getRandomBytesAsync(16);
  const hash = await sha256(database);
  const header: BackupHeader = {
    formatVersion: FORMAT_VERSION,
    createdAt: createdAt.toISOString(),
    appVersion,
    databaseBytes: database.byteLength,
    databaseSha256: hash,
    kdf: {
      name: "scrypt",
      saltBase64: bytesToBase64(salt),
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      keyBytes: KEY_BYTES,
    },
    encryption: {
      name: "AES-256-GCM",
      ivBytes: 12,
      tagBytes: 16,
    },
  };
  const headerBytes = utf8ToBytes(JSON.stringify(header));
  const keyBytes = await deriveKey(passphrase, salt);

  try {
    const key = await AESEncryptionKey.import(keyBytes);
    const sealed = await aesEncryptAsync(database, key, {
      additionalData: headerBytes,
      nonce: { length: header.encryption.ivBytes },
      tagLength: header.encryption.tagBytes,
    });
    const encrypted = await sealed.combined();
    return joinBytes(
      utf8ToBytes(ENCRYPTED_MAGIC),
      encodeUint32(headerBytes.byteLength),
      headerBytes,
      encrypted,
    );
  } finally {
    keyBytes.fill(0);
  }
}

export async function decryptDatabaseBackup(
  archive: Uint8Array,
  passphrase: string,
): Promise<DecryptedBackup> {
  assertPassphrase(passphrase);

  if (archive.byteLength < HEADER_PREFIX_LENGTH) {
    throw new Error("This file is not a Kaizen Finance backup.");
  }

  const magic = readMagic(archive);
  if (magic !== ENCRYPTED_MAGIC) {
    throw new Error("This file is not a Kaizen Finance backup.");
  }

  const { headerBytes, payload: encrypted } = splitArchive(archive);
  const header = parseAndValidateHeader(headerBytes);
  const salt = base64ToBytes(header.kdf.saltBase64);
  const keyBytes = await deriveKey(passphrase, salt);

  try {
    const key = await AESEncryptionKey.import(keyBytes);
    const sealed = AESSealedData.fromCombined(encrypted, {
      ivLength: header.encryption.ivBytes,
      tagLength: header.encryption.tagBytes,
    });
    let database: Uint8Array;

    try {
      database = await aesDecryptAsync(sealed, key, {
        additionalData: headerBytes,
      });
    } catch {
      throw new Error("The password is incorrect or the backup is damaged.");
    }

    if (database.byteLength !== header.databaseBytes) {
      throw new Error("The restored database size does not match the backup.");
    }

    const actualHash = await sha256(database);
    if (actualHash !== header.databaseSha256) {
      throw new Error("The backup checksum is invalid.");
    }

    return {
      database,
      createdAt: new Date(header.createdAt),
      appVersion: header.appVersion,
    };
  } finally {
    keyBytes.fill(0);
  }
}

function parseAndValidateUnprotectedHeader(
  bytes: Uint8Array,
): UnprotectedBackupHeader {
  const header = parseHeader(bytes) as Partial<UnprotectedBackupHeader>;
  if (
    !hasValidCommonHeader(header) ||
    header.protection?.name !== "none"
  ) {
    throw new Error("This backup format is unsupported or invalid.");
  }
  return header as UnprotectedBackupHeader;
}

export function validateBackupPassphrase(passphrase: string): string | null {
  if (passphrase.length < 12) {
    return "Use at least 12 characters.";
  }
  if (passphrase.length > 128) {
    return "Use no more than 128 characters.";
  }
  return null;
}

function assertPassphrase(passphrase: string): void {
  const error = validateBackupPassphrase(passphrase);
  if (error) throw new Error(error);
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  return scryptAsync(utf8ToBytes(passphrase.normalize("NFC")), salt, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    dkLen: KEY_BYTES,
    maxmem: 64 * 1024 * 1024,
    asyncTick: 10,
  });
}

function parseAndValidateHeader(bytes: Uint8Array): BackupHeader {
  const header = parseHeader(bytes) as Partial<BackupHeader>;
  const valid =
    hasValidCommonHeader(header) &&
    header.kdf?.name === "scrypt" &&
    header.kdf.N === SCRYPT_N &&
    header.kdf.r === SCRYPT_R &&
    header.kdf.p === SCRYPT_P &&
    header.kdf.keyBytes === KEY_BYTES &&
    typeof header.kdf.saltBase64 === "string" &&
    header.encryption?.name === "AES-256-GCM" &&
    header.encryption.ivBytes === 12 &&
    header.encryption.tagBytes === 16;

  if (!valid) {
    throw new Error("This backup format is unsupported or invalid.");
  }

  return header as BackupHeader;
}

function parseHeader(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("The backup header could not be read.");
  }
}

function hasValidCommonHeader(
  header: Partial<UnprotectedBackupHeader | BackupHeader>,
): boolean {
  return (
    header.formatVersion === FORMAT_VERSION &&
    typeof header.createdAt === "string" &&
    !Number.isNaN(Date.parse(header.createdAt)) &&
    typeof header.appVersion === "string" &&
    Number.isSafeInteger(header.databaseBytes) &&
    (header.databaseBytes ?? 0) > 0 &&
    typeof header.databaseSha256 === "string" &&
    /^[a-f0-9]{64}$/.test(header.databaseSha256)
  );
}

function readMagic(archive: Uint8Array): string {
  if (archive.byteLength < HEADER_PREFIX_LENGTH) {
    throw new Error("This file is not a Kaizen Finance backup.");
  }
  return new TextDecoder().decode(archive.slice(0, ENCRYPTED_MAGIC.length));
}

function splitArchive(archive: Uint8Array): {
  headerBytes: Uint8Array;
  payload: Uint8Array;
} {
  const headerLength = decodeUint32(archive, ENCRYPTED_MAGIC.length);
  if (
    headerLength <= 0 ||
    headerLength > MAX_HEADER_BYTES ||
    HEADER_PREFIX_LENGTH + headerLength >= archive.byteLength
  ) {
    throw new Error("The backup header is invalid.");
  }
  return {
    headerBytes: archive.slice(
      HEADER_PREFIX_LENGTH,
      HEADER_PREFIX_LENGTH + headerLength,
    ),
    payload: archive.slice(HEADER_PREFIX_LENGTH + headerLength),
  };
}

async function sha256(bytes: Uint8Array): Promise<string> {
  return bytesToHex(
    new Uint8Array(
      await digest(CryptoDigestAlgorithm.SHA256, toNativeBytes(bytes)),
    ),
  );
}

function encodeUint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

function decodeUint32(bytes: Uint8Array, offset: number): number {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset + offset,
    4,
  ).getUint32(0, false);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error("The backup encryption salt is invalid.");
  }
}

function toNativeBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  if (
    bytes.buffer instanceof ArrayBuffer &&
    bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength
  ) {
    return bytes as Uint8Array<ArrayBuffer>;
  }

  return new Uint8Array(bytes);
}

function joinBytes(...parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(
    parts.reduce((length, part) => length + part.byteLength, 0),
  );
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.byteLength;
  });
  return output;
}
