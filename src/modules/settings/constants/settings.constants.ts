export const DEFAULT_ACCOUNT_SETTINGS_KEYS = {
  defaultExpenseAccountId: "default_expense_account_id",
  defaultExpensePocketId: "default_expense_pocket_id",
  defaultIncomeAccountId: "default_income_account_id",
  defaultIncomePocketId: "default_income_pocket_id",
} as const;

export type DefaultAccountSettingKey =
  (typeof DEFAULT_ACCOUNT_SETTINGS_KEYS)[keyof typeof DEFAULT_ACCOUNT_SETTINGS_KEYS];
