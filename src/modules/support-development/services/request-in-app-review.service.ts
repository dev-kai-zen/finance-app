import * as StoreReview from "expo-store-review";

import { openStoreReviewPage } from "./open-store-review.service";

export async function requestInAppReview(): Promise<void> {
  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (isAvailable) {
      await StoreReview.requestReview();
      return;
    }
  } catch {
    // If native review prompt fails, fallback to direct store page
  }

  await openStoreReviewPage();
}

