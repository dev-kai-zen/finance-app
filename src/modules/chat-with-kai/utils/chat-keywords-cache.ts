import { subscribeToDatabaseReplacement } from "@/infrastructure/database/database-replacement";
import type { TransactionType } from "@/modules/transactions";
import type { MerchantLookupInfo } from "../services/extract-merchant-note.service";

export interface CachedChatKeywords {
  categoryKeywordsMap: Map<string, string>;
  accountKeywordsMap: Map<string, string>;
  actionKeywordsMap: Map<string, TransactionType>;
  merchantKeywordsMap: Map<string, MerchantLookupInfo>;
}

type CacheInvalidationListener = () => void;

let cachedKeywords: CachedChatKeywords | null = null;
let cacheVersion = 0;
const invalidationListeners = new Set<CacheInvalidationListener>();

export function getCachedChatKeywords(): CachedChatKeywords | null {
  return cachedKeywords;
}

export function getChatKeywordsCacheVersion(): number {
  return cacheVersion;
}

export function setCachedChatKeywords(next: CachedChatKeywords): void {
  cachedKeywords = next;
}

export function invalidateChatKeywordsCache(): void {
  cachedKeywords = null;
  cacheVersion += 1;
  invalidationListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors
    }
  });
}

export function subscribeChatKeywordsCacheInvalidation(
  listener: CacheInvalidationListener,
): () => void {
  invalidationListeners.add(listener);
  return () => {
    invalidationListeners.delete(listener);
  };
}

subscribeToDatabaseReplacement(invalidateChatKeywordsCache);
