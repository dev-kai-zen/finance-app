import type { AccountListItem, PocketListItem } from "@/modules/accounts";
import type { Category } from "@/modules/categories";
import type {
  CreateTransactionInput,
  CreateTransferInput,
  TransactionListItem,
  TransactionType,
} from "@/modules/transactions";

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
  // Transfer
  transferAccountId?: string | null;
  transferAccountName?: string | null;
  transferPocketId?: string | null;
  transferPocketName?: string | null;
  isSaved?: boolean;
}

export interface ParseChatTransactionSuccess {
  success: true;
  proposal: ParsedTransactionProposal;
  confidence: number;
  explanation: string;
}

export type ParseChatTransactionFailureReason =
  | "missing_amount"
  | "missing_transfer_destination"
  | "missing_accounts"
  | "unintelligible"
  | "empty";

export interface ParseChatTransactionFailure {
  success: false;
  reason: ParseChatTransactionFailureReason;
  message: string;
  suggestedPrompts: string[];
}

export type ParseChatTransactionResult =
  | ParseChatTransactionSuccess
  | ParseChatTransactionFailure;

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  text: string;
  timestamp: Date;
  proposal?: ParsedTransactionProposal | null;
  failureReason?: ParseChatTransactionFailureReason | null;
  suggestedPrompts?: string[];
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
  defaultExpenseAccountId?: string | null;
  defaultIncomeAccountId?: string | null;
  defaultCurrency: string;
  language?: "en" | "fil" | "es";
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
