import type { ReleaseNoteBlock } from "@/modules/version-history/types/version-history.types";

/** Newest releases first. Append a block for each store release you want to highlight. */
export const RELEASE_NOTES: ReleaseNoteBlock[] = [
  {
    version: "1.3.0",
    dateKey: "versionHistory.v130.date",
    sections: [
      {
        categoryKey: "versionHistory.categories.new",
        itemKeys: [
          "versionHistory.v130.newItem1",
          "versionHistory.v130.newItem2",
          "versionHistory.v130.newItem3",
        ],
      },
      {
        categoryKey: "versionHistory.categories.improve",
        itemKeys: [
          "versionHistory.v130.improveItem1",
          "versionHistory.v130.improveItem2",
          "versionHistory.v130.improveItem3",
        ],
      },
      {
        categoryKey: "versionHistory.categories.fix",
        itemKeys: [
          "versionHistory.v130.fixItem1",
          "versionHistory.v130.fixItem2",
        ],
      },
    ],
  },
  {
    version: "1.2.1",
    dateKey: "versionHistory.v121.date",
    sections: [
      {
        categoryKey: "versionHistory.categories.new",
        itemKeys: [
          "versionHistory.v121.newItem1",
        ],
      },
      {
        categoryKey: "versionHistory.categories.improve",
        itemKeys: [
          "versionHistory.v121.improveItem1",
          "versionHistory.v121.improveItem2",
          "versionHistory.v121.improveItem3",
          "versionHistory.v121.improveItem4",
        ],
      },
      {
        categoryKey: "versionHistory.categories.fix",
        itemKeys: [
          "versionHistory.v121.fixItem1",
          "versionHistory.v121.fixItem2",
          "versionHistory.v121.fixItem3",
        ],
      },
    ],
  },
  {
    version: "1.2.0",
    dateKey: "versionHistory.v120.date",
    sections: [
      {
        categoryKey: "versionHistory.categories.new",
        itemKeys: [
          "versionHistory.v120.newItem1",
          "versionHistory.v120.newItem2",
          "versionHistory.v120.newItem3",
        ],
      },
      {
        categoryKey: "versionHistory.categories.improve",
        itemKeys: [
          "versionHistory.v120.improveItem1",
          "versionHistory.v120.improveItem2",
          "versionHistory.v120.improveItem3",
        ],
      },
      {
        categoryKey: "versionHistory.categories.fix",
        itemKeys: [
          "versionHistory.v120.fixItem1",
          "versionHistory.v120.fixItem2",
          "versionHistory.v120.fixItem3",
          "versionHistory.v120.fixItem4",
          "versionHistory.v120.fixItem5",
        ],
      },
    ],
  },
  {
    version: "1.1.1",
    dateKey: "versionHistory.v111.date",
    sections: [
      {
        categoryKey: "versionHistory.categories.improve",
        itemKeys: [
          "versionHistory.v111.quickActionsItem1",
        ],
      },
    ],
  },
  {
    version: "1.1.0",
    dateKey: "versionHistory.v110.date",
    sections: [
      {
        categoryKey: "versionHistory.categories.new",
        itemKeys: [
          "versionHistory.v110.searchItem1",
        ],
      },
      {
        categoryKey: "versionHistory.categories.improve",
        itemKeys: [
          "versionHistory.v110.updateItem1",
        ],
      },
    ],
  },
  {
    version: "1.0.0",
    dateKey: "versionHistory.v100.date",
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

