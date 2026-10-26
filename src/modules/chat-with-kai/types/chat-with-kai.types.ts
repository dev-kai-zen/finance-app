import type { AccountListItem, PocketListItem } from "@/modules/accounts";
import type { Category } from "@/modules/categories";
import type {
  CreateTransactionInput,
  CreateTransferInput,
  DuplicateCheckInput,
  DuplicateCheckResult,
  MerchantHistoryInsight,
  TransactionListItem,
  TransactionType,
} from "@/modules/transactions";
import type { MerchantLookupInfo } from "../services/extract-merchant-note.service";

export type ChatMessageRole = "user" | "assistant";

export interface ParsedTransactionProposal {
  type: TransactionType;
  amountMinorUnits: number;
  currencyCode: string;
  name: string | null;
  note: string | null;
  occurredAt: Date;
  // Expense / Income
  accountId: string;
  accountName: string;
  pocketId?: string | null;
  pocketName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  merchantId?: string | null;
  matchedKeyword?: string | null;
  originalCategoryId?: string | null;
  // Transfer
  transferAccountId?: string | null;
  transferAccountName?: string | null;
  transferPocketId?: string | null;
  transferPocketName?: string | null;
  isSaved?: boolean;
  isPotentialDuplicate?: boolean;
  duplicateWarningMessage?: string | null;
}

export interface ParseChatTransactionSuccess {
  success: true;
  proposal: ParsedTransactionProposal;
  confidence: number;
  explanation: string;
}

export type ParseChatTransactionFailureReason =
  | "missing_amount"
  | "multiple_amounts"
  | "missing_category"
  | "missing_transfer_destination"
  | "missing_accounts"
  | "unknown_account"
  | "unintelligible"
  | "empty";

export interface ParseChatTransactionFailure {
  success: false;
  reason: ParseChatTransactionFailureReason;
  message: string;
  suggestedPrompts: string[];
  suggestedAmounts?: number[];
  partialProposal?: ParsedTransactionProposal | null;
}

export type ParseChatTransactionResult =
  | ParseChatTransactionSuccess
  | ParseChatTransactionFailure;

export interface PendingKeywordReassignment {
  keyword: string;
  newCategoryId: string;
  newCategoryName: string;
}

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  text: string;
  timestamp: Date;
  proposal?: ParsedTransactionProposal | null;
  failureReason?: ParseChatTransactionFailureReason | null;
  suggestedPrompts?: string[];
  suggestedAmounts?: number[];
  partialProposal?: ParsedTransactionProposal | null;
  pendingKeywordReassignment?: PendingKeywordReassignment | null;
}

export interface CategoryKeywordItem {
  id: string;
  categoryId: string;
  keyword: string;
  language?: string | null;
  createdAt: Date;
}

export interface AccountKeywordItem {
  id: string;
  accountId: string;
  keyword: string;
  language?: string | null;
  createdAt: Date;
}

export interface ActionKeywordItem {
  id: string;
  actionType: TransactionType;
  keyword: string;
  language?: string | null;
  createdAt: Date;
}

export interface ParseChatTransactionContext {
  accounts: AccountListItem[];
  pockets?: PocketListItem[];
  categories: Category[];
  categoryKeywordsMap?: Map<string, string>;
  accountKeywordsMap?: Map<string, string>;
  actionKeywordsMap?: Map<string, TransactionType>;
  merchantKeywordsMap?: Map<string, MerchantLookupInfo>;
  defaultExpenseAccountId?: string | null;
  defaultIncomeAccountId?: string | null;
  defaultCurrency: string;
  language?: "en" | "fil" | "es";
  getMerchantHistory?: (merchantName: string) => MerchantHistoryInsight | null;
  findRecentDuplicateTransaction?: (
    input: DuplicateCheckInput,
  ) => DuplicateCheckResult;
}

export interface ChatWithKaiModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: AccountListItem[];
  pockets?: PocketListItem[];
  categories: Category[];
  defaultExpenseAccountId?: string | null;
  defaultIncomeAccountId?: string | null;
  defaultCurrency?: string;
  onEditInForm: (prefilledTransaction: TransactionListItem) => void;
  onSaveTransaction: (input: CreateTransactionInput) => Promise<boolean>;
  onSaveTransfer?: (input: CreateTransferInput) => Promise<boolean>;
}

export type ChatToEncodeModalProps = ChatWithKaiModalProps;
