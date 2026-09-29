import { db, type DbContext } from "@/infrastructure/database/client";
import { SYSTEM_ACCOUNT_TYPE_IDS } from "@/modules/accounts/constants/account-types.constants";
import {
  deleteNonSystemAccountTypes,
  insertAccountType,
  listAccountTypes,
} from "@/modules/accounts/repositories/account-types.repository";
import {
  deleteAllAccountRecords,
  insertAccount,
  listAccounts,
  newAccountRecordId,
} from "@/modules/accounts/repositories/accounts.repository";
import { upsertCreditCardDetails } from "@/modules/accounts/repositories/credit-card-details.repository";
import { insertPocket } from "@/modules/accounts/repositories/pockets.repository";
import { parseOpeningAmount } from "@/modules/accounts/utils/account-input";
import { clearFundGroupWorkspace } from "@/modules/accounts/services/delete-fund-group.service";

export type InitialAccountTemplate = "cash" | "bank" | "ewallet" | "savings";

export interface InitialAccountInput {
  name: string;
  openingAmount: string;
  template: InitialAccountTemplate;
}

export interface SampleAccountIds {
  wallet: string;
  checking: string;
  savings: string;
  creditCard: string;
  ewallet: string;
  archived: string;
  emergencyPocket: string;
  travelPocket: string;
}

const SAMPLE_IDS: SampleAccountIds = {
  wallet: "sample:account:wallet",
  checking: "sample:account:checking",
  savings: "sample:account:savings",
  creditCard: "sample:account:credit-card",
  ewallet: "sample:account:ewallet",
  archived: "sample:account:archived",
  emergencyPocket: "sample:pocket:emergency",
  travelPocket: "sample:pocket:travel",
};

const RECOMMENDED_ACCOUNT_TYPES: Record<
  InitialAccountTemplate,
  {
    id: string;
    name: string;
    iconKey: string;
    hexColorsId: string;
    pocketEnabled: boolean;
    sortOrder: number;
  }
> = {
  cash: {
    id: "recommended:type:cash",
    name: "Cash",
    iconKey: "wallet",
    hexColorsId: "color_amber",
    pocketEnabled: false,
    sortOrder: 0,
  },
  bank: {
    id: "recommended:type:bank",
    name: "Bank Account",
    iconKey: "landmark",
    hexColorsId: "color_blue",
    pocketEnabled: false,
    sortOrder: 1,
  },
  savings: {
    id: "recommended:type:savings",
    name: "Savings",
    iconKey: "piggy-bank",
    hexColorsId: "color_green",
    pocketEnabled: true,
    sortOrder: 2,
  },
  ewallet: {
    id: "recommended:type:ewallet",
    name: "E-Wallet",
    iconKey: "smartphone",
    hexColorsId: "color_purple",
    pocketEnabled: false,
    sortOrder: 3,
  },
};

export function hasAccountWorkspaceData(context: DbContext = db): boolean {
  return (
    listAccounts(context).length > 0 ||
    listAccountTypes(context).some(({ isSystem }) => !isSystem)
  );
}

export function createInitialAccount(
  input: InitialAccountInput,
  context: DbContext,
  now = new Date(),
): string {
  const name = input.name.trim();
  if (!name) throw new Error("Enter a name for your first account.");
  if (name.length > 100) throw new Error("Use at most 100 characters for the account name.");

  const openingBalanceMinorUnits = parseOpeningAmount(input.openingAmount);
  const accountTypeIds = ensureRecommendedAccountTypes(context, now);
  const template = RECOMMENDED_ACCOUNT_TYPES[input.template];
  const id = newAccountRecordId(context);
  const openingBalanceAt = new Date(now);
  openingBalanceAt.setHours(0, 0, 0, 0);

  insertAccount(
    {
      id,
      accountTypeId: accountTypeIds[input.template],
      name,
      note: null,
      iconKey: template.iconKey,
      currencyCode: "PHP",
      openingBalanceMinorUnits,
      openingBalanceAt,
      startingBalanceLocked: false,
      hideFromSelection: false,
      hideFromReports: false,
      pocketEnabled: template.pocketEnabled,
      maintainingBalanceMinorUnits: null,
      isArchived: false,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    },
    context,
  );

  return id;
}

export function createRecommendedAccounts(
  context: DbContext,
  now = new Date(),
): void {
  const accountTypeIds = ensureRecommendedAccountTypes(context, now);
  const openingBalanceAt = new Date(now);
  openingBalanceAt.setHours(0, 0, 0, 0);
  const recommendedAccounts: Array<{
    id: string;
    name: string;
    template: InitialAccountTemplate;
  }> = [
    { id: "recommended:account:cash", name: "Cash Wallet", template: "cash" },
    { id: "recommended:account:bank", name: "Bank Account", template: "bank" },
    {
      id: "recommended:account:savings",
      name: "Savings Account",
      template: "savings",
    },
    {
      id: "recommended:account:ewallet",
      name: "E-Wallet",
      template: "ewallet",
    },
  ];

  for (const account of recommendedAccounts) {
    const template = RECOMMENDED_ACCOUNT_TYPES[account.template];
    insertAccount(
      {
        id: account.id,
        accountTypeId: accountTypeIds[account.template],
        name: account.name,
        note: null,
        iconKey: template.iconKey,
        currencyCode: "PHP",
        openingBalanceMinorUnits: 0,
        openingBalanceAt,
        startingBalanceLocked: false,
        hideFromSelection: false,
        hideFromReports: false,
        pocketEnabled: template.pocketEnabled,
        maintainingBalanceMinorUnits: null,
        isArchived: false,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      },
      context,
    );
  }
}

