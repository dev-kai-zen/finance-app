import type { SupportedLanguage } from "@/infrastructure/localization/types/localization.types";

export function filterLanguages(
  languages: readonly SupportedLanguage[],
  query: string,
): SupportedLanguage[] {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return [...languages];

  return languages.filter((language) =>
    [language.englishName, language.nativeName, language.code].some((value) =>
      normalizeSearchValue(value).includes(normalizedQuery),
    ),
  );
}

function normalizeSearchValue(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
