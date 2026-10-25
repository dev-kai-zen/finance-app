import type { ReleaseNoteBlock } from "@/modules/version-history/types/version-history.types";

/** Newest releases first. Append a block for each store release you want to highlight. */
export const RELEASE_NOTES: ReleaseNoteBlock[] = [
  {
    version: "1.1.0",
    sections: [
      {
        categoryKey: "versionHistory.categories.update",
        itemKeys: [
          "versionHistory.v110.updateItem1",
        ],
      },
    ],
  },
  {
    version: "1.0.0",
    titleKey: "versionHistory.v100.title",
    sections: [
      {
        categoryKey: "versionHistory.categories.accounts",
        itemKeys: [
          "versionHistory.v100.accountsItem1",
          "versionHistory.v100.accountsItem2",
        ],
      },
      {
        categoryKey: "versionHistory.categories.transactions",
        itemKeys: [
          "versionHistory.v100.transactionsItem1",
          "versionHistory.v100.transactionsItem2",
        ],
      },
      {
        categoryKey: "versionHistory.categories.calendar",
        itemKeys: [
          "versionHistory.v100.calendarItem1",
          "versionHistory.v100.calendarItem2",
        ],
      },
      {
        categoryKey: "versionHistory.categories.budgets",
        itemKeys: [
          "versionHistory.v100.budgetsItem1",
          "versionHistory.v100.budgetsItem2",
        ],
      },
      {
        categoryKey: "versionHistory.categories.scheduledTransactions",
        itemKeys: [
          "versionHistory.v100.scheduledItem1",
        ],
      },
      {
        categoryKey: "versionHistory.categories.creditCards",
        itemKeys: [
          "versionHistory.v100.creditCardsItem1",
        ],
      },
      {
        categoryKey: "versionHistory.categories.goals",
        itemKeys: [
          "versionHistory.v100.goalsItem1",
        ],
      },
      {
        categoryKey: "versionHistory.categories.reports",
        itemKeys: [
          "versionHistory.v100.reportsItem1",
        ],
      },
      {
        categoryKey: "versionHistory.categories.security",
        itemKeys: [
          "versionHistory.v100.securityItem1",
          "versionHistory.v100.securityItem2",
        ],
      },
      {
        categoryKey: "versionHistory.categories.backup",
        itemKeys: [
          "versionHistory.v100.backupItem1",
        ],
      },
    ],
  },
];

