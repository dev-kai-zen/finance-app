import { Platform } from "react-native";
import * as Linking from "expo-linking";

import { STORE_URL_MARKET, STORE_URL_WEB } from "../constants/support-development.constants";

export async function openStoreReviewPage(): Promise<void> {
  if (Platform.OS === "android") {
    try {
      const canOpen = await Linking.canOpenURL(STORE_URL_MARKET);
      if (canOpen) {
        await Linking.openURL(STORE_URL_MARKET);
        return;
      }
    } catch {
      // Fallback to web URL
    }
  }
  await Linking.openURL(STORE_URL_WEB);
}

