import type { TranslationKey } from "@/infrastructure/localization";

export type SearchCategory =
  | "action"
  | "screen"
  | "setting"
  | "account"
  | "category";

export interface SearchCatalogItem {
  id: string;
  category: SearchCategory;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  iconName:
    | "plus"
    | "arrow-down-left"
    | "arrow-up-right"
    | "arrow-left-right"
    | "wallet"
    | "receipt"
    | "calendar"
    | "credit-card"
    | "tags"
    | "pie-chart"
    | "target"
    | "bar-chart-3"
    | "file-text"
    | "settings"
    | "shield-check"
    | "palette"
    | "circle-dollar-sign"
    | "languages"
    | "bell"
    | "hard-drive"
    | "cloud"
    | "sparkles"
    | "history"
    | "crown"
    | "rotate-ccw"
    | "trash-2"
    | "smile"
    | "search"
    | "heart"
    | "database"
    | "download"
    | "archive";
  iconColor?: string;
  route: string;
  targetId?: string;
  openModal?: boolean;
  keywords: string[];
}

export interface SearchResultItem {
  id: string;
  category: SearchCategory;
  title: string;
  description: string;
  iconName: string;
  iconColor?: string;
  route: string;
  targetId?: string;
  openModal?: boolean;
  badge?: string;
  isSuggested?: boolean;
}

export interface SearchResultSection {
  category: SearchCategory;
  title: string;
  data: SearchResultItem[];
}
