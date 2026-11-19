import { subscribeToDatabaseReplacement } from "@/infrastructure/database/database-replacement";
import type { TransactionType } from "@/modules/transactions";
import type { MerchantLookupInfo } from "../services/extract-merchant-note.service";

export interface CachedChatKeywords {
  categoryKeywordsMap: Map<string, string>;
  accountKeywordsMap: Map<string, string>;
  actionKeywordsMap: Map<string, TransactionType>;
  merchantKeywordsMap: Map<string, MerchantLookupInfo>;
}

let cachedKeywords: CachedChatKeywords | null = null;

export function getCachedChatKeywords(): CachedChatKeywords | null {
  return cachedKeywords;
}

export function setCachedChatKeywords(next: CachedChatKeywords): void {
  cachedKeywords = next;
}

export function invalidateChatKeywordsCache(): void {
  cachedKeywords = null;
}

subscribeToDatabaseReplacement(invalidateChatKeywordsCache);
