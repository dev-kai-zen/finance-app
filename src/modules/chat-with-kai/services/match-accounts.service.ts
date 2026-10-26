import type { AccountListItem } from "@/modules/accounts";
import type { TransactionType } from "@/modules/transactions";
import { PREPOSITIONS } from "../constants/intent-vocabulary";

export interface MatchedAccountsResult {
  sourceAccount: AccountListItem | null;
  destinationAccount: AccountListItem | null;
  matchedTexts: string[];
}

/**
 * Normalizes text for matching account names (lowercased, trimmed, trimmed punctuation)
 */
function clean(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
}

/**
 * Searches for an account in a given segment of text.
 * Sorts accounts by name length descending so "Credit Card BDO" matches before "BDO".
 */
function findAccountInSegment(
  segment: string,
  accounts: AccountListItem[],
  accountKeywordsMap?: Map<string, string>,
): { account: AccountListItem; matchedText: string } | null {
  const normSegment = clean(segment);
  const sorted = [...accounts].sort((a, b) => b.name.length - a.name.length);

  for (const acc of sorted) {
    const normName = clean(acc.name);
    if (!normName) continue;

    // Check exact word boundary match
    const regex = new RegExp(`\\b${normName}\\b`, "i");
    if (regex.test(normSegment)) {
      return { account: acc, matchedText: acc.name };
    }
  }

  // Check learned account keywords
  if (accountKeywordsMap && accountKeywordsMap.size > 0) {
    const sortedKeywords = Array.from(accountKeywordsMap.entries()).sort(
      (a, b) => b[0].length - a[0].length,
    );
    for (const [kw, accId] of sortedKeywords) {
      const cleanKw = clean(kw);
      if (!cleanKw) continue;
      const kwRegex = new RegExp(`\\b${cleanKw}\\b`, "i");
      if (kwRegex.test(normSegment)) {
        const found = accounts.find((a) => a.id === accId);
        if (found) {
          return { account: found, matchedText: kw };
        }
      }
    }
  }

  return null;
}

/**
 * Resolves source and destination accounts based on user prompt, transaction type,
 * and available accounts in SQLite.
 */
export function matchAccounts(
  text: string,
  accounts: AccountListItem[],
  type: TransactionType,
  defaultAccountId?: string | null,
  accountKeywordsMap?: Map<string, string>,
): MatchedAccountsResult {
  if (accounts.length === 0) {
    return { sourceAccount: null, destinationAccount: null, matchedTexts: [] };
  }

  const matchedTexts: string[] = [];
  let sourceAccount: AccountListItem | null = null;
  let destinationAccount: AccountListItem | null = null;

  const lowerText = text.toLowerCase();

  // 1. If Transfer, look specifically for from -> to patterns
  if (type === "transfer") {
    // Check "from ... to ..." patterns
    for (const fromPrep of PREPOSITIONS.from) {
      const fromIdx = lowerText.indexOf(fromPrep);
      if (fromIdx !== -1) {
        const afterFrom = text.slice(fromIdx + fromPrep.length);

        for (const toPrep of PREPOSITIONS.to) {
          const toIdx = afterFrom.toLowerCase().indexOf(` ${toPrep} `);
          if (toIdx !== -1) {
            const fromSegment = afterFrom.slice(0, toIdx);
            const toSegment = afterFrom.slice(toIdx + toPrep.length + 2);

            const foundFrom = findAccountInSegment(
              fromSegment,
              accounts,
              accountKeywordsMap,
            );
            const foundTo = findAccountInSegment(
              toSegment,
              accounts,
              accountKeywordsMap,
            );

            if (foundFrom && foundTo) {
              sourceAccount = foundFrom.account;
              destinationAccount = foundTo.account;
              matchedTexts.push(foundFrom.matchedText, foundTo.matchedText);
              return { sourceAccount, destinationAccount, matchedTexts };
            }
          }
        }
      }
    }

    // Try finding any two accounts mentioned
    const foundAccounts: AccountListItem[] = [];
    const sorted = [...accounts].sort((a, b) => b.name.length - a.name.length);
    for (const acc of sorted) {
      const regex = new RegExp(`\\b${clean(acc.name)}\\b`, "i");
      if (regex.test(lowerText) && !foundAccounts.some((a) => a.id === acc.id)) {
        foundAccounts.push(acc);
        matchedTexts.push(acc.name);
      }
    }

    if (foundAccounts.length < 2 && accountKeywordsMap) {
      const sortedKeywords = Array.from(accountKeywordsMap.entries()).sort(
        (a, b) => b[0].length - a[0].length,
      );
      for (const [kw, accId] of sortedKeywords) {
        const cleanKw = clean(kw);
        if (!cleanKw) continue;
        const kwRegex = new RegExp(`\\b${cleanKw}\\b`, "i");
        if (kwRegex.test(lowerText)) {
          const acc = accounts.find((a) => a.id === accId);
          if (acc && !foundAccounts.some((a) => a.id === acc.id)) {
            foundAccounts.push(acc);
            matchedTexts.push(kw);
          }
        }
      }
    }

    if (foundAccounts.length >= 2) {
      sourceAccount = foundAccounts[0];
      destinationAccount = foundAccounts[1];
    } else if (foundAccounts.length === 1) {
      sourceAccount = foundAccounts[0];
      // Pick another account as fallback destination
      destinationAccount = accounts.find((a) => a.id !== sourceAccount?.id) ?? null;
    }
  } else {
    // 2. Expense or Income: Look for from / using / in / to prepositions
    const candidatePreps =
      type === "income"
        ? [...PREPOSITIONS.to, ...PREPOSITIONS.from]
        : [...PREPOSITIONS.from, ...PREPOSITIONS.to];

    for (const prep of candidatePreps) {
      const prepIdx = lowerText.indexOf(prep);
      if (prepIdx !== -1) {
        const segment = text.slice(prepIdx + prep.length);
        const match = findAccountInSegment(
          segment,
          accounts,
          accountKeywordsMap,
        );
        if (match) {
          sourceAccount = match.account;
          matchedTexts.push(match.matchedText);
          break;
        }
      }
    }

    // If no preposition matched, check if an account name was directly mentioned anywhere
    if (!sourceAccount) {
      const sorted = [...accounts].sort((a, b) => b.name.length - a.name.length);
      for (const acc of sorted) {
        const regex = new RegExp(`\\b${clean(acc.name)}\\b`, "i");
        if (regex.test(lowerText)) {
          sourceAccount = acc;
          matchedTexts.push(acc.name);
          break;
        }
      }
    }

    // If still no account, check accountKeywordsMap anywhere in text
    if (!sourceAccount && accountKeywordsMap) {
      const sortedKeywords = Array.from(accountKeywordsMap.entries()).sort(
        (a, b) => b[0].length - a[0].length,
      );
      for (const [kw, accId] of sortedKeywords) {
        const cleanKw = clean(kw);
        if (!cleanKw) continue;
        const kwRegex = new RegExp(`\\b${cleanKw}\\b`, "i");
        if (kwRegex.test(lowerText)) {
          const acc = accounts.find((a) => a.id === accId);
          if (acc) {
            sourceAccount = acc;
            matchedTexts.push(kw);
            break;
          }
        }
      }
    }
  }

  // Fallback to default account if not explicitly found
  if (!sourceAccount) {
    if (defaultAccountId) {
      sourceAccount = accounts.find((a) => a.id === defaultAccountId) ?? accounts[0] ?? null;
    } else {
      sourceAccount = accounts[0] ?? null;
    }
  }

  return { sourceAccount, destinationAccount, matchedTexts };
}
