export const GOOGLE_PLAY_PACKAGE_NAME = "com.kaizen.finance.app";

export const STORE_URL_MARKET = `market://details?id=${GOOGLE_PLAY_PACKAGE_NAME}`;
export const STORE_URL_WEB = `https://play.google.com/store/apps/details?id=${GOOGLE_PLAY_PACKAGE_NAME}`;

export const SHARE_APP_CONFIG = {
  url: STORE_URL_WEB,
};

export const MIN_TRANSACTIONS_FOR_REVIEW_PROMPT = 10;
export const REVIEW_PROMPT_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days if "Maybe Later"

