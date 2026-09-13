export type TransactionType = "income" | "expense" | "transfer";

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  transferAccountId: string | null;
  type: TransactionType;
  amountCents: number;
  name: string | null;
  note: string | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NewTransaction = Omit<Transaction, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface TransactionListItem extends Transaction {
  accountName: string;
  accountCurrency: string;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  transferAccountName: string | null;
}

export interface CreateTransactionInput {
  accountId: string;
  categoryId: string;
  type: "income" | "expense";
  amountCents: number;
  name?: string | null;
  note?: string | null;
  occurredAt: Date;
}

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  name?: string | null;
  note?: string | null;
  occurredAt: Date;
}

export interface TransactionFilter {
  type?: "all" | "income" | "expense" | "transfer";
  accountId?: string;
  categoryId?: string;
  searchQuery?: string;
}

export interface TransactionStats {
  totalInflowMinorUnits: number;
  totalOutflowMinorUnits: number;
  netCashflowMinorUnits: number;
  transactionCount: number;
}
