declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
  }
}

declare module "expo-device" {
  export const brand: string | null;
  export const modelName: string | null;
  export const osName: string | null;
}
