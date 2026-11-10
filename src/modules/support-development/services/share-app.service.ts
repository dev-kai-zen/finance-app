import { Platform, Share } from "react-native";

import { appLockLifecycle } from "@/modules/security";
import { STORE_URL_WEB } from "../constants/support-development.constants";

export interface ShareAppOptions {
  title?: string;
  message?: string;
}

export async function shareApp(options?: ShareAppOptions): Promise<boolean> {
  const fallbackMessage = "Track your personal finances offline, privately, and beautifully with Kaizen Finance:";
  const baseMessage = options?.message ?? fallbackMessage;
  const fullMessage = Platform.OS === "android"
    ? `${baseMessage}\n${STORE_URL_WEB}`
    : baseMessage;

  try {
    return await appLockLifecycle.withLockSuspended(async () => {
      const result = await Share.share(
        Platform.select({
          ios: {
            title: options?.title ?? "Kaizen Finance",
            message: baseMessage,
            url: STORE_URL_WEB,
          },
          default: {
            title: options?.title ?? "Kaizen Finance",
            message: fullMessage,
          },
        }),
        {
          dialogTitle: options?.title ?? "Share Kaizen Finance",
        },
      );

      return result.action === Share.sharedAction;
    });
  } catch {
    return false;
  }
}

