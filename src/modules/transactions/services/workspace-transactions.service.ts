import { db, type DbContext } from "@/infrastructure/database/client";
import type { SampleAccountIds } from "@/modules/accounts";
import {
  deleteAllTransactionRecords,
  insertTransaction,
} from "@/modules/transactions/repositories/transactions.repository";
import type { TransactionType } from "@/modules/transactions/types/transaction.types";

interface SampleTransactionDefinition {
  id: string;
  accountId: string;
  categoryId: string;
  type: Exclude<TransactionType, "transfer">;
  amountCents: number;
  name: string;
  note?: string;
  monthOffset: number;
  day: number;
  pocketId?: string;
  deleted?: boolean;
}

export function createSampleTransactions(
  accounts: SampleAccountIds,
  context: DbContext,
  now = new Date(),
): void {
  const definitions: SampleTransactionDefinition[] = [
    {
      id: "salary-current",
      accountId: accounts.checking,
      categoryId: "cat_sub_salary_base",
      type: "income",
      amountCents: 6_500_000,
      name: "Monthly salary",
      note: "Fictional payroll deposit",
      monthOffset: 0,
      day: 1,
    },
    {
      id: "rent-current",
      accountId: accounts.checking,
      categoryId: "cat_sub_housing_rent",
      type: "expense",
      amountCents: -1_800_000,
      name: "Apartment rent",
      monthOffset: 0,
      day: 2,
    },
    {
      id: "groceries-current",
      accountId: accounts.checking,
      categoryId: "cat_sub_food_groceries",
      type: "expense",
      amountCents: -325_000,
      name: "Weekly groceries",
      note: "Produce, pantry items, and household supplies",
      monthOffset: 0,
      day: 5,
    },
    {
      id: "electric-current",
      accountId: accounts.checking,
      categoryId: "cat_sub_util_electric",
      type: "expense",
      amountCents: -240_000,
      name: "Electric bill",
      monthOffset: 0,
      day: 7,
    },
    {
      id: "internet-current",
      accountId: accounts.ewallet,
      categoryId: "cat_sub_util_internet",
      type: "expense",
      amountCents: -169_900,
      name: "Home internet",
      monthOffset: 0,
      day: 8,
    },
    {
      id: "freelance-current",
      accountId: accounts.ewallet,
      categoryId: "cat_sub_freelance_clients",
      type: "income",
      amountCents: 850_000,
      name: "Design project",
      note: "Sample freelance client payment",
      monthOffset: 0,
      day: 10,
    },
    {
      id: "commute-current",
      accountId: accounts.wallet,
      categoryId: "cat_sub_transport_transit",
      type: "expense",
      amountCents: -80_000,
      name: "Weekly commute",
      monthOffset: 0,
      day: 11,
    },
    {
      id: "dining-current",
      accountId: accounts.creditCard,
      categoryId: "cat_sub_food_restaurants",
      type: "expense",
      amountCents: -185_000,
      name: "Dinner with friends",
      monthOffset: 0,
      day: 13,
    },
    {
      id: "shopping-current",
      accountId: accounts.creditCard,
      categoryId: "cat_sub_shop_clothes",
      type: "expense",
      amountCents: -420_000,
      name: "Work clothes",
      monthOffset: 0,
      day: 15,
    },
    {
      id: "streaming-current",
      accountId: accounts.ewallet,
      categoryId: "cat_sub_entertainment_streaming",
      type: "expense",
      amountCents: -54_900,
      name: "Streaming subscription",
      monthOffset: 0,
      day: 16,
    },
    {
      id: "interest-current",
      accountId: accounts.savings,
      categoryId: "cat_sub_investments_dividends",
      type: "income",
      amountCents: 27_500,
      name: "Savings interest",
      monthOffset: 0,
      day: 18,
    },
    {
      id: "travel-deposit-current",
      accountId: accounts.savings,
      categoryId: "cat_exp_entertainment",
      pocketId: accounts.travelPocket,
      type: "expense",
      amountCents: -150_000,
      name: "Hotel reservation",
      monthOffset: 0,
      day: 20,
    },
    {
      id: "refund-current",
      accountId: accounts.creditCard,
      categoryId: "cat_sub_refunds_purchase",
      type: "income",
      amountCents: 75_000,
      name: "Purchase refund",
      monthOffset: 0,
      day: 21,
    },
    {
      id: "salary-previous",
      accountId: accounts.checking,
      categoryId: "cat_sub_salary_base",
      type: "income",
      amountCents: 6_500_000,
      name: "Monthly salary",
      monthOffset: -1,
      day: 1,
    },
    {
      id: "rent-previous",
      accountId: accounts.checking,
      categoryId: "cat_sub_housing_rent",
      type: "expense",
      amountCents: -1_800_000,
      name: "Apartment rent",
      monthOffset: -1,
      day: 2,
    },
    {
      id: "groceries-previous",
      accountId: accounts.checking,
      categoryId: "cat_sub_food_groceries",
      type: "expense",
      amountCents: -298_000,
      name: "Weekly groceries",
      monthOffset: -1,
      day: 9,
    },
    {
      id: "medical-previous",
      accountId: accounts.creditCard,
      categoryId: "cat_sub_health_medical",
      type: "expense",
      amountCents: -225_000,
      name: "Dental checkup",
      monthOffset: -1,
      day: 14,
    },
    {
      id: "fuel-previous",
      accountId: accounts.wallet,
      categoryId: "cat_sub_transport_fuel",
      type: "expense",
      amountCents: -180_000,
      name: "Fuel",
      monthOffset: -1,
      day: 19,
    },
    {
      id: "deleted-coffee",
      accountId: accounts.wallet,
      categoryId: "cat_sub_food_coffee",
      type: "expense",
      amountCents: -30_000,
      name: "Duplicate coffee entry",
      note: "Deleted sample record for demonstrating Trash",
      monthOffset: 0,
      day: 12,
      deleted: true,
    },
  ];

  definitions.forEach((definition, index) => {
    const occurredAt = sampleDate(now, definition.monthOffset, definition.day, 9 + (index % 8));
    const createdAt = new Date(occurredAt.getTime() + index * 1_000);
    insertTransaction(
      {
        id: `sample:transaction:${definition.id}`,
        accountId: definition.accountId,
        categoryId: definition.categoryId,
        pocketId: definition.pocketId ?? null,
        transactionGroupId: null,
        type: definition.type,
        amountCents: definition.amountCents,
        name: definition.name,
        note: definition.note ?? null,
        occurredAt,
        createdAt,
        updatedAt: createdAt,
        deletedAt: definition.deleted ? createdAt : null,
      },
      context,
    );
  });

  addTransfer(context, now, "monthly-savings", {
    fromAccountId: accounts.checking,
    toAccountId: accounts.savings,
    amountCents: 1_200_000,
    name: "Monthly savings",
    monthOffset: 0,
    day: 3,
  });
  addTransfer(context, now, "fund-emergency", {
    fromAccountId: accounts.savings,
    toAccountId: accounts.savings,
    toPocketId: accounts.emergencyPocket,
    amountCents: 1_500_000,
    name: "Emergency fund allocation",
    monthOffset: 0,
    day: 4,
  });
  addTransfer(context, now, "fund-travel", {
    fromAccountId: accounts.savings,
    toAccountId: accounts.savings,
    toPocketId: accounts.travelPocket,
    amountCents: 500_000,
    name: "Travel fund allocation",
    monthOffset: 0,
    day: 6,
  });
  addTransfer(context, now, "top-up-ewallet", {
    fromAccountId: accounts.checking,
    toAccountId: accounts.ewallet,
    amountCents: 300_000,
    name: "E-Wallet top up",
    monthOffset: 0,
    day: 9,
  });
  addTransfer(context, now, "credit-card-payment", {
    fromAccountId: accounts.checking,
    toAccountId: accounts.creditCard,
    amountCents: 600_000,
    name: "Credit card payment",
    monthOffset: 0,
    day: 17,
  });
  addTransfer(context, now, "savings-previous", {
    fromAccountId: accounts.checking,
    toAccountId: accounts.savings,
    amountCents: 1_000_000,
    name: "Monthly savings",
    monthOffset: -1,
    day: 4,
  });
}

