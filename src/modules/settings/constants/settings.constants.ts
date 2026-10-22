export const DEFAULT_ACCOUNT_SETTINGS_KEYS = {
  defaultExpenseAccountId: "default_expense_account_id",
  defaultExpensePocketId: "default_expense_pocket_id",
  defaultIncomeAccountId: "default_income_account_id",
  defaultIncomePocketId: "default_income_pocket_id",
} as const;

export type DefaultAccountSettingKey =
  (typeof DEFAULT_ACCOUNT_SETTINGS_KEYS)[keyof typeof DEFAULT_ACCOUNT_SETTINGS_KEYS];

export const TRANSACTION_VIEW_MODE_SETTING_KEY =
  "transaction_list_view_mode";

export const DEVELOPER_MODE_SETTING_KEY = "developer.mode";

export const EXPERIENCE_HOME_SETTING_KEY = "experience.home";

export const FORM_FIELD_SETTING_KEYS = {
  transactionName: "form.transactionName",
  split: "form.split",
  attachments: "form.attachments",
  labels: "form.labels",
  note: "form.note",
  quickPresets: "form.quickPresets",
  exactTime: "form.exactTime",
  installments: "form.installments",
} as const;

export type FormFieldSettingKey =
  (typeof FORM_FIELD_SETTING_KEYS)[keyof typeof FORM_FIELD_SETTING_KEYS];

export const NAV_VISIBILITY_SETTING_KEYS = {
  calendar: "nav.calendar",
  creditCards: "nav.creditCards",
  categories: "nav.categories",
  budgets: "nav.budgets",
  goals: "nav.goals",
  reports: "nav.reports",
  notes: "nav.notes",
} as const;

export type NavVisibilityKey = keyof typeof NAV_VISIBILITY_SETTING_KEYS;

export const NAV_HREF_BY_VISIBILITY_KEY: Record<
  NavVisibilityKey,
  string
> = {
  calendar: "/calendar",
  creditCards: "/credit-cards",
  categories: "/categories",
  budgets: "/budgets",
  goals: "/goals",
  reports: "/reports",
  notes: "/notes",
};

export const PROMPT_SETTING_KEYS = {
  firstExpenseDismissed: "prompt.firstExpenseDismissed",
  quickPresetsOfferDismissed: "prompt.quickPresetsOfferDismissed",
  transfersOfferDismissed: "prompt.transfersOfferDismissed",
  creditCardsOfferDismissed: "prompt.creditCardsOfferDismissed",
  dashboardWalkthroughDismissed: "prompt.dashboardWalkthroughDismissed",
  accountsWalkthroughDismissed: "prompt.accountsWalkthroughDismissed",
  firstTransactionCelebrated: "prompt.firstTransactionCelebrated",
} as const;

export const ONBOARDING_SETUP_STRATEGY_KEY = "workspace.setupStrategy";
export const GUIDED_SETUP_STRATEGY = "guided";

export const USER_NICKNAME_SETTING_KEY = "user_nickname";
