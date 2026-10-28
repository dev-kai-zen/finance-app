import type { AccountListItem } from "@/modules/accounts";
import type { TransactionType } from "@/modules/transactions";
import { PREPOSITIONS } from "../constants/intent-vocabulary";

export interface MatchedAccountsResult {
  sourceAccount: AccountListItem | null;
  destinationAccount: AccountListItem | null;
  matchedTexts: string[];
  unmatchedAccountAttempt?: string | null;
}

/**
 * Normalizes text for matching account names (lowercased, trimmed, trimmed punctuation)
 */
function clean(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
}

/**
 * Sorts accounts by:
 * 1. Name length descending (so "Credit Card BDO" matches before "BDO")
 * 2. Account Group: Asset (0) prioritized over Liability (1) when names or lengths match
 * 3. Sort order
 */
function sortAccountsByPriority(accounts: AccountListItem[]): AccountListItem[] {
  return [...accounts].sort((a, b) => {
    const lenDiff = b.name.length - a.name.length;
    if (lenDiff !== 0) return lenDiff;

    const aIsLiability = a.accountType?.accountGroup === "liability" ? 1 : 0;
    const bIsLiability = b.accountType?.accountGroup === "liability" ? 1 : 0;
    if (aIsLiability !== bIsLiability) return aIsLiability - bIsLiability;

    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

/**
 * Searches for an account in a given segment of text.
 * Sorts accounts by name length descending and prioritizes Asset over Liability.
 */
function findAccountInSegment(
  segment: string,
  accounts: AccountListItem[],
  accountKeywordsMap?: Map<string, string>,
): { account: AccountListItem; matchedText: string } | null {
  const normSegment = clean(segment);
  const sorted = sortAccountsByPriority(accounts);

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
 * Extracts a candidate account name attempt from the segment following a preposition.
 * Strips leading articles/pronouns and cuts off at trailing prepositions/date indicators.
 */
function extractCandidateAccountName(segment: string): string | null {
  const cleaned = segment
    .trim()
    .replace(/^(?:my|the|this|aking|mga|mi|el|la|los|las|su)\s+/i, "")
    .trim();

  if (!cleaned) return null;

  // Split at delimiters: punctuation or subsequent prepositions/date adverbs
  const candidatePart = cleaned.split(
    /[,.!?;]|\s+(?:at|on|for|in|sa|para|para\s+sa|en|por|yesterday|kahapon|ayer|today|ngayon|hoy|last\s+night)\b/i,
  )[0]?.trim();

  if (!candidatePart) return null;

  // Take up to 3 words
  const words = candidatePart.split(/\s+/).slice(0, 3);
  const result = words.join(" ").trim();
  return result.length > 0 ? result : null;
}

const STRONG_ACCOUNT_PREPS = new Set([
  "using my",
  "using the",
  "using",
  "with my",
  "with the",
  "via",
  "through",
  "out of",
  "from my",
  "from the",
  "gamit ang aking",
  "gamit ang",
  "gamit",
  "galing sa aking",
  "mula sa aking",
  "desde mi",
  "con mi",
  "con el",
  "con la",
  "por medio de",
  "to my",
  "to the",
  "into my",
  "into the",
  "papunta sa aking",
  "sa aking",
  "hacia mi",
  "a mi",
]);

const FINANCIAL_KEYWORDS_REGEX =
  /\b(wallet|account|bank|card|cash|savings|checking|payroll|credit|debit|bdo|bpi|metrobank|gcash|maya|gotyme|unionbank|seabank|paypal|billetera|tarjeta|cuenta)\b/i;

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
  let unmatchedAccountAttempt: string | null = null;

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
            } else if (!foundFrom) {
              const attempt = extractCandidateAccountName(fromSegment);
              if (attempt) {
                return {
                  sourceAccount: null,
                  destinationAccount: foundTo?.account ?? null,
                  matchedTexts: foundTo ? [foundTo.matchedText] : [],
                  unmatchedAccountAttempt: attempt,
                };
              }
            } else if (!foundTo) {
              const attempt = extractCandidateAccountName(toSegment);
              if (attempt) {
                return {
                  sourceAccount: foundFrom.account,
                  destinationAccount: null,
                  matchedTexts: [foundFrom.matchedText],
                  unmatchedAccountAttempt: attempt,
                };
              }
            }
          }
        }
      }
    }

    // Try finding any two accounts mentioned
    const foundAccounts: AccountListItem[] = [];
    const sorted = sortAccountsByPriority(accounts);
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
      destinationAccount = accounts.find((a) => a.id !== sourceAccount?.id) ?? null;
    }
  } else {
    // 2. Expense or Income: Look for account prepositions
    const candidatePreps =
      type === "income"
        ? [...PREPOSITIONS.to, ...PREPOSITIONS.from]
        : [...PREPOSITIONS.from, ...PREPOSITIONS.to];

    // Sort prepositions by length descending so "using my" matches before "using"
    const sortedPreps = [...candidatePreps].sort((a, b) => b.length - a.length);

    for (const prep of sortedPreps) {
      const prepRegex = new RegExp(`\\b${prep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      const matchPos = lowerText.search(prepRegex);
      if (matchPos !== -1) {
        const afterPrep = text.slice(matchPos + prep.length);
        const match = findAccountInSegment(
          afterPrep,
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
      const sorted = sortAccountsByPriority(accounts);
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

    // If still no account was matched, check if the user explicitly attempted an account that failed
    if (!sourceAccount) {
      for (const prep of sortedPreps) {
        const prepRegex = new RegExp(`\\b${prep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        const matchPos = lowerText.search(prepRegex);
        if (matchPos !== -1) {
          const afterPrep = text.slice(matchPos + prep.length);
          const candidateNoun = extractCandidateAccountName(afterPrep);
          if (candidateNoun) {
            const isStrong = STRONG_ACCOUNT_PREPS.has(prep.toLowerCase());
            const hasFinanceWord = FINANCIAL_KEYWORDS_REGEX.test(candidateNoun);
            if (isStrong || hasFinanceWord) {
              unmatchedAccountAttempt = candidateNoun;
              break;
            }
          }
        }
      }
    }
  }

  // Fallback to default account ONLY if no explicit account attempt was made
  if (!sourceAccount && !unmatchedAccountAttempt) {
    if (defaultAccountId) {
      sourceAccount = accounts.find((a) => a.id === defaultAccountId) ?? accounts[0] ?? null;
    } else {
      sourceAccount = accounts[0] ?? null;
    }
  }

  return { sourceAccount, destinationAccount, matchedTexts, unmatchedAccountAttempt };
}
