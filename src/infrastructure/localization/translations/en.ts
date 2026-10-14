export const en = {
  common: {
    cancel: "Cancel",
    close: "Close",
    goBack: "Go back",
    ok: "OK",
    search: "Search",
  },
  navigation: {
    dashboard: "Dashboard",
    accounts: "Accounts",
    transactions: "Transactions",
    scheduledTransactions: "Scheduled Transactions",
    calendar: "Calendar",
    creditCards: "Credit Cards",
    creditCardMonitoring: "Credit Card Monitoring",
    categories: "Categories",
    budgets: "Budgets",
    goals: "Goals",
    reports: "Reports",
    notes: "Notes",
    sqliteMonitor: "SQLite Monitor",
    settings: "Settings",
    localBackup: "Local Backup",
    googleDriveBackup: "Google Drive Backup",
    language: "Language",
    currencySetup: "Currency Setup",
    menu: "MENU",
    openMenu: "Open navigation menu",
    closeMenu: "Close navigation menu",
  },
  brand: {
    tagline: "Continuous financial improvement",
    logoAccessibility: "%{name} logo",
  },
  sync: {
    localOnly: "Local only",
    accessibility: "Sync status: %{label}. Tap to open settings.",
  },
  settings: {
    languageSection: "LANGUAGE",
    languageTitle: "Language",
    languageSystemValue: "System default · %{language}",
    languageAccessibility: "Current language: %{language}. Tap to change.",
    currencySection: "CURRENCY & NUMBERS",
    currencySetup: "Currency Setup",
    currencySetupDescription: "Currency, signs, decimals, and amount colors",
    currencySetupAccessibility: "Configure currency and number formatting",
    defaultAccountsSection: "DEFAULT ACCOUNTS",
    expense: "Expense",
    income: "Income",
    defaultAccountNone: "None (First available)",
    defaultAccountPickerNone: "None (First available account)",
    defaultExpenseAccessibility:
      "Default expense account: %{account}. Tap to change.",
    defaultIncomeAccessibility:
      "Default income account: %{account}. Tap to change.",
    defaultExpenseTitle: "Default Expense Account",
    defaultIncomeTitle: "Default Income Account",
    availablePocket: "Available",
    backupSection: "BACKUP & SYNC",
    localBackupAccessibility: "Manage local backups",
    localBackupDescription: "Create, export, or restore an on-device backup",
    googleDriveAccessibility: "Manage Google Drive backups",
    googleDrive: "Google Drive",
    googleDriveDescription: "Connect, create, or restore a cloud backup",
    backupPaused: "Backup paused",
    backupPausedDescription:
      "Sample records are temporary and are not uploaded to Google Drive. Start a personal workspace to enable backup.",
    appearanceSection: "THEME & COLOR PRESETS",
    themeAccessibility: "Current theme: %{theme}. Tap to change.",
    followingAppearance: "Following device appearance",
    paletteSaved: "%{mode} palette - saved on this device",
    light: "Light",
    dark: "Dark",
    sourceManagementSection: "SOURCE MANAGEMENT",
    hexColors: "Hex Colors",
    hexColorsAccessibility: "Manage hex colors. %{count} colors available.",
    dangerZone: "DANGER ZONE",
    resetData: "Reset Data",
    resetDataDescription:
      "Permanently erase all local app data and start over.",
    aboutSection: "ABOUT",
    whatsNew: "What's New",
    whatsNewDescription: "See highlights from the latest app updates",
    whatsNewAccessibility: "Open what's new release notes",
  },
  currency: {
    defaultCurrency: "Default currency",
    displayCurrency: "Display currency",
    displayCurrencyDescription: "Show the currency on amount values",
    colorAmounts: "Color amount values",
    colorAmountsDescription: "Color positive and negative amount values",
    negativeNumber: "Negative Number",
    catalogTitle: "Currencies",
    catalogRowLabel: "Currencies & decimal places",
    catalogRowValue: "%{count} currencies",
    catalogDescription:
      "Add custom currencies or adjust decimal places before a currency is used in accounts, goals, rates, or as your default currency.",
    decimalPlacesLabel: "%{count} decimal places",
    sampleAmount: "Example",
    addCurrency: "Add currency",
    usedChip: "Used",
    usageClickToView: "Click to view",
    usedLockedMessage:
      "This currency is tied to accounts, goals, or your default currency. Decimal places and details cannot be changed.",
    usageChipAccessibility: "Used, show where this currency is referenced",
    usageModalLink: "See where it is used",
    usageModalTitle: "Where %{code} is used",
    usageModalIntro: "%{code} is referenced in the following places:",
    usageModalEmpty: "No active references were found for %{code}.",
    usageReasonAccounts: "%{count} account(s)",
    usageReasonGoals: "%{count} goal(s)",
    usageReasonTransactions: "%{count} transaction(s)",
    usageReasonExchangeRates: "Conversion rate settings (%{count})",
    usageReasonDefault: "Your default currency for totals and new accounts",
    fieldCode: "Currency code",
    fieldName: "Name",
    fieldNamePlaceholder: "Bitcoin",
    fieldSymbol: "Symbol",
    fieldDecimalPlaces: "Decimal places",
    fieldDecimalPlacesHint: "Whole number from 0 to 18 (e.g. 2 for cents, 0 for yen).",
    builtinEditHint: "Built-in currencies: you can only change decimal places before use.",
    deleteTitle: "Delete currency",
    deleteAction: "Delete",
    deleteCurrency: "Delete currency",
    deleteConfirm:
      "Delete %{code}? Conversion rate settings for this currency will be removed. This cannot be undone.",
    errorTitle: "Could not save",
    decimalFormat: "Decimal Format",
    automaticFormat: "Automatic · Based on device region",
    chooseCurrency: "Default Currency",
    chooseCurrencyDescription:
      "Choose the currency used for combined totals and new accounts.",
    searchCurrencies: "Search by currency name or code",
    noCurrenciesFound: "No currencies match your search.",
    negativeNumberDescription: "Choose how negative amount values are displayed.",
    decimalFormatDescription:
      "Choose the thousands and decimal separator format.",
    helpTitle: "About Currency Setup",
    helpMessage:
      "The default currency is used for combined totals and new accounts. Existing accounts keep their saved currency. Display options never change stored financial values.",
  },
  language: {
    helpTitle: "About Language",
    helpMessage:
      "Choose the language used for navigation and settings. System default follows your device language when a supported translation is available.",
    searchPlaceholder: "Search languages",
    searchAccessibility: "Search languages",
    systemDefault: "System default",
    systemDefaultDescription: "Currently %{language}",
    selectedAccessibility: "%{language}, selected",
    optionAccessibility: "Use %{language}",
    moreComingSoon: "More languages coming soon.",
    noResultsTitle: "No languages found",
    noResultsDescription: "Try another language name or locale code.",
  },
  themePicker: {
    closeAccessibility: "Close theme picker",
    title: "Choose appearance",
    subtitle: "Preview the full app palette before you leave this screen.",
    followDevice: "Follow device appearance",
    followDeviceDescription: "Paper in light mode and Ink in dark mode.",
    palettes: "PALETTES",
    choices: "%{count} choices",
  },
  whatsNew: {
    heading: "What's New",
    continue: "Continue",
    dismissAccessibility: "Dismiss what's new",
    versionLabel: "Version %{version}",
    empty: "Release notes for this version are not available yet.",
    v100: {
      title: "Welcome to Kaizen Finance",
      item1:
        "Track accounts, transactions, budgets, and goals with an offline-first local database.",
      item2:
        "Back up and restore your data with local archives or Google Drive sync.",
      item3:
        "Customize themes, languages, and currency formatting to match how you manage money.",
    },
    v100fixes: {
      title: "Fixes & improvements",
      item1:
        "Fixed an error when editing a scheduled transaction that still needs attention (due or failed).",
      item2:
        "Pending scheduled occurrences now pick up your latest amount, account, and category when you edit the schedule.",
    },
  },
  resetData: {
    dismissAccessibility: "Dismiss reset data confirmation",
    title: "Reset all data?",
    message:
      "This permanently deletes your accounts, transactions, budgets, goals, notes, settings, attachments, and app-managed local backups from this device.",
    externalNote: "Exported files and Google Drive backups will not be deleted.",
    confirmationInstruction: "Type KAIZEN to confirm",
    confirmationAccessibility: "Type KAIZEN to confirm resetting all data",
    deleteAll: "Delete all data",
  },
} as const;

export type TranslationCatalog = typeof en;

export type TranslationCatalogShape<T> = {
  [Key in keyof T]: T[Key] extends string
    ? string
    : TranslationCatalogShape<T[Key]>;
};

type NestedKeyOf<T> = {
  [Key in keyof T & string]: T[Key] extends string
    ? Key
    : T[Key] extends Record<string, unknown>
      ? `${Key}.${NestedKeyOf<T[Key]>}`
      : never;
}[keyof T & string];

export type TranslationKey = NestedKeyOf<TranslationCatalog>;
