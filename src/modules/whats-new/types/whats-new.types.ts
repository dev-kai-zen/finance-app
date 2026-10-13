import type { TranslationKey } from "@/infrastructure/localization/translations/en";

export interface ReleaseNoteBlock {
  version: string;
  titleKey: TranslationKey;
  itemKeys: TranslationKey[];
}

export interface WhatsNewPresentation {
  blocks: ReleaseNoteBlock[];
}
