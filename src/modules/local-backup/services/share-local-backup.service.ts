import * as Sharing from "expo-sharing";

export async function shareLocalBackup(
  uri: string,
  name: string,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Exporting files is not available on this device.");
  }

  await Sharing.shareAsync(uri, {
    dialogTitle: `Export ${name}`,
    mimeType: "application/octet-stream",
  });
}
