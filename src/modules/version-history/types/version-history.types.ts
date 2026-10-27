import type { TranslationKey } from "@/infrastructure/localization/translations/en";

export interface ReleaseNoteSection {
  categoryKey: TranslationKey;
  itemKeys: TranslationKey[];
}

export interface ReleaseNoteBlock {
  version: string;
  dateKey?: TranslationKey;
  titleKey?: TranslationKey;
  sections: ReleaseNoteSection[];
}

export interface VersionHistoryPresentation {
  blocks: ReleaseNoteBlock[];
}

