import type { File } from "expo-file-system";
import { FileMode } from "expo-file-system";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export async function hashFileIncrementally(file: File): Promise<string> {
  const handle = file.open(FileMode.ReadOnly);
  const hasher = sha256.create();
  const size = file.size;
  try {
    let offset = 0;
    while (offset < size) {
      const chunk = handle.readBytes(Math.min(64 * 1024, size - offset));
      if (!chunk.length) throw new Error("The attachment could not be read completely.");
      hasher.update(chunk);
      offset += chunk.length;
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    if (file.size !== size) throw new Error("The attachment changed while being read.");
    return bytesToHex(hasher.digest());
  } finally { handle.close(); }
}
