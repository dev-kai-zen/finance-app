import * as Sharing from "expo-sharing";

import { appLockLifecycle } from "@/modules/security";

export async function shareLocalBackup(
  uri: string,
  name: string,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Exporting files is not available on this device.");
  }

  await appLockLifecycle.withLockSuspended(async () => {
    await Sharing.shareAsync(uri, {
      dialogTitle: `Export ${name}`,
      mimeType: "application/octet-stream",
    });
  });
}