function ensureRecommendedAccountTypes(
  context: DbContext,
  now: Date,
): Record<InitialAccountTemplate, string> {
  const existingTypes = listAccountTypes(context);
  const ids = {} as Record<InitialAccountTemplate, string>;

  for (const template of Object.keys(
    RECOMMENDED_ACCOUNT_TYPES,
  ) as InitialAccountTemplate[]) {
    const definition = RECOMMENDED_ACCOUNT_TYPES[template];
    const existing = existingTypes.find(
      (type) =>
        type.id === definition.id ||
        (type.accountGroup === "asset" &&
          type.name.trim().toLowerCase() === definition.name.toLowerCase()),
    );

    if (existing) {
      ids[template] = existing.id;
      continue;
    }

    insertAccountType(
      {
        id: definition.id,
        name: definition.name,
        accountGroup: "asset",
        iconKey: definition.iconKey,
        hexColorsId: definition.hexColorsId,
        isSystem: false,
        sortOrder: definition.sortOrder,
        createdAt: now,
        updatedAt: now,
      },
      context,
    );
    ids[template] = definition.id;
  }

  return ids;
}

export function createSampleAccounts(
  context: DbContext,
  now = new Date(),
): SampleAccountIds {
  const sampleTypes = [
    {
      id: "sample:type:cash",
      name: "Cash",
      iconKey: "wallet",
      hexColorsId: "color_amber",
      sortOrder: 0,
    },
    {
      id: "sample:type:bank",
      name: "Bank Account",
      iconKey: "landmark",
      hexColorsId: "color_blue",
      sortOrder: 1,
    },
    {
      id: "sample:type:savings",
      name: "Savings",
      iconKey: "piggy-bank",
      hexColorsId: "color_green",
      sortOrder: 2,
    },
    {
      id: "sample:type:ewallet",
      name: "E-Wallet",
      iconKey: "smartphone",
      hexColorsId: "color_purple",
      sortOrder: 3,
    },
  ] as const;

  for (const type of sampleTypes) {
    insertAccountType(
      {
        ...type,
        accountGroup: "asset",
        isSystem: false,
        createdAt: now,
        updatedAt: now,
      },
      context,
    );
  }

  const openingBalanceAt = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const accountRows = [
    {
      id: SAMPLE_IDS.wallet,
      accountTypeId: "sample:type:cash",
      name: "Cash Wallet",
      iconKey: "wallet",
      openingBalanceMinorUnits: 250_000,
      pocketEnabled: false,
      maintainingBalanceMinorUnits: null,
      isArchived: false,
      sortOrder: 0,
    },
    {
      id: SAMPLE_IDS.checking,
      accountTypeId: "sample:type:bank",
      name: "Everyday Checking",
      iconKey: "landmark",
      openingBalanceMinorUnits: 2_800_000,
      pocketEnabled: false,
      maintainingBalanceMinorUnits: 500_000,
      isArchived: false,
      sortOrder: 0,
    },
    {
      id: SAMPLE_IDS.savings,
      accountTypeId: "sample:type:savings",
      name: "Rainy Day Savings",
      iconKey: "piggy-bank",
      openingBalanceMinorUnits: 5_500_000,
      pocketEnabled: true,
      maintainingBalanceMinorUnits: null,
      isArchived: false,
      sortOrder: 0,
    },
    {
      id: SAMPLE_IDS.ewallet,
      accountTypeId: "sample:type:ewallet",
      name: "Everyday E-Wallet",
      iconKey: "smartphone",
      openingBalanceMinorUnits: 120_000,
      pocketEnabled: false,
      maintainingBalanceMinorUnits: null,
      isArchived: false,
      sortOrder: 0,
    },
    {
      id: SAMPLE_IDS.creditCard,
      accountTypeId: SYSTEM_ACCOUNT_TYPE_IDS.LIABILITY_CREDIT_CARD,
      name: "Rewards Credit Card",
      iconKey: "credit-card",
      openingBalanceMinorUnits: -780_000,
      pocketEnabled: false,
      maintainingBalanceMinorUnits: null,
      isArchived: false,
      sortOrder: 0,
    },
    {
      id: SAMPLE_IDS.archived,
      accountTypeId: "sample:type:bank",
      name: "Old Payroll Account",
      iconKey: "landmark",
      openingBalanceMinorUnits: 0,
      pocketEnabled: false,
      maintainingBalanceMinorUnits: null,
      isArchived: true,
      sortOrder: 1,
    },
  ] as const;

  for (const account of accountRows) {
    insertAccount(
      {
        ...account,
        note: account.isArchived
          ? "A closed account kept to demonstrate archiving."
          : "Fictional sample account",
        currencyCode: "PHP",
        openingBalanceAt,
        startingBalanceLocked: true,
        hideFromSelection: false,
        hideFromReports: false,
        createdAt: now,
        updatedAt: now,
      },
      context,
    );
  }

  upsertCreditCardDetails(
    {
      accountId: SAMPLE_IDS.creditCard,
      creditLimitMinorUnits: 8_000_000,
      statementDay: 18,
      paymentDueDay: 8,
    },
    context,
  );

  insertPocket(
    {
      id: SAMPLE_IDS.emergencyPocket,
      accountId: SAMPLE_IDS.savings,
      name: "Emergency Fund",
      targetAmountMinorUnits: 12_000_000,
      isArchived: false,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    },
    context,
  );
  insertPocket(
    {
      id: SAMPLE_IDS.travelPocket,
      accountId: SAMPLE_IDS.savings,
      name: "Travel",
      targetAmountMinorUnits: 5_000_000,
      isArchived: false,
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
    context,
  );

  return SAMPLE_IDS;
}

export function clearAccountWorkspace(context: DbContext): void {
  clearFundGroupWorkspace(context);
  deleteAllAccountRecords(context);
  deleteNonSystemAccountTypes(context);
}
