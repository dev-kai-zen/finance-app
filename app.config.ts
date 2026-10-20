import type { ConfigContext, ExpoConfig } from "expo/config";

const GOOGLE_TEST_ANDROID_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const GOOGLE_TEST_IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511";

export default ({ config }: ConfigContext): ExpoConfig => {
  const androidAppId =
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || GOOGLE_TEST_ANDROID_APP_ID;
  const iosAppId =
    process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || GOOGLE_TEST_IOS_APP_ID;

  const plugins = (config.plugins ?? []).filter((plugin) => {
    if (typeof plugin === "string") {
      return plugin !== "react-native-google-mobile-ads";
    }
    if (Array.isArray(plugin)) {
      return plugin[0] !== "react-native-google-mobile-ads";
    }
    return true;
  });

  plugins.push([
    "react-native-google-mobile-ads",
    {
      androidAppId,
      iosAppId,
    },
  ]);

  return {
    ...config,
    name: config.name ?? "Kaizen Finance",
    slug: config.slug ?? "finance-app",
    plugins,
  };
};
