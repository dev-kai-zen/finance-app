import type { ReleaseNoteBlock } from "@/modules/whats-new/types/whats-new.types";

/** Newest releases first. Append a block for each store release you want to highlight. */
export const RELEASE_NOTES: ReleaseNoteBlock[] = [
  {
    version: "1.0.0",
    titleKey: "whatsNew.v100.title",
    sections: [
      {
        categoryKey: "whatsNew.categories.accounts",
        itemKeys: [
          "whatsNew.v100.accountsItem1",
          "whatsNew.v100.accountsItem2",
        ],
      },
      {
        categoryKey: "whatsNew.categories.transactions",
        itemKeys: [
          "whatsNew.v100.transactionsItem1",
          "whatsNew.v100.transactionsItem2",
        ],
      },
      {
        categoryKey: "whatsNew.categories.calendar",
        itemKeys: [
          "whatsNew.v100.calendarItem1",
          "whatsNew.v100.calendarItem2",
        ],
      },
      {
        categoryKey: "whatsNew.categories.budgets",
        itemKeys: [
          "whatsNew.v100.budgetsItem1",
          "whatsNew.v100.budgetsItem2",
        ],
      },
      {
        categoryKey: "whatsNew.categories.scheduledTransactions",
        itemKeys: [
          "whatsNew.v100.scheduledItem1",
        ],
      },
      {
        categoryKey: "whatsNew.categories.creditCards",
        itemKeys: [
          "whatsNew.v100.creditCardsItem1",
        ],
      },
      {
        categoryKey: "whatsNew.categories.goals",
        itemKeys: [
          "whatsNew.v100.goalsItem1",
        ],
      },
      {
        categoryKey: "whatsNew.categories.reports",
        itemKeys: [
          "whatsNew.v100.reportsItem1",
        ],
      },
      {
        categoryKey: "whatsNew.categories.security",
        itemKeys: [
          "whatsNew.v100.securityItem1",
          "whatsNew.v100.securityItem2",
        ],
      },
      {
        categoryKey: "whatsNew.categories.backup",
        itemKeys: [
          "whatsNew.v100.backupItem1",
        ],
      },
    ],
  },
];

