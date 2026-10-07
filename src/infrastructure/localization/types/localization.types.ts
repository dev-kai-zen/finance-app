export type SupportedLocale = "en" | "fil" | "es";

export type LanguagePreference = "system" | SupportedLocale;

export interface SupportedLanguage {
  code: SupportedLocale;
  englishName: string;
  nativeName: string;
}
