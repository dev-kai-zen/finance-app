/**
 * Computes a deterministic 64-bit FNV-1a hex string hash of file text.
 */
export function hashString(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

export interface BuildSourceIdentityInput {
  importType: string;
  sourceName: string;
  accountName?: string;
  originalId?: string | null;
  fileHash: string;
  rowNumber: number;
}

/**
 * Builds the unique source identity according to the rule:
 * If original ID is provided: importType:sourceName:account:originalId
 * If original ID is absent: importType:fileHash:rowNumber
 */
export function buildSourceIdentity(input: BuildSourceIdentityInput): string {
  const normSource = (input.sourceName || "CSV").trim().toLowerCase();
  const normAccount = (input.accountName || "").trim().toLowerCase();
  const origId = input.originalId?.trim();

  if (origId) {
    return `${input.importType}:${normSource}:${normAccount}:${origId}`;
  }
  return `${input.importType}:${input.fileHash}:${input.rowNumber}`;
}

