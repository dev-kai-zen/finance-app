import type { ConfigContext, ExpoConfig } from "expo/config";
import { withAppBuildGradle } from "@expo/config-plugins";

const GOOGLE_TEST_ANDROID_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const GOOGLE_TEST_IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511";

function withReleaseSigning(expoConfig: ExpoConfig): ExpoConfig {
  return withAppBuildGradle(expoConfig, (modConfig) => {
    let contents = modConfig.modResults.contents;

    if (!contents.includes("MYAPP_UPLOAD_STORE_FILE")) {
      contents = contents.replace(
        /signingConfigs\s*\{/,
        `signingConfigs {
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }`
      );

      contents = contents.replace(
        /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.debug/,
        "$1(project.hasProperty('MYAPP_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug)"
      );

      modConfig.modResults.contents = contents;
    }

    return modConfig;
  });
}

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

  const updatedConfig: ExpoConfig = {
    ...config,
    name: config.name ?? "Kaizen Finance",
    slug: config.slug ?? "finance-app",
    plugins,
  };

  return withReleaseSigning(updatedConfig);
};

