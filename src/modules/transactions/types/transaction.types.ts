import type { LabelBadgeItem } from "@/modules/labels";

export type TransactionType = "income" | "expense" | "transfer";

export interface TransactionSplitEntryInput {
  categoryId: string;
  amountMinorUnits: number;
  note?: string | null;
}

export interface TransactionSplitEntryListItem extends TransactionSplitEntryInput {
  id: string;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  pocketId: string | null;
  transactionGroupId: string | null;
  type: TransactionType;
  currencyCode: string;
  amountMinorUnits: number;
  originalAmountMinorUnits: number | null;
  exchangeRateScaled: number | null;
  name: string | null;
  note: string | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type NewTransaction = Omit<
  Transaction,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "currencyCode"
  | "originalAmountMinorUnits"
  | "exchangeRateScaled"
> & {
  id?: string;
  currencyCode?: string;
  originalAmountMinorUnits?: number | null;
  exchangeRateScaled?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export interface TransactionListItem extends Transaction {
  attachmentCount: number;
  accountName: string;
  accountCurrency: string;
  accountTypeName: string;
  accountPocketEnabled: boolean;
  accountBalanceAfterMinorUnits: number | null;
  locationBalanceAfterMinorUnits: number | null;
  deletedAt: Date | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  pocketName: string | null;
  /** Destination account on grouped transfer rows */
  transferAccountId: string | null;
  transferAccountName: string | null;
  transferAccountCurrency: string | null;
  transferAccountTypeName: string | null;
  transferAccountPocketEnabled: boolean | null;
  transferPocketId: string | null;
  transferPocketName: string | null;
  destinationBalanceAfterMinorUnits: number | null;
  destinationLocationBalanceAfterMinorUnits: number | null;
  /** Transfer fee details on grouped transfer rows */
  transferFeeAmountMinorUnits?: number | null;
  transferFeeAccountId?: string | null;
  transferFeeAccountName?: string | null;
  transferFeePocketId?: string | null;
  transferFeePocketName?: string | null;
  transferFeeCategoryId?: string | null;
  transferFeeCategoryName?: string | null;
  transferDestinationAmountMinorUnits?: number | null;
  transferExchangeRateScaled?: number | null;
  labels?: LabelBadgeItem[];
  isSplit?: boolean;
  splitEntries?: TransactionSplitEntryListItem[];
}

export type TransactionAttachmentSyncStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "failed";

export interface TransactionAttachment {
  id: string;
  transactionId: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  driveFileId: string | null;
  syncStatus: TransactionAttachmentSyncStatus;
  lastSyncError: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface TransactionAttachmentDraft {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface TransactionAttachmentChanges {
  added: TransactionAttachmentDraft[];
  removedIds: string[];
}

export interface CreateTransactionInput {
  accountId: string;
  /** Required when `splitEntries` is empty or omitted. Null when split. */
  categoryId?: string | null;
  /** When set with at least two lines, parent category is cleared and amounts must sum to the total. */
  splitEntries?: TransactionSplitEntryInput[] | null;
  pocketId?: string | null;
  type: "income" | "expense";
  /** Absolute typed amount in typed currency minor units (cross-currency) or signed account amount when same currency. */
  amountMinorUnits: number;
  currencyCode?: string;
  /** Absolute typed minor units when currencies differ; omit when same as amountMinorUnits magnitude. */
  typedAmountMinorUnitsAbs?: number;
  /** Signed account-currency amount when user edited the account field. */
  signedAccountAmountMinorUnits?: number;
  exchangeRateScaled?: number | null;
  exchangeLastEdited?: "typed" | "rate" | "account";
  name?: string | null;
  note?: string | null;
  occurredAt: Date;
  installment?: {
    termMonths: number;
    deferredMonths?: number;
  } | null | undefined;
  labelIds?: string[];
}

export interface TransferFeeInput {
  amountMinorUnits: number;
  accountId: string;
  pocketId?: string | null;
  categoryId: string;
}

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  fromPocketId?: string | null;
  toPocketId?: string | null;
  /** Source amount in the source account currency (positive minor units). */
  amountMinorUnits: number;
  /** Destination amount in the destination account currency when currencies differ. */
  destinationAmountMinorUnits?: number;
  name?: string | null;
  note?: string | null;
  occurredAt: Date;
  fee?: TransferFeeInput | null;
  labelIds?: string[];
}

export interface UpdateTransferInput {
  transactionGroupId: string;
  fromAccountId: string;
  toAccountId: string;
  fromPocketId?: string | null;
  toPocketId?: string | null;
  amountMinorUnits: number;
  destinationAmountMinorUnits?: number;
  name?: string | null;
  note?: string | null;
  occurredAt: Date;
  fee?: TransferFeeInput | null;
  labelIds?: string[];
}

export interface TransactionFilter {
  type?: "all" | "income" | "expense" | "transfer";
  accountId?: string;
  categoryId?: string;
  searchQuery?: string;
  labelIds?: string[];
}

export interface TransactionStats {
  totalInflowMinorUnits: number;
  totalOutflowMinorUnits: number;
  netCashflowMinorUnits: number;
  transactionCount: number;
}

export interface TransferResult {
  transactionGroupId: string;
  outLeg: Transaction;
  inLeg: Transaction;
  feeLeg?: Transaction | null;
}