interface SampleTransferDefinition {
  fromAccountId: string;
  toAccountId: string;
  fromPocketId?: string;
  toPocketId?: string;
  amountCents: number;
  name: string;
  monthOffset: number;
  day: number;
}

function addTransfer(
  context: DbContext,
  now: Date,
  key: string,
  definition: SampleTransferDefinition,
): void {
  const groupId = `sample:transfer:${key}`;
  const occurredAt = sampleDate(now, definition.monthOffset, definition.day, 14);
  const createdAt = new Date(occurredAt.getTime() + 30_000);
  const common = {
    categoryId: null,
    transactionGroupId: groupId,
    type: "transfer" as const,
    name: definition.name,
    note: "Fictional sample transfer",
    occurredAt,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
  };

  insertTransaction(
    {
      ...common,
      id: `${groupId}:out`,
      accountId: definition.fromAccountId,
      pocketId: definition.fromPocketId ?? null,
      amountCents: -definition.amountCents,
    },
    context,
  );
  insertTransaction(
    {
      ...common,
      id: `${groupId}:in`,
      accountId: definition.toAccountId,
      pocketId: definition.toPocketId ?? null,
      amountCents: definition.amountCents,
    },
    context,
  );
}

function sampleDate(
  now: Date,
  monthOffset: number,
  requestedDay: number,
  hour: number,
): Date {
  const year = now.getFullYear();
  const month = now.getMonth() + monthOffset;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(
    requestedDay,
    lastDay,
    monthOffset === 0 ? now.getDate() : lastDay,
  );
  return new Date(year, month, Math.max(1, day), hour, 0, 0, 0);
}

export function clearTransactionWorkspace(context: DbContext): void {
  deleteAllTransactionRecords(context);
}
