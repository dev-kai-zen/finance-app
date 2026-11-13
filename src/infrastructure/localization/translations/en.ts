export const en = {
  dataImport: {
    ui: {
      asset: "Asset",
      liability: "Liability",
      transferCounts: "Money out: %{outgoing} | Money in: %{incoming}",
      transferMismatch: "No outgoing/incoming pair found. Check the transfer option.",
      amountHelp: "Use one column when all amounts appear together. Use separate columns when spending and income appear in different columns, such as Debit and Credit.",
      "required": "Required",
      "optional": "Optional",
      "ready": "Ready to import",
      "attention": "Needs attention",
      "excluded": "Will be left out",
      "previouslyImported": "Previously imported",
      "details": "Details",
      "repeatHelp": "This entry was saved in a completed earlier import. It will be left out to avoid adding it twice, even if you later deleted the original transaction.",
      "draftOnly": "Preview only. Records are saved when you tap Import records.",
      "applyCorrections": "Apply corrections",
      "searchOptions": "Search options",
      "searchEntries": "Search entries",
      "noResults": "No entries found. Try another filter or search.",
      "fileName": "File: %{name}",
      "rowCount": "No. of rows: %{count}",
      "interpretedDate": "Interpreted date: %{date}",
      "validFormat": "Valid format",
      "invalidFormat": "Invalid format",
      "invalidDates": "%{count} dates need attention.",
      "viewBalances": "View balances and totals",
      "status": "Status",
      "importCount": "Import %{count} records",
      "mapUnknownTypes": "Choose how to treat %{count} unrecognized transaction types.",
      "typeMappingTitle": "Match your transaction types",
      "treatAs": "Use in Kaizen",
      "preserveBalance": "The existing starting balance will stay unchanged.",
      "otherExpense": "Other Expense",
      "otherIncome": "Other Income",
      "noCategory": "No category in your file",
      "accountsHelp": "Choose an asset or liability account. Credit card imports are not supported yet. For new accounts, check the starting balance before importing.",
      "categoriesHelp": "Matching categories are preselected. Unmatched entries use Other Expense or Other Income. Use the category picker to change the choice.",
      "reviewHelp": "Import is available when every included entry is ready. Entries you leave out and previously imported entries will not be added. Transfers may combine two file rows into one record."
    },

    wizard: {
      columnDateFormat: "Format: %{format}",
      formatExpectedDate: "Format: Date (%{format})",
      formatExpectedNumber: "Format: Number",
      formatExpectedTime: "Format: Time",
      formatExpectedCurrency: "Format: Currency code",
      dateFormatMismatch: "The format does not match. We match it using the first data row. Check the dates before importing.",
      formatMismatchDate: "Format doesn't match: Expected date (%{format}). Row 1 value: \"%{value}\"",
      formatMismatchAmount: "Format doesn't match: Expected numeric amount. Row 1 value: \"%{value}\"",
      formatMismatchDecimal: "Decimal format mismatch: Row 1 appears to use \"%{char}\" as decimal separator.",
      formatMismatchDebitCredit: "Debit/Credit must be a positive number. Row 1 value: \"%{value}\"",
      formatMismatchTime: "Format doesn't match: Expected time (e.g. 14:30 or 2:30 PM). Row 1 value: \"%{value}\"",
      formatMismatchCurrency: "Format doesn't match: Expected 3-letter currency code (e.g. USD, PHP). Row 1 value: \"%{value}\"",
      formatMismatchType: "Format doesn't match: Expected transaction type. Row 1 value: \"%{value}\"",
      formatMismatchAccount: "Warning: Row 1 value (\"%{value}\") looks like an amount or date, not an account name.",
      formatMismatchCategory: "Warning: Row 1 value (\"%{value}\") looks like an amount or date, not a category name.",
      alreadyUsedIn: "Already used in %{field}",
      switchTo: "Switch to",
      newAccountTitle: "Create New Account",
      newAccountSubtitle: "Kaizen will create this account before importing your transactions.",
      fromYourFile: "From your file",
      matchKaizenCategory: "Match this Kaizen Category",
      matchedViaKai: "Matched via Kai Knowledge",
      categoryTypeMismatchNotice: "\"%{name}\" is typically an expense category in Kaizen, but this row is classified as income. You can map it to an income category or create a new one.",
      resume: "Continue setting up this file",
      accountChoiceHelp: "This account choice applies to all entries from the same account in your file.",
      categoryChoiceHelp: "This category choice applies to entries with the same category in your file.",
      fileRows: "%{count} file entries",
      "step": "Step %{current} of %{total}",
      "columnsTitle": "Set up your file",
      "columnsDescription": "In this step, check how dates and amounts are written, then match the columns in your file.",
      "accountsTitle": "Match your accounts",
      "accountsDescription": "Choose where each account from your file belongs in Kaizen. Use an existing account or set up a new one.",
      "categoriesTitle": "Match your categories",
      "categoriesDescription": "Choose how to group income and spending. You can keep categories from your file or use existing Kaizen categories.",
      "reviewTitle": "Review before importing",
      "reviewDescription": "Check the findings and balances below. You can edit entries or leave them out before saving. Nothing has been imported yet.",
      "fromFile": "In your file: %{name}",
      "saveToAccount": "Save these entries to",
      "saveToCategory": "Use this Kaizen category",
      "example": "Example from your file: %{value}",
      "dateExample": "The first date will be read as %{value}.",
      "startHelp": "Choose a file exported from your old app or bank. We will guide you through each step before saving anything.",
      "needTemplate": "Need an example file?",
      "formatsTitle": "Check dates and numbers",
      "amountLayout": "Where are the amounts in your file?",
      "oneAmount": "One column for amounts",
      "oneAmountHelp": "For example: Amount contains -150 for spending and 2000 for income. A separate type column can also tell us which is which.",
      "twoAmounts": "Separate columns for money out and money in",
      "twoAmountsHelp": "For example: Debit contains 150 for spending, and Credit contains 2000 for income. Match either or both columns below.",
      "mappingTitle": "Match the file columns",
      "mappingHelp": "For each item on the left, choose the column that contains it in your file. We have suggested matches where possible.",
      "appColumn": "What Kaizen needs",
      "fileColumn": "Column in your file",
      "fallbackAccount": "Account name for this file",
      "accountExample": "For example: Cash or BPI Savings",
      "fallbackAccountHelp": "Your file has no account column selected. Enter a name for these entries; you will choose the matching Kaizen account in the next step.",
      "transfersTitle": "Money moved between your accounts",
      "transferDetected": "Your file contains %{count} transfer entries. Choose the example that looks like your file.",
      "transferOnce": "Each transfer appears once",
      "transferOnceHelp": "Example: Savings to Cash, 300.00. Match the account and destination account columns above.",
      "transferTwice": "Each transfer appears twice",
      "transferTwiceHelp": "Example: Savings shows -300.00 and Cash shows +300.00. We combine the outgoing and incoming entries into one transfer.",
      "transferMismatch": "This file does not contain both negative outgoing and positive incoming transfer amounts. Try the first option, or correct the entries during review.",
      "transferCounts": "Found %{outgoing} outgoing and %{incoming} incoming entries. Only unique matches with the same date and amount can be combined.",
      "transferHelp": "A transfer moves money between accounts you own, such as Savings to Cash. It should not count as income or spending.\n\nChoose once if your file has one entry with both accounts. Choose twice if it has a negative entry in one account and a positive entry in the other. Both entries must have the same date, amount, and currency. Unclear matches will be shown for review.",
      "showOptional": "More details (optional)",
      "hideOptional": "Hide optional details",
      "optionalHelp": "These details are optional. You can leave them as they are unless your file includes more information.",
      "sourceLabel": "Name of your old app or bank (optional)",
      "sourceExample": "For example: Wallet or BPI",
      "sourceHelp": "This is only a label to remember where the file came from. For example, enter Wallet for an export from Wallet, or BPI for a bank file. We do not connect to the app or bank.\n\nCSV is the file format, not the name of your bank. Leave this blank if you are unsure. If you add a name, use the same one next time to help recognize previously imported entries.",
      "noAccounts": "Go back and select an account column or enter an account name for the file.",
      "noCategories": "There are no income or spending categories to match. You can continue to review.",
      "findings": "What we found",
      "readyCount": "%{count} entries are ready to import.",
      "excludedCount": "%{count} file entries will be left out.",
      "fixCount": "%{count} file entries need attention.",
      "fixHelp": "Entries needing attention appear first. Open Edit this entry to correct the details, or choose Leave out.",
      "projectedBalances": "Your balances after this import",
      "before": "Current or starting balance: %{amount}",
      "after": "After importing: %{amount}",
      "nextAccounts": "Continue to accounts",
      "nextCategories": "Continue to categories",
      "nextReview": "Continue to review",
      "previous": "Previous step",
      "missingColumns": "Select a file column or enter a value for: %{fields}.",
      "cannotImport": "Correct the entries needing attention, or leave them out, to enable importing.",
      "nothingToImport": "There are no new entries ready to import.",
      "editEntry": "Edit this entry",
      "editHelp": "Changes here affect this import only. Your original file stays unchanged. Check the account and category choices as well.",
      "applyChanges": "Apply changes and check again",
      "transferTo": "Transfer to: %{account}",
      "issueActions": {
        type: "Choose a type below, or leave this entry out.",
        "columns": "Return to file setup to check which column is selected for each item.",
        "date": "Edit the date or time below, or go back to change the date format.",
        "amount": "Edit the amount below. Check whether your file uses a comma or a dot for decimals.",
        "account": "Choose an account below. For a new account, select its type and check the starting balance.",
        "category": "Choose an income or spending category below.",
        "currency": "Check the currency in this entry and the selected account. Both must use the same currency.",
        "unsupported": "Leave this entry out and add it manually after importing the supported entries.",
        "transfer": "Check both account entries, the amounts, and dates. You can also go back to change the transfer option.",
        "balance": "Change the new account starting date below, choose another account, or leave this entry out.",
        "name": "Shorten the affected name, description, note, or label below.",
        "duplicate": "Leave this entry out, or confirm it is a separate purchase that should be imported."
      }
    },

    help: "About importing data",
    closeHelp: "Got it",
    downloadTemplate: "Download CSV template",
    templateSaved: "Saved %{fileName} to the folder you selected.",
    personalOnly: "Switch to your personal workspace before importing your records.",
    "title": "Import data",
    "settingsDescription": "Bring accounts and transaction history from a CSV file",
    "intro": "Bring your accounts and transaction history into Kaizen. Match your file columns, review records, then confirm the balances before saving.",
    "limits": "CSV, TSV, or UTF-8 text files: up to 2 MB and 1,000 records. Credit cards, foreign-currency records, splits, pockets, fees, installments, and schedules need separate setup.",
    "kind": "What would you like to import?",
    "transactions": "Transaction history",
    "accounts": "Accounts only",
    "pickFile": "Choose CSV file",
    "template": "Share CSV template",
    "history": "Import history",
    "nativeOnly": "Import files using the Android or iOS app. A local safety backup is required.",
    "columnsHelp": "Match each field to one column. Examples appear beside the column names. Leave Amount unmapped when using Debit and Credit. Transaction types must be income, expense, or transfer; without a type, signed amounts or debit/credit columns determine it.",
    "source": "Source app or bank (use the same name for future imports)",
    "dateFormat": "Date format in the file",
    "decimal": "Number format",
    "defaultCurrency": "Currency when missing from the file",
    "defaultAccount": "Account name when missing from the file",
    "transferMode": "How are transfers recorded?",
    "singleTransfer": "One positive row: source account → destination account",
    "pairedTransfer": "Two signed rows: negative outgoing + positive incoming",
    "unmapped": "Not mapped",
    "choose": "Choose…",
    "next": "Match accounts and categories",
    "matchingHelp": "Choose existing accounts and categories, or create new ones. Review the opening balance of every new account. Labels are matched by name or created automatically.",
    "matchAccount": "Destination account",
    "createAccount": "Create a new account",
    "matchCategory": "Destination category",
    "createCategory": "Create this category",
    "missingCategory": "Missing category",
    "existingBalance": "Existing account: its opening balance stays unchanged. Account-only imports cannot update existing accounts.",
    "balanceDateInput": "Balance date (YYYY-MM-DD)",
    "openingHelp": "For history, enter the balance immediately before the first imported transaction. For accounts only, enter the balance on this date. Zero is a suggestion; verify it against your old records.",
    "preview": "Review import",
    "editColumns": "Edit columns and formats",
    "review": "Review records and balances",
    "reviewCounts": "%{accepted} ready · %{skipped} excluded · %{errors} need attention",
    "reviewHelp": "Projected balances include accepted records only. Resolve or explicitly exclude every problem row. Transfers are counted once and do not affect income or expense totals.",
    "confirm": "Import records",
    "confirmHelp": "Save the reviewed records and any new accounts, categories, and labels? A local safety backup will be created first. Importing adds data to your current workspace.",
    "editMatches": "Edit account and category matches",
    "row": "Row %{number}",
    "repeated": "Already imported — excluded",
    "excluded": "Excluded by you",
    "accepted": "Ready to import",
    "duplicateAccepted": "Similar record — you chose to import it",
    "include": "Include this entry",
    "exclude": "Leave out",
    "keepDuplicate": "Import similar record anyway",
    "counts": "%{imported} imported · %{skipped} excluded",
    "excludedRows": "Excluded file rows: %{rows}",
    "complete": "Import completed",
    "recovery": "A safety backup was saved before importing. Restore it from Local Backup if needed. Restoring replaces your data, including changes made after the backup.",
    "another": "Start another import",
    "emptyHistory": "No completed imports yet. The most recent 30 imports appear here.",
    "working": "Working… Please keep this screen open.",
    "reload": "Reload data",
    "cancel": "Cancel",
    "back": "Go back",
    "leave": "Leave import",
    "leaveHelp": "Discard this import draft? Records are saved only after you confirm the import.",
    "formats": {
      "ymd": "YYYY-MM-DD",
      "dmy": "DD/MM/YYYY",
      "mdy": "MM/DD/YYYY"
    },
    "types": {
      "income": "Income",
      "expense": "Expense",
      "transfer": "Transfer"
    },
    "fields": {
      "date": "Date",
      "time": "Time",
      "amount": "Amount",
      "debit": "Money out (debit)",
      "credit": "Money in (credit)",
      "type": "Type of entry",
      "account": "Account name",
      "toAccount": "Destination account for transfers",
      "currency": "Currency code",
      "category": "Category",
      "subcategory": "Subcategory",
      "name": "Description",
      "note": "Note",
      "labels": "Labels (separated by semicolons)",
      "sourceId": "Original record ID",
      "accountType": "Account type",
      "openingBalance": "Opening balance",
      "balanceDate": "Balance date",
      "openingDate": "Opening date"
    },
    "errors": {
      type: "Choose Expense, Income or Transfer for this entry.",
      workspace: "Switch to your personal workspace before importing.",
      "fileSize": "Choose a file no larger than 2 MB.",
      "rowLimit": "Import at most 1,000 records at a time.",
      "encoding": "Save the file as UTF-8 text, then try again.",
      "csv": "The file has invalid CSV quoting. Check the file and try again.",
      "headers": "Use a header row with unique, nonempty column names and at least one data row.",
      "fileType": "Choose a CSV, TSV, or text file.",
      "sharing": "File sharing is unavailable on this device.",
      "columns": "Check the selected columns and the number of values in this entry.",
      "date": "Check the date, time, and selected date format. Dates must be from 1900 through 2200.",
      "amount": "Check the amount and number format. Use a nonzero amount with the correct currency decimal places.",
      "account": "Choose a valid account and type. Match existing names and currencies instead of creating duplicates.",
      "category": "Choose an income or expense category, or provide a category name of up to 50 characters.",
      "currency": "The record currency must match both accounts and be active in your currency settings.",
      "unsupported": "This record needs a feature that CSV import does not support yet. Exclude it or prepare a supported record.",
      "transfer": "This transfer cannot be matched yet. Check the accounts, amounts, dates, and the transfer option.",
      "balance": "The transaction is before the account opening balance date. Check the history range and starting balance.",
      "name": "Check the name and note lengths: account 100, description 200, note 1,000, label 100 characters.",
      "duplicate": "A similar record or repeated source ID needs review. Exclude it or confirm a legitimate similar purchase.",
      "busy": "An import is already running.",
      "changed": "Your data changed since the preview. Reload data and review the balances again before importing.",
      "backup": "The safety backup could not be saved. Check device storage and try again. No records were imported.",
      "load": "Could not load import data. Reload to try again.",
      "failed": "Could not complete this action. Your draft is kept so you can review it and try again."
    }
  },
  privacy: {
    hideBalances: "Hide balances",
    showBalances: "Show balances",
    stealthMode: "Privacy mode",
    stealthModeDescription: "Mask account balances and financial figures across the app",
  },
  common: {
    enabled: "Enabled",
    disabled: "Disabled",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    goBack: "Go back",
    keep: "Keep",
    ok: "OK",
    search: "Search",
    skipForNow: "Skip for now",
    today: "Today",
    unsavedChangesTitle: "Unsaved Changes",
    unsavedChangesMessage:
      "You have unsaved changes. What would you like to do before leaving?",
    saveChanges: "Save Changes",
    dontSave: "Don't Save",
    keepEditing: "Keep Editing",
    account: "Account",
    uncategorized: "Uncategorized",
  },
  search: {
    openSearch: "Open search",
    searchPlaceholder: "Search...",
    noResultsTitle: "No matching results",
    noResultsSubtitle:
      "Try searching with other keywords like 'password', 'expense', or 'currency'.",
    sectionActions: "QUICK ACTIONS",
    sectionScreens: "SCREENS & FEATURES",
    sectionSettings: "SETTINGS & SECURITY",
    sectionAccounts: "ACCOUNTS",
    sectionCategories: "CATEGORIES",
    sectionTransactions: "TRANSACTIONS",
    sectionBudgets: "BUDGETS",
    sectionGoals: "SAVINGS GOALS",
    sectionNotes: "NOTES",
    sectionSchedules: "SCHEDULED TRANSACTIONS",
    sectionLabels: "LABELS & TAGS",
    sectionPockets: "POCKETS",
    settingStealthMode: "Privacy / Stealth Mode",
    settingStealthModeDesc: "Hide or mask sensitive account balances and totals",
    settingSoundHaptics: "Sound & Haptics Settings",
    settingSoundHapticsDesc: "Configure tactile vibrations and audio chimes",
    settingSupportDev: "Support Development",
    settingSupportDevDesc: "Support the app with a tip or share feedback",
    actionLocalBackup: "Local Backup & Restore",
    actionLocalBackupDesc: "Export or restore SQLite database on local storage",
    actionGoogleDriveSync: "Google Drive Cloud Backup",
    actionGoogleDriveSyncDesc: "Secure cloud backup and restore via Google Drive",
    actionManagePresets: "Quick Presets Management",
    actionManagePresetsDesc: "Manage 1-tap template presets for transactions",
    suggestedTitle: "SUGGESTED SHORTCUTS",
    clearSearch: "Clear",
    itemSettingsBadge: "Settings",
    itemActionBadge: "Action",
    itemScreenBadge: "Screen",
    actionRecordExpense: "Record Expense",
    actionRecordExpenseDesc: "Open transaction form for an expense",
    actionRecordIncome: "Record Income",
    actionRecordIncomeDesc: "Open transaction form for income",
    actionTransfer: "Transfer Money",
    actionTransferDesc: "Transfer funds between your accounts",
    actionAddAccount: "Add New Account",
    actionAddAccountDesc: "Create a bank, cash, or wallet account",
    actionAddBudget: "Create Category Budget",
    actionAddBudgetDesc: "Set a spending limit for a category",
    actionAddGoal: "New Savings Goal",
    actionAddGoalDesc: "Set a new savings milestone or target",
    actionAddNote: "Create Note",
    actionAddNoteDesc: "Add a memo, checklist, or receipt",
    actionAddScheduled: "Add Scheduled Transaction",
    actionAddScheduledDesc: "Create a recurring bill, salary, or transfer",
    actionAddCategory: "Add New Category",
    actionAddCategoryDesc: "Create a custom category group",
    actionAddCreditCard: "Add Credit Card",
    actionAddCreditCardDesc: "Create a credit card account for monitoring",
    actionTransactionsTrash: "Deleted Transactions Trash",
    actionTransactionsTrashDesc:
      "View, restore, or permanently remove deleted transactions",
    actionExportTransactionsCsv: "Export Transactions (CSV)",
    actionExportTransactionsCsvDesc:
      "Save or share transaction records as a CSV spreadsheet",
    actionArchivedAccounts: "Archived Accounts & Pockets",
    actionArchivedAccountsDesc:
      "View and restore hidden or archived accounts and pockets",
    actionChatWithKai: "Chat with Kai",
    actionChatWithKaiDesc:
      "Use AI chat to quickly encode transactions in natural language",
    actionManageAccountTypes: "Manage Account Types",
    actionManageAccountTypesDesc:
      "Customize bank, cash, wallet, and credit card account types",
    screenTransactionsExpense: "Transactions (Expenses)",
    screenTransactionsExpenseDesc: "View history of all recorded expenses",
    screenTransactionsIncome: "Transactions (Income)",
    screenTransactionsIncomeDesc: "View history of all recorded income",
    screenTransactionsTransfer: "Transactions (Transfers)",
    screenTransactionsTransferDesc: "View history of all account transfers",
    screenCategoriesExpense: "Expense Categories",
    screenCategoriesExpenseDesc: "Manage and organize expense categories",
    screenCategoriesIncome: "Income Categories",
    screenCategoriesIncomeDesc: "Manage and organize income categories",
    screenReportIncomeExpense: "Income & Expense Report",
    screenReportIncomeExpenseDesc:
      "Analyze cash flow variance and net earnings across months",
    screenReportCashFlow: "Cash Flow Report",
    screenReportCashFlowDesc: "Analyze total money inflows versus outflows",
    screenReportBalanceSheet: "Balance Sheet Comparison",
    screenReportBalanceSheetDesc:
      "Compare asset values and liabilities across periods",
    screenReportNetWorth: "Net Worth Growth",
    screenReportNetWorthDesc:
      "Track financial health and cumulative wealth growth",
    screenReportLabelsSummary: "Labels Summary Report",
    screenReportLabelsSummaryDesc:
      "View transactions breakdown grouped by labels",
    settingNicknameDesc: "Set your profile nickname and greeting",
    settingDeveloperMessageDesc:
      "Read a personal message and note from the creator",
    settingPrivacyPolicyDesc:
      "Review our offline-first privacy policy and commitment",
    settingTermsDesc: "Read the terms for using Kaizen Finance",
    settingRestorePurchasesDesc:
      "Restore your active Kaizen Pro lifetime license",
    settingQuickSearchDesc:
      "Configure the search button in header and navigation",
    settingSqliteMonitorDesc: "Inspect local database tables and diagnostics",
    guidesToSetting: "Guides to setting",
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
    sendFeedback: "Send Feedback",
    supportDevelopment: "Support & Feedback",
    localBackup: "Local Backup",
    googleDriveBackup: "Google Drive Backup",
    language: "Language",
    currencySetup: "Currency Setup",
    menu: "MENU",
    openMenu: "Open navigation menu",
    closeMenu: "Close navigation menu",
    moreFeatures: "More features",
    moreFeaturesDescription:
      "Show or hide optional menu items. You can change these anytime.",
    resetSimpleMenu: "Reset to simple menu",
    scrollDown: "Scroll down for more items",
    scrollLeft: "Scroll left for more items",
    scrollRight: "Scroll right for more items",
  },
  brand: {
    tagline: "Continuous financial improvement",
    logoAccessibility: "%{name} logo",
  },
  sync: {
    localOnly: "Local only",
    syncing: "Syncing...",
    synced: "Synced",
    waitingNetwork: "Waiting for Wi-Fi",
    failed: "Sync failed",
    accessibility: "Sync status: %{label}. Tap to open settings.",
  },
  scheduledBackup: {
    title: "Scheduled backup",
    description:
      "Upload a full unprotected backup on a daily, weekly, or monthly schedule when you open the app.",
    lastRun: "Last scheduled backup: %{time}",
    neverRun: "Never",
    proTitle: "Scheduled Google Drive Backups",
    proDescription:
      "Automatically upload full backup archives to Google Drive on your chosen schedule with Kaizen Pro.",
  },
  quickSync: {
    title: "Quick Sync",
    description: "Sync changes to Google Drive when your data changes",
    networkLabel: "Sync over",
    wifiOnly: "Wi-Fi only",
    wifiOnlyDescription: "Only sync when connected to Wi-Fi",
    anyNetwork: "Wi-Fi & Mobile data",
    anyNetworkDescription: "Sync over Wi-Fi or mobile data",
    statusLabel: "Status",
    lastSynced: "Last synced: %{time}",
    neverSynced: "Never synced",
    syncNow: "Sync now",
    syncingNow: "Syncing...",
    restore: "Restore",
    restoring: "Restoring...",
    restoreFailed: "Could not restore the Quick Sync backup.",
    restoreConfirmTitle: "Restore Quick Sync?",
    restoreConfirmMessage:
      "This replaces all local data with the latest Quick Sync file from Google Drive. A safety copy is kept in memory and restored automatically if validation fails.",
    restoreConfirmAction: "Restore",
  },
  settings: {
    soundAndHapticsSection: "Sound & Haptics",
    hapticsMaster: "Haptic Feedback",
    hapticsMasterSubtitle: "Tactile vibrations during actions",
    hapticsTransactions: "Record & Edit Transactions",
    hapticsCalculator: "Calculator & Keypad Taps",
    hapticsAlerts: "Budget & Goal Alerts",
    hapticsDestructive: "Delete & Trash Actions",
    hapticsDisabledHint: "Note: If touch vibration is disabled in your device's system settings, vibrations will not be felt.",
    testHaptics: "Test Haptics",
    testSound: "Test Sound",
    soundMaster: "Sound Effects",
    soundMasterSubtitle: "Audio chime for app actions",
    soundTransactions: "Record & Edit Transactions",
    soundCalculator: "Calculator & Keypad Taps",
    soundAlerts: "Budget & Goal Alerts",
    soundDestructive: "Delete & Trash Actions",
    soundOnSave: "Play Sound on Save",
    soundOnSaveSubtitle: "Short chime when a transaction is recorded",
    backupDataSection: "BACKUP & DATA",
    appearanceProfileSection: "APPEARANCE & PROFILE",
    interactionsSection: "INTERACTIONS & FEEDBACK",
    defaultsSection: "DEFAULTS & PREFERENCES",
    notificationsSection: "NOTIFICATIONS & WIDGETS",
    aboutSupportSection: "ABOUT & SUPPORT",
    stealthModeTitle: "Stealth Mode (Hide Balances)",
    stealthModeDescription: "Mask account balances and financial figures across screens",
    generalSection: "GENERAL",
    profileSection: "PROFILE",
    nicknameTitle: "Nickname",
    nicknameDescription: "Personalized name shown on your dashboard",
    nicknameNotSet: "Not set",
    editNicknameTitle: "Edit Nickname",
    editNicknamePrompt:
      "Enter the name you'd like to be called on your dashboard.",
    nicknameSave: "Save",
    nicknameCancel: "Cancel",
    localizationSection: "LOCALIZATION",
    themeTitle: "Theme",
    defaultAccountExpenseLabel: "Default Account (Expense)",
    defaultAccountIncomeLabel: "Default Account (Income)",
    resetDataAccessibility: "Reset all app data. Tap to continue.",
    languageSection: "LANGUAGE",
    languageTitle: "Language",
    languageSystemValue: "System default · %{language}",
    languageAccessibility: "Current language: %{language}. Tap to change.",
    currencySection: "CURRENCY & NUMBERS",
    currencySetup: "Currency Setup",
    currencySetupDescription: "Currency, signs, decimals, and amount colors",
    currencySetupAccessibility: "Configure currency and number formatting",
    remindersTitle: "Reminders",
    remindersDescription: "Daily logging and due bill reminders",
    remindersAccessibility: "Configure reminder settings",
    widgetsTitle: "Home Screen Widgets",
    widgetsDescription:
      "Add quick actions and money insights to your home screen",
    widgetsAccessibility: "Open home screen widget gallery",
    guideHelperTitle: "Guide helper",
    guideHelperDescription:
      "Show a draggable Guide button on screens to replay walkthroughs",
    quickSearchTitle: "Quick Search",
    quickSearchDescription:
      "Show search button in header and navigation to quickly jump to features",
    kaiKnowledgeTitle: "Manage Kai Knowledge",
    kaiKnowledgeDescription:
      "Teach Kai keywords for actions, categories, and accounts",
    kaiChatModeTitle: "Chat with Kai Mode",
    kaiChatModeSubtitle: "Review first or auto-save",
    gesturesTitle: "Gestures",
    gesturesAccessibility: "Gestures: %{action}. Tap to configure.",
    gesturesSubtitle: "Shake shortcuts & quick actions",
    shakeGestureTitle: "Shake the Device",
    shakeGestureDescription:
      "Quickly shake your phone from any screen to open your selected quick action.",
    shakeActionChatWithKai: "Chat with Kai",
    shakeActionChatWithKaiDescription:
      "Open AI assistant to record transactions with natural language",
    shakeActionManualEntry: "Manual Entry",
    shakeActionManualEntryDescription:
      "Open the standard transaction form directly",
    shakeActionDisabled: "Disabled",
    shakeActionDisabledDescription:
      "Do not trigger any action when device is shaken",
    testShakeGesture: "Test Selected Action",
    testShakeGestureDev: "Simulate Shake Gesture (Dev)",
    testShakeGestureDevDescription:
      "Trigger the configured shake action to test without physically shaking",
    shakeDisabledAlert:
      "Shake Gesture is currently disabled. Select Chat with Kai or Manual Entry to test.",
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
    securitySection: "SECURITY & PRIVACY",
    securityMenuTitle: "Password & Fingerprint",
    securityMenuSubtitleConfigured: "Protected · Password active",
    securityMenuSubtitleNotConfigured: "Not set · Tap to set up",
    securityMenuAccessibility:
      "Open security settings. Configure password and biometric unlock.",
    dangerZone: "DANGER ZONE",
    resetData: "Reset Data",
    resetDataDescription:
      "Permanently erase all local app data and start over.",
    aboutSection: "ABOUT",
    versionHistory: "Version History",
    versionHistoryDescription: "See what changed in each app version",
    versionHistoryAccessibility: "Open version history",
    developerMessage: "Developer Message & Goal",
    developerMessageSubtitle:
      "A note from John Paul Arellano on our mission and financial literacy",
    developerMessageAccessibility: "Read message and goal from the developer",
    supportDevelopment: "Support Development",
    supportDevelopmentSubtitle:
      "Rate Kaizen on Google Play, share with friends, or send feedback",
    supportDevelopmentAccessibility: "Open support development options",
    privacy: "Privacy",
    privacySubtitle: "Read our privacy policy online",
    privacyAccessibility: "Open privacy policy website",
    privacyOpenError: "Could not open privacy policy website.",
    terms: "Terms",
    termsSubtitle: "Read the terms for using Kaizen Finance",
    termsAccessibility: "Open terms of service website",
    termsOpenError: "Could not open terms of service website.",
    appVersion: "App Version",
    buildReleased: "Released",
    buildDevelopment: "Development",
    tierPro: "Pro",
    tierFree: "Free",
    developerModeEnabledTitle: "Developer mode on",
    developerModeEnabledMessage: "SQLite Monitor is now available in the menu.",
    developerSection: "DEVELOPER",
    developerMode: "Developer mode",
    developerModeDescription: "Show SQLite Monitor in the navigation menu",
    sqliteMonitor: "SQLite Monitor",
    sqliteMonitorDescription: "Browse tables and run SQL on this device",
    moreToolsSection: "MORE TOOLS",
    moreToolsDescription: "Show extra screens in the menu when you need them",
    navCalendar: "Calendar",
    navCreditCards: "Credit Cards",
    navCategories: "Categories",
    navBudgets: "Budgets",
    navGoals: "Goals",
    navReports: "Reports",
    navNotes: "Notes",
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
    catalogDescription: "Add custom currencies or adjust decimal places.",
    catalogHelpTitle: "About currencies",
    catalogHelpMessage:
      "Add custom currencies or adjust decimal places before a currency is used in accounts, goals, rates, or as your default currency. Built-in currencies keep their code and name; decimal places can change only before use.",
    catalogHelpAccessibility: "Currencies help",
    catalogHelpHint: "Displays help for managing currencies",
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
    codeAlreadyInUse: "This currency code is already in use.",
    fieldName: "Name",
    fieldNamePlaceholder: "Canadian Dollar",
    fieldSymbol: "Symbol",
    fieldDecimalPlaces: "Decimal places",
    fieldDecimalPlacesHint:
      "Whole number from 0 to 3 (e.g. 2 for cents, 0 for yen, 3 for dinar).",
    builtinEditHint:
      "Built-in currencies: you can only change decimal places before use.",
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
    negativeNumberDescription:
      "Choose how negative amount values are displayed.",
    decimalFormatDescription:
      "Choose the thousands and decimal separator format.",
    helpTitle: "About Currency Setup",
    helpMessage:
      "The default currency is used for combined totals and new accounts. Existing accounts keep their saved currency. Display options never change stored financial values.",
  },
  googleDriveBackup: {
    helpTitle: "About Google Drive Backup",
    helpMessage:
      "Keep an exported copy of your financial database in your Google Drive account and restore it on another device. Connect your account, create backups on demand, and choose a saved archive when restoring.",
    loading: "Loading Google Drive backup...",
    loadingBackups: "Loading backups...",
    onboardingQuickSyncPromptTitle: "Quick Sync backup found",
    onboardingQuickSyncPromptMessage:
      "We found an automatic Quick Sync file on your Google Drive. Restore it for the latest data, or choose a full encrypted backup instead.",
    restoreQuickSyncTitle: "Restore Quick Sync",
    restoreQuickSyncDescription: "Latest auto-sync from %{date}",
    restoreQuickSyncAction: "Restore Quick Sync",
    restoreQuickSyncUseFullBackup: "Choose full backup",
    restoreQuickSyncConfirmTitle: "Restore Quick Sync?",
    restoreQuickSyncConfirmMessage:
      "This replaces all local data with your Quick Sync file and turns Quick Sync back on for this device.",
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
  scheduledTransactions: {
    helpTitle: "About Scheduled Transactions",
    helpMessage:
      "Set up recurring income, expenses, or transfers. Choose whether each occurrence posts automatically or waits for your confirmation. Due or failed items appear under Needs attention; you can pause, end, or archive schedules without removing transactions already posted.",
    advancePost: "Advance Post",
    advancePostTitle: "Advance Post Schedule",
    advancePostDesc:
      "Record this scheduled transaction ahead of time. The next trigger date will advance to the following recurring cycle.",
    advancePostDateLabel: "Transaction Date",
    advancePostCurrentDate: "Current scheduled date",
    advancePostNextDate: "Next cycle date",
    advancePostCompletes: "Final occurrence (schedule will complete)",
    advancePostConfirm: "Advance Post",
    advancePostToastTitle: "Scheduled transaction advance posted",
    advancePostToastNext: "Next schedule automatically moved to %{date}.",
    advancePostToastCompleted: "This scheduled transaction is now completed.",
    today: "Today",
  },
  themePicker: {
    closeAccessibility: "Close theme picker",
    title: "Choose appearance",
    subtitle: "Preview the full app palette before you leave this screen.",
    followDevice: "Follow device appearance",
    followDeviceDescription: "Paper in light mode and Ink in dark mode.",
    palettes: "PALETTES",
    choices: "%{count} choices",
    tabPresets: "Presets",
    tabCustomStudio: "Custom Studio",
    customBannerTitle: "Custom Theme Studio",
    customBannerSubtitle: "Design your own color combination and surface tint.",
    customBannerActive: "Your custom color theme is currently active.",
    customizeAction: "Customize",
    filterAll: "All",
    livePreview: "LIVE PREVIEW",
    activeBadge: "Active",
    baseModeLabel: "Base Mode",
    modeLight: "Light",
    modeDark: "Dark",
    modeOled: "OLED Black",
    surfaceTintLabel: "Surface & Card Tint",
    surfaceTintHint: "Infuse your primary color into backgrounds and cards.",
    tintNeutral: "Neutral",
    tintSubtle: "Subtle",
    tintRich: "Rich",
    primaryColorLabel: "Primary Brand Color",
    primaryColorHint: "Buttons, active tabs, and primary highlights.",
    primaryUsedFor: "Applied to: Action buttons (Save/Add), active navigation tabs, floating action button (+), selected chips, budget & goal progress bars.",
    accentColorLabel: "Accent Color",
    accentColorHint: "Secondary highlights, badges, and chart spikes.",
    accentUsedFor: "Applied to: Kai AI assistant badges & sparkles, secondary report metrics (savings rate & ratios), and notification icons.",
    applyCustomTheme: "Apply Custom Theme",
    unlockCustomThemePro: "Unlock Pro to Apply Custom Theme",
    customShadeLabel: "Fine-tune Tone & Brightness",
  },
  versionHistory: {
    heading: "Version History",
    continue: "Continue",
    dismissAccessibility: "Dismiss version history",
    versionLabel: "Version %{version}",
    empty: "Release notes for this version are not available yet.",
    categories: {
      new: "New:",
      improve: "Improve:",
      fix: "Fix:",
      feature: "Feature",
      update: "Update",
      accounts: "Accounts",
      transactions: "Transactions",
      calendar: "Calendar",
      budgets: "Budgets",
      scheduledTransactions: "Scheduled Transactions",
      creditCards: "Credit Cards",
      goals: "Goals",
      reports: "Reports & Analytics",
      security: "Privacy & Security",
      backup: "Backup & Sync",
      general: "General",
    },
    v150: {
      date: "November 10, 2026",
      newItem1: "Import accounts and transaction history from CSV files with guided account and category matching.",
      newItem2: "Review balances, check similar records, and save a safety backup before importing.",
      newItem3: "Download CSV templates directly to a folder on your device.",
      newItem4: "Match transaction types from other apps and automatically match categories using Kai's knowledge.",
      newItem5: "Add advance posting to record upcoming scheduled transactions early and automatically advance to the next cycle.",
      newItem6: "Add an interactive walkthrough tour for Credit Cards to explore billing cycles, cutoffs, utilization, and installments.",
      improveItem1: "Tap or drag along the net worth chart to view exact balances and dates with touch tooltips.",
      improveItem2: "Improve walkthrough tours with high-contrast buttons, dedicated close buttons, and touch protection.",
      improveItem3: "Open the app terms from Settings, next to the privacy policy.",
      improveItem4: "Simplify transaction date entry with a unified calendar and time selector.",
      improveItem5: "Rename the credit card monitoring screen title to Credit Cards for clearer navigation.",
      improveItem6: "Filter credit card billed items by statement cutoff date and view full statement activities in a dedicated screen.",
      improveItem7: "Show handy arrow buttons to smoothly scroll horizontal tabs, chips, and lists when more items are hidden.",
      improveItem8: "Simplify data reset confirmation by typing RESET instead of the app name.",
      improveItem9: "Update the dashboard walkthrough to dynamically highlight active cards in your customized order.",
      improveItem10: "Streamline the net worth card by using the main privacy button in the top navigation bar.",
      improveItem11: "Open an account's details and settings directly when tapping its card on the dashboard.",
      improveItem12: "Keep the latest balance visible when editing an account, even with privacy mode turned on.",
      improveItem13: "Group credit card limit and statement settings into a distinct card in account setup.",
      improveItem14: "Display balances for archived accounts and pockets even when privacy mode is turned on.",
      improveItem15: "Shorten the account group name example to keep the placeholder clean on a single line.",
      improveItem16: "Keep transaction amounts visible in scheduled transactions even when privacy mode is turned on.",
      improveItem17: "Show a toast notification with the next cycle date when advance posting a scheduled transaction.",
      improveItem18: "Show an in-app confirmation modal when saving exported transaction data to the device.",
      improveItem19: "Update the transaction label filter to a multi-select dropdown list matching the account filter.",
      improveItem20: "Position the Clear all filter button at the front of active filters so it is immediately accessible without scrolling.",
      improveItem21: "Simplify the transaction type picker by renaming Fund Transfer to Transfer for cleaner balance.",
      improveItem22: "Move the transfer fee explanation to a helper icon modal to keep the form clean and compact.",
      improveItem23: "Align the New label button beside the active labels section and update the close button.",
      improveItem24: "Show a floating scroll down arrow across scrollable sheets and forms when items are hidden below.",
      improveItem25: "Simplify the customize fields sheet by removing repetitive descriptions for always-on fields.",
      improveItem26: "Update the select labels modal with a dedicated manage labels chip and a circular close button.",
      improveItem27: "Add draggable tour guide chips to all form modals and sheets for instant, on-demand walkthroughs.",
      fixItem1: "Dock walkthrough guide buttons into the top header across screens to eliminate button overlap.",
      fixItem2: "Hide credit card billed, unbilled, and outstanding amounts when privacy mode is active.",
      fixItem3: "Prevent version history from showing while the app is locked.",
      fixItem4: "Fix section titles in the developer note overlapping card borders on smaller screens.",
      fixItem5: "Prevent app lock from triggering when sharing files or selecting photos.",
      fixItem6: "Fix chart spacing so month labels and recent amounts are fully visible without getting cut off.",
      fixItem7: "Hide account balances, top spending amounts, and category percentages when privacy mode is active.",
      fixItem8: "Fix month selection on the net worth chart so tapping any month highlights that specific point.",
      fixItem9: "Fix the Top Spending card's View all button to open this month's spending transactions.",
      fixItem10:
        "Fix visual glitch and unintended circle animation when enabling toggles across forms and settings.",
      fixItem11:
        "Keep the color name and hex code fields visible above the keyboard when creating custom colors.",
      fixItem12:
        "Fix issue where the header walkthrough guide from Settings incorrectly appeared on the Credit Cards screen.",
      fixItem13:
        "Hide credit card utilization ring, due amounts, and card chip balances when privacy mode is enabled.",
    },
    v140: {
      date: "November 5, 2026",
      newItem1:
        "Shake your device to quickly launch Chat with Kai or transaction entry, with customizable shortcuts in Settings.",
      newItem2:
        "Toggle positive or negative amounts in schedules to easily record recurring refunds and income adjustments.",
      newItem3:
        "Prevent accidental data loss across forms with a confirmation prompt when leaving unsaved changes.",
      newItem4:
        "Instantly hide account balances and financial figures across the app with a single tap on the stealth eye toggle.",
      newItem5:
        "Customize tactile vibration feedback and optional sound chimes when recording expenses and tapping the keypad.",
      newItem6:
        "Quickly duplicate or delete transactions by swiping left on any row to reveal actions.",
      improveItem1:
        "Personalize your daily dashboard quote with custom background and text colors or reset to theme default.",
      improveItem2:
        "Place note color swatches directly above the title for effortless visibility and coloring.",
      improveItem3:
        "Keep the Greeting and Date header always active on the dashboard while freely toggling other cards.",
      improveItem4:
        "Simplify creating pockets by removing the unused target amount field.",
      improveItem5:
        "Optionally show Quick Date pills (Today, Yesterday, Calendar) or classic date selector in transaction forms.",
      improveItem6:
        "Reorganize Settings into clean, intuitive sections for effortless navigation.",
      improveItem7:
        "Discover clear, helpful empty states with one-tap action buttons across savings goals and ledgers.",
      improveItem8:
        "Jump directly into matching records and prefilled filters when tapping search results.",
      fixItem1:
        "Fix floating action button icons and custom dashboard text becoming unreadable when using custom colors.",
      fixItem2:
        "Fix bottom buttons in the tablet sidebar being partially obscured when three-button navigation is enabled.",
      fixItem3:
        "Fix missing Spanish and Filipino translations on dashboard recent transactions.",
      fixItem4:
        "Ensure stealth mode completely masks transaction group totals, balance sheet numbers, and report charts.",
      fixItem5:
        "Fix pull-to-refresh not responding on the transactions ledger.",
    },
    v130: {
      date: "November 2, 2026",
      newItem1:
        "Create your own color combinations in the new Custom Theme Studio.",
      newItem2:
        "Customize your Home screen layout with new Cashflow, Accounts, and Top Spending cards.",
      newItem3:
        "Add a Quick Actions card to your Home screen and fine-tune custom colors with the visual shade picker.",
      newItem4:
        "Get automatic in-app prompts to easily download and apply new updates from Google Play.",
      improveItem1:
        "Add expressive tinted light and dark theme presets and sync your chosen theme across devices.",
      improveItem2:
        "Show daily net totals and active filter chips on the Transactions screen.",
      improveItem3:
        "Jump directly to filtered transactions from Dashboard cards, Budgets, and Savings Goals.",
      improveItem4:
        "Show clear guides on where theme colors apply and choose from your saved hex color palette.",
      improveItem5:
        "Unify color swatches across Custom Theme Studio and app settings with a single palette.",
      improveItem6:
        "Refine icon colors across settings to distinguish primary actions and special assistant features.",
      improveItem7:
        "Improve currency setup sheets with on-demand helper information and cleaner option lists.",
      fixItem1:
        "Fix overlapping badges and cut-off text in the navigation menu and summary cards.",
      fixItem2:
        "Fix startup and screen loading reliability across the app.",
      fixItem3:
        "Fix Quick Actions on Home opening Expense instead of Income or Transfer.",
      fixItem4:
        "Prevent screen scrolling while first-time walkthrough guides are preparing or displayed.",
      fixItem5:
        "Fix an issue preventing existing users from creating or saving Fund Groups.",
      fixItem6:
        "Fix white and neutral colors showing red shades in Custom Theme Studio.",
      fixItem7:
        "Fix buttons and selection lists getting cut off behind the phone's system navigation bar.",
    },
    v121: {
      date: "October 28, 2026",
      newItem1:
        "Choose between Review First or Auto-Save mode in Chat with Kai.",
      improveItem1:
        "View your app version and membership status directly in the About settings section.",
      improveItem2:
        "Simplify account and transaction forms with a cleaner, clutter-free minimalist design.",
      improveItem3:
        "Streamline settings, categories, and dashboard cards for a cleaner, distraction-free layout.",
      improveItem4:
        "Streamline Quick Search, planning forms, and backup & security screens for a clean, minimalist experience.",
      fixItem1:
        "Preserve chosen positive and negative signs when recording expense refunds or income deductions.",
      fixItem2:
        "Update transaction draft cards in chat immediately after editing and saving in the form.",
      fixItem3:
        "Default liability accounts to a negative sign and asset accounts to positive when starting balance is zero.",
    },
    v120: {
      date: "October 27, 2026",
      newItem1:
        "Talk to Kai to quickly log expenses, record transactions, and ask financial questions.",
      newItem2:
        "Check your balances and finances right from your phone's home screen.",
      newItem3:
        "Organize and customize your frequent merchants and payees in one central place.",
      improveItem1:
        "Teach Kai your favorite keywords and pick categories directly inside the conversation.",
      improveItem2:
        "Jump straight to transfers, reports, and AI chat directly from Quick Search.",
      improveItem3:
        'Tap "Skip for now" on goal and budget milestone screens to return to your dashboard faster.',
      fixItem1:
        "Enjoy faster, stutter-free scrolling when viewing your full transaction history.",
      fixItem2:
        "Fixed button text and greeting messages across English, Spanish, and Filipino.",
      fixItem3:
        "Use your default expense or income account in Chat when no account is mentioned.",
      fixItem4:
        "Correct amounts in Chat for Japanese Yen, Korean Won, and other zero-decimal currencies.",
      fixItem5:
        "Allow customizing savings goal currency and ensure goals link only matching accounts.",
    },
    v111: {
      date: "October 26, 2026",
      quickActionsItem1:
        "Show free plan limits when using the dashboard's quick action buttons.",
    },
    v110: {
      date: "October 25, 2026",
      searchItem1:
        "Add Quick Search to quickly find and navigate to screens, settings, and actions.",
      updateItem1:
        "Rename What's New to Version History and show every past update in one list.",
    },
    v100: {
      date: "October 24, 2026",
      title: "Welcome to Kaizen Finance",
      accountsItem1:
        "Track cash, bank accounts, credit cards, and savings with running balances.",
      accountsItem2:
        "Transfer money between your accounts with automatic balance updates.",
      transactionsItem1:
        "Log income and expenses quickly with categories, notes, and custom fields.",
      transactionsItem2:
        "Attach receipt photos and filter transactions by date or account.",
      calendarItem1:
        "View your daily spending totals and upcoming expenses on a calendar.",
      calendarItem2: "Fix bugs when selecting date.",
      budgetsItem1:
        "Set monthly spending limits for each category to keep spending on track.",
      budgetsItem2:
        "Get visual progress bars and warnings before you overspend.",
      scheduledItem1:
        "Set up recurring bills, subscriptions, and paychecks with due date reminders.",
      creditCardsItem1:
        "Track statement billing cycles, due dates, credit limits, and utilization.",
      goalsItem1:
        "Set savings targets and monitor your progress as you save money.",
      reportsItem1:
        "See clear charts and visual breakdowns of your spending habits and net worth.",
      securityItem1:
        "100% offline-first — all financial data stays private on your device.",
      securityItem2:
        "Lock the app with your device fingerprint, Face ID, or PIN.",
      backupItem1:
        "Safely export and import backup files or sync securely with Google Drive.",
    },
  },
  developerMessage: {
    badge: "DEVELOPER'S NOTE & MISSION",
    title: "A Note from the Developer",
    subtitle: "The heart and goal behind this application",
    missionTitle: "The Mission: Financial Literacy for Everyone",
    missionBody:
      "When I created this app, my core goal as a developer was simple: to help everyone become financially literate. Financial freedom doesn't require complex Wall Street strategies—it begins right here, by learning to mindfully monitor your cashflow. Understanding every inflow and outflow is the foundation of lasting confidence.",
    kaizenTitle: "The Power of Small Improvements",
    kaizenBody:
      "In Japanese, 'Kaizen' (改善) means continuous improvement. You don't have to change everything overnight. Just tracking one expense a day and checking in on your balance builds a steady habit that transforms your financial life over time.",
    logoTitle: "The Story Behind Our Colors",
    logoBody:
      "Every color in our logo reflects the journey we take toward financial peace:\n\n• Red (Starting from Zero): The starting line. Whether you are facing debt, living paycheck-to-paycheck, or starting from scratch with nothing, red represents where every honest financial journey begins.\n\n• White (Clarity & Understanding): The bridge of mindfulness. Tracking your cashflow brings darkness into light—replacing anxiety with clear visibility, calm awareness, and a deep understanding of your habits.\n\n• Green (Financial Literacy & Freedom): Thriving in the green. Moving beyond mere survival into lasting financial literacy, self-reliance, and the confidence to shape your own future.",
    supportTitle: "Independent & Built for You",
    supportBody:
      "Kaizen Finance is crafted independently as a private, offline-first app—no data harvesting, no intrusive bloat. If this app brings value to your journey, upgrading to Kaizen Pro directly funds my ongoing development and keeps this project thriving.",
    feedbackTitle: "Your Voice Matters",
    feedbackBody:
      "Every feature and detail is shaped by real user experiences. Feel free to share your thoughts, report issues, or suggest new ideas. I'd love to hear from you.",
    signaturePre: "Rooting for your financial peace,",
    signatureName: "John Paul C. Arellano",
    actionBegin: "Let's Begin",
    actionFeedback: "Send Feedback",
    actionSupport: "Support via Pro",
  },
  supportDevelopment: {
    title: "Support Development",
    subtitle: "Help Kaizen Finance grow and reach more people",
    badge: "SUPPORT KAIZEN",
    spreadSectionTitle: "SPREAD THE WORD",
    directSectionTitle: "DIRECT SUPPORT",
    feedbackSectionTitle: "GET IN TOUCH",
    heroDescription:
      "Kaizen Finance is crafted independently as a private, offline-first app. Your support keeps updates coming and helps us stay completely ad-free and tracking-free.",
    proActiveBadge: "ACTIVE PRO SUPPORTER",
    proActiveSubtitle:
      "Thank you for backing Kaizen! All Pro features are unlocked.",
    rateTitle: "Rate on Google Play",
    rateSubtitle: "Leave a 5-star review to support an independent developer",
    rateAction: "Rate Kaizen",
    shareTitle: "Share with Friends",
    shareSubtitle: "Help others track their finances offline & privately",
    shareAction: "Share App",
    shareMessage: "I've been using Kaizen Finance to track my income, expenses, and pockets offline and privately! Check it out:",
    feedbackTitle: "Send Feedback & Suggestions",
    feedbackSubtitle: "Tell us what you'd like to see next or report issues",
    feedbackAction: "Send Feedback",
    proTitle: "Upgrade to Kaizen Pro",
    proSubtitle: "Unlock unlimited pockets, cloud backup, and all features",
    proAction: "View Pro Options",
  },
  inAppReview: {
    badge: "MILESTONE REACHED",
    title: "10 Transactions Tracked! 🎉",
    description:
      "You're building consistent financial habits! If Kaizen is helping you keep tabs on your money, a quick rating on Google Play means the world to an independent developer.",
    rateAction: "Rate Kaizen ⭐",
    maybeLaterAction: "Maybe Later",
    dontAskAgain: "Don't ask again",
  },
  onboarding: {
    welcomeTitle: "Welcome to Kaizen Finance",
    welcomeDescription:
      "A calm place to track money in, money out, and what you have left.",
    welcomePoint1: "Record spending and income in a few taps",
    welcomePoint2: "See what you have and what you spent this month",
    welcomePoint3: "Your data stays on this device and works offline",
    getStarted: "Get started",
    restoreBackup: "Restore a backup",
    seeExample: "See an example workspace",
    setupMyself: "Set this up myself",
    allSetupOptions: "See all onboarding options",
    backToSample: "Back to sample",
    backToSetupChoices: "Back to setup choices",
    nicknameTitle: "What should we call you?",
    nicknameDescription:
      "We'll personalize your workspace and daily financial dashboard.",
    nicknameLabel: "YOUR NICKNAME",
    nicknamePlaceholder: "e.g. Alex, Sam, Jordan",
    nicknameHint: "You can change your nickname anytime in Settings.",
    languageTitle: "Choose your language",
    languageDescription: "You can change this anytime in Settings.",
    languageTitleAssisted: "Nice to meet you, %{name}!",
    languageDescriptionAssisted:
      "Which language do you prefer for your workspace?",
    currencyTitle: "What money do you use?",
    currencyDescription: "We use this for your first account and amounts.",
    currencyTitleAssisted: "What currency do you use, %{name}?",
    currencyDescriptionAssisted:
      "We'll use this to display your balances, reports, and accounts.",
    currencyHint:
      "Didn't find your currency? You can add it later in Settings.",
    accountTitle: "Your first account",
    accountDescription: "Where do you usually keep money you spend?",
    accountTitleAssisted: "Let's set up your first account, %{name}",
    accountDescriptionAssisted:
      "Where do you usually keep money you spend or save?",
    accountTypeLabel: "ACCOUNT TYPE",
    accountTemplateCash: "Cash",
    accountTemplateBank: "Bank",
    accountTemplateEwallet: "E-Wallet",
    accountTemplateSavings: "Savings",
    accountNameLabel: "ACCOUNT NAME",
    accountNamePlaceholder: "e.g. Wallet, BDO, GCash",
    openingBalanceLabel: "HOW MUCH IS IN IT NOW?",
    openingBalanceHint: "Optional. You can change this later.",
    notificationsTitle: "Stay on track",
    notificationsTitleAssisted: "Stay consistent, %{name}!",
    notificationsDescription:
      "Turn on a daily reminder to stay in control of your daily spending.",
    notificationsDescriptionAssisted:
      "Turn on a daily reminder to build a steady habit of tracking expenses.",
    notificationsPermissionTitle: "Push Notifications",
    notificationsPermissionDesc:
      "Receive reminders, alerts, and important updates.",
    dailyReminderTitle: "Daily Reminder",
    dailyReminderDesc:
      "Get a gentle evening reminder to log your daily spending (8:00 PM).",
    notificationsTip:
      "You can change reminder times or notification preferences anytime in Settings.",
    readyTitle: "You're ready",
    readyDescription: "Tap the + button on Home to record your first expense.",
    readyTitleAssisted: "You're all set, %{name}!",
    readyDescriptionAssisted:
      "Your workspace is ready. Let's take the first step toward financial clarity.",
    readyNickname: "Nickname: %{name}",
    readyCurrency: "Currency: %{currency}",
    readyAccount: "Account: %{name}",
    readyAccountRecommended:
      "Accounts: Recommended starter pack (Cash, Bank, Savings, E-Wallet)",
    readyAccountManual: "Accounts: Start from scratch (no initial accounts)",
    readyDailyReminder: "Daily Reminder: Enabled (8:00 PM)",
    finishSetup: "Go to Home",
    continue: "Continue",
    accountSetupChoiceTitle: "How would you like to set up accounts?",
    accountSetupChoiceTitleAssisted:
      "How would you like to set up your accounts, %{name}?",
    accountSetupChoiceDescription:
      "Choose whether to create your first account, use recommended starter presets, or start from scratch.",
    accountSetupChoiceDescriptionAssisted:
      "Choose whether to set up your primary account, use ready-to-go starter presets, or start with a clean slate.",
    accountChoiceSingleTitle: "Create my first account",
    accountChoiceSingleDesc:
      "Set up your primary account with your own custom name, type, and opening balance.",
    accountChoiceRecommendedTitle: "Use recommended accounts",
    accountChoiceRecommendedDesc:
      "Ready-to-use accounts (Cash, Bank, Savings, E-Wallet) and full category presets.",
    accountChoiceRecommendedBadge: "Recommended",
    accountChoiceManualTitle: "Start from scratch",
    accountChoiceManualDesc:
      "Start with an empty workspace. You'll add your accounts and categories manually later.",
    fullSetupTitle: "Set up your workspace",
    fullSetupDescription: "Choose how much structure you want on day one.",
    manualSetupTitle: "Start from scratch",
    manualSetupDescription:
      "Create account types, accounts, and categories yourself.",
    recommendedSetupTitle: "Use recommended setup",
    recommendedSetupDescription:
      "Ready-made accounts (zero balance), Loans and Credits types, and full category presets.",
    recommendedBadge: "Recommended",
  },
  transactionForm: {
    customizeFieldsTitle: "Customize fields",
    customizeFieldsSubtitle:
      "Amount, account, category, and date always stay on the form.",
    alwaysOn: "Always on",
    fields: {
      amount: "Amount",
      account: "Account",
      category: "Category",
      date: "Date",
      transactionName: "Transaction name",
      attachments: "Attachments",
      split: "Split transaction",
      installments: "Installments",
      labels: "Labels",
      note: "Note",
      quickPresets: "Quick Presets",
      exactTime: "Exact time",
    },
  },
  dashboard: {
    greetingMorning: "Good morning, %{name}",
    greetingAfternoon: "Good afternoon, %{name}",
    greetingEvening: "Good evening, %{name}",
    greetingNight: "Good evening, %{name}",
    greetingMorningGeneric: "Good morning",
    greetingAfternoonGeneric: "Good afternoon",
    greetingEveningGeneric: "Good evening",
    greetingNightGeneric: "Good evening",
    quoteShuffle: "New quote",
    dailyInspiration: "Daily Inspiration",
    displayModeAccessibility: "Choose dashboard display style",
    displayModeTitle: "Dashboard display",
    displayModeSimple: "Simple",
    displayModeSimpleDescription:
      "Friendly labels like “Money you have” and “Spent this month.” Amounts still reflect net worth and monthly spending.",
    displayModeDetailed: "Detailed",
    displayModeDetailedDescription:
      "Standard finance labels with net worth, total assets, and liabilities.",
    moneyYouHave: "Money you have",
    spentThisMonth: "Spent this month",
    firstExpenseHint: "Tap + to record your first expense.",
    dismissHint: "Dismiss",
    promptQuickPresetsTitle: "Reuse common expenses?",
    promptQuickPresetsMessage:
      "Turn on transaction names and Quick Presets to fill the form faster.",
    promptQuickPresetsAction: "Turn on",
    promptTransfersTitle: "Moving money between accounts?",
    promptTransfersMessage:
      "You can record transfers between your accounts from the transaction form.",
    promptCreditCardsTitle: "Using a credit card?",
    promptCreditCardsMessage:
      "Turn on credit cards and installments for card purchases.",
    promptCreditCardsAction: "Turn on",
    promptDismiss: "Not now",
    walkthroughIntroBadge: "First Time Here?",
    walkthroughIntroTitle: "Welcome to your Dashboard!",
    walkthroughIntroSubtitle: "Your financial command center",
    walkthroughIntroMessage:
      "Here you can view your total net worth, monitor monthly spending, and manage transactions in one place. Would you like a quick walkthrough of how everything works?",
    walkthroughIntroStart: "Take a Tour",
    walkthroughIntroSkip: "Explore on My Own",
    walkthroughChip: "Guide",
    walkthroughSkip: "Skip",
    walkthroughNext: "Next",
    walkthroughBack: "Back",
    walkthroughStartTx: "Tap + below to start",
    walkthroughStepCount: "Step %{current} of %{total}",
    stepGreetingTitle: "Greeting & Daily Quote",
    stepGreetingDesc:
      "Start your day with a personalized greeting and daily inspirational financial wisdom. Tap the shuffle icon anytime for a fresh quote.",
    stepNetWorthTitle: "Net Worth Overview",
    stepNetWorthDesc:
      "This card gives you a complete financial snapshot—calculating your total net worth (assets minus liabilities) and tracking your balance history.",
    stepCollapseTitle: "Collapse Chart",
    stepCollapseDesc:
      "Tap this chevron anytime to collapse or expand the net worth history chart, giving you a compact view.",
    stepSettingsTitle: "Display Settings",
    stepSettingsDesc:
      "Customize how your dashboard looks. Tap Next to see how you can switch between Simple and Detailed display modes.",
    stepSettingsModalTitle: "Display Mode Options",
    stepSettingsModalDesc:
      "In Simple mode, friendly labels focus on cash and current spending. In Detailed mode, you see full assets and liabilities. Switch anytime!",
    stepQuickActionsTitle: "Quick Actions",
    stepQuickActionsDesc:
      "Quickly record an expense, log income, transfer funds between accounts, or chat with Kai in a single tap.",
    stepCashflowTitle: "Monthly Cashflow",
    stepCashflowDesc:
      "Track your monthly income, expenses, and net savings rate at a glance. Tap any section to jump straight into detailed reports or transactions.",
    stepAccountsTitle: "Accounts Snapshot",
    stepAccountsDesc:
      "View your active accounts and their current balances. Tap View all to manage your accounts, pockets, and fund groups.",
    stepTopCategoriesTitle: "Top Spending Categories",
    stepTopCategoriesDesc:
      "See where your money goes this month with visual category progress bars. Tap any category to inspect matching transactions.",
    stepRecentTxTitle: "Recent Transactions",
    stepRecentTxDesc:
      "Your latest spending, income, and transfers appear here. Tap any item to inspect its details, attachments, or edit.",
    stepFabTitle: "Record Your First Transaction",
    stepFabDesc:
      "Tap the (+) button right here to add your very first transaction and start tracking your finances!",
    congratulationsTitle: "🎉 Congratulations!",
    congratulationsSubtitle: "First Transaction Recorded!",
    congratulationsMessage:
      "You've taken the first step in mastering your money. Every transaction you record brings you closer to your financial goals.",
    congratulationsButton: "Explore Dashboard",
    deleteTransactionTitle: "Delete transaction?",
    deleteTransactionMessage:
      "This record will be moved to Trash. You can restore it later.",
    customizeHome: "Customize Home",
    customizeModalTitle: "Customize Home Screen",
    customizeModalSubtitle:
      "Choose which cards appear on your dashboard and arrange them in your preferred order.",
    quickPresetsLabel: "1-Tap Layout Presets",
    sectionsOrderLabel: "Dashboard Cards & Order",
    resetLayout: "Reset default",
    presetCashflowFocus: "Cashflow Focus",
    presetCashflowFocusDesc:
      "Prioritizes monthly income, spending, and top categories.",
    presetWealthOverview: "Wealth & Balances",
    presetWealthOverviewDesc:
      "Highlights net worth, account balances, and cashflow.",
    presetCompleteView: "Complete View",
    presetCompleteViewDesc: "Shows all 6 financial cards on your home screen.",
    presetMinimalist: "Minimalist",
    presetMinimalistDesc:
      "Compact greeting, monthly cashflow, and recent transactions.",
    widgetGreetingTitle: "Greeting & Date",
    alwaysActive: "Always active",
    widgetGreetingDesc:
      "Personal welcome header and optional daily inspiration quote.",
    widgetNetWorthTitle: "Net Worth & Balance",
    widgetNetWorthDesc:
      "Combined balance trend chart, assets, and liabilities.",
    widgetCashflowTitle: "Monthly Cashflow",
    widgetCashflowDesc:
      "This month's income vs. expenses bar and savings rate.",
    widgetAccountsTitle: "Accounts Strip",
    widgetAccountsDesc:
      "Quick horizontal cards of your active account balances.",
    widgetTopCategoriesTitle: "Top Spending Categories",
    widgetTopCategoriesDesc:
      "Where your money went this month with progress bars.",
    widgetRecentTxTitle: "Recent Transactions",
    widgetRecentTxDesc: "Your latest recorded income, expenses, and transfers.",
    showDailyQuoteTitle: "Show Daily Inspiration Quote",
    showDailyQuoteDesc:
      "Display a tap-to-shuffle financial quote inside the greeting card.",
    quoteColorsTitle: "Quote Appearance",
    quoteBgColor: "Background Color",
    quoteTextColor: "Text Color",
    themeDefault: "Default",
    resetToDefault: "Reset Colors",
    cashflowCardTitle: "Monthly Cashflow",
    netCashflowLabel: "Net Cashflow",
    cashflowIncome: "Income",
    cashflowExpenses: "Expenses",
    savingsRateBadge: "%{rate}% saved",
    accountsCardTitle: "Accounts",
    noAccountsYet: "No active accounts yet.",
    topCategoriesCardTitle: "Top Spending This Month",
    noSpendingThisMonth: "No expenses recorded this month yet.",
    viewAll: "View all",
    stepCustomizeHomeTitle: "Customize Home Screen",
    stepCustomizeHomeDesc:
      "Tap here anytime to show, hide, or reorder dashboard cards and switch between 1-tap layout presets.",
    customizeHelpTitle: "About Customize Home Screen",
    customizeHelpMessage:
      "Personalize your dashboard to match how you manage your money:\n\n• 1-Tap Layout Presets: Quickly switch between Cashflow Focus, Wealth & Balances, Complete View, or Minimalist.\n• Show or Hide Cards: Toggle individual cards on or off using the switches.\n• Reorder Cards: Tap Reorder to drag and drop or use the arrows to arrange cards in your preferred order.",
    reorderCards: "Reorder",
    reorderCardsTitle: "Reorder Dashboard Cards",
    widgetQuickActionsTitle: "Quick Actions",
    quickActionExpense: "Expense",
    quickActionIncome: "Income",
    quickActionTransfer: "Transfer",
    quickActionAi: "Ask Kai",
    recentTransactionsTitle: "Recent Transactions",
    viewAllTransactionsAccessibility: "View all transactions",
    noRecentTransactions: "No transactions recorded yet.",
    noRecentTransactionsHint: "Use the + button to record your first transaction.",
    transferToAccount: "Transfer to %{account}",
    transactionFallback: "Transaction",
    viewTransactionAccessibility: "View transaction, %{title}",
  },
  calendar: {
    firstOfMonth: "1st of Month",
    endOfMonth: "End of Month",
    selectToday: "Select today",
    selectFirstDay: "Select first day of month",
    selectEndDay: "Select end of month",
    prevMonth: "Previous month",
    nextMonth: "Next month",
  },
  accountsWalkthrough: {
    introTitle: "Welcome to Accounts!",
    introSubtitle: "Your complete financial portfolio",
    introMessage:
      "Organize all your cash wallets, bank accounts, investments, and credit cards in one place. Would you like a quick walkthrough?",
    stepArchivedTitle: "Archived Accounts",
    stepArchivedDesc:
      "Access all your archived accounts and sub-pockets safely stored away. You can view their history and restore them anytime.",
    stepFundGroupsTitle: "Fund Groups",
    stepFundGroupsDesc:
      "Organize multiple accounts into custom groups (such as Savings, Operations, or Emergency Funds) to monitor combined totals.",
    stepSearchTitle: "Search Accounts",
    stepSearchDesc:
      "Instantly filter your accounts by name across both assets and liabilities.",
    stepAssetsTitle: "Assets Overview",
    stepAssetsDesc:
      "View your positive accounts—such as bank accounts, cash, investments, and sub-pockets—along with your total asset valuation.",
    stepLiabilitiesTitle: "Liabilities Overview",
    stepLiabilitiesDesc:
      "Track all credit cards, loans, and payable debts so you always know your outstanding obligations.",
    stepFabTitle: "Accounts Menu",
    stepFabDesc:
      "Tap the (+) action button to open the accounts menu where you can create new accounts or set up custom account types.",
    stepSheetTitle: "Account Actions",
    stepSheetDesc:
      "Quickly choose whether to create a new individual account or customize your account categories and grouping structure.",
    actionAddAccount: "Add New Account",
    actionAddAccountDesc:
      "Create bank, cash, wallet, or investment accounts with starting balances.",
    actionManageTypes: "Account Group Setup",
    actionManageTypesDesc:
      "Define and manage custom account types and groups to tailor your tracking.",
  },
  accountFormWalkthrough: {
    introTitle: "New Account Setup",
    introSubtitle: "Create and configure your account",
    introMessage:
      "Configure your account name, type, starting balance, currency, and virtual sub-pockets. Would you like a quick walkthrough of this form?",
    stepNameTitle: "Account Name",
    stepNameDesc:
      "Give your account a clear, recognizable name such as Checking, Primary Savings, or Cash Wallet.",
    stepNoteTitle: "Note & Details",
    stepNoteDesc:
      "Add optional context, account numbers, or reminders for this account.",
    stepTypeTitle: "Account Type & Group",
    stepTypeDesc:
      "Choose whether this account is an Asset (bank, cash, investment) or Liability (credit card, loan).",
    stepIconTitle: "Account Icon",
    stepIconDesc:
      "Pick a custom icon from the icon library or use the default icon of the selected account group.",
    stepStartingBalanceTitle: "Starting Balance",
    stepStartingBalanceDesc:
      "Set the initial balance of your account on its opening date. Tap to open the calculator.",
    stepCurrencyTitle: "Currency Picker",
    stepCurrencyDesc:
      "Select the currency for this account. Note that currency can only be customized before transactions are recorded.",
    stepMaintainingBalanceTitle: "Maintaining Balance",
    stepMaintainingBalanceDesc:
      "Keep track of minimum balance requirements to avoid bank fees or penalty alerts.",
    stepEnablePocketsTitle: "Enable Virtual Pockets",
    stepEnablePocketsDesc:
      "Ideal if you use a single bank account for multiple purposes! For example, if your checking account holds funds for Daily Expenses, an Emergency Fund, and Savings, enabling pockets lets you partition and track those distinct balances separately without needing multiple bank accounts.",
    stepHideSelectionTitle: "Hide from Selection",
    stepHideSelectionDesc:
      "Hide secondary or confidential accounts from daily transaction pickers to keep your lists clean.",
    stepHideReportsTitle: "Hide from Reports",
    stepHideReportsDesc:
      "Exclude tracked external balances, security deposits, or escrow funds from net worth calculations and summary charts.",
    stepOpeningDateTitle: "Opening Date",
    stepOpeningDateDesc:
      "Specify when this account started. Starting balances and calculations will be tracked from this date onward.",
  },
  accountGroupSetupWalkthrough: {
    introTitle: "Account Group Setup",
    introSubtitle: "Organize your account types",
    introMessage:
      "Manage custom account groups across assets and liabilities, and customize your grouping order. Would you like a quick walkthrough?",
    stepClassificationPickerTitle: "Asset & Liability Switcher",
    stepClassificationPickerDesc:
      "Switch between Assets (what you own, like cash and investments) and Liabilities (what you owe, like credit cards and loans).",
    stepReorderTitle: "Reorder Groups",
    stepReorderDesc:
      "Customize the order of your account groups to prioritize the ones you view most frequently.",
    stepNewGroupTitle: "New Account Group",
    stepNewGroupDesc:
      "Create a custom account group tailored to your lifestyle, such as Digital Wallets or Side Hustles.",
  },
  accountTypeFormWalkthrough: {
    introTitle: "New Account Group",
    introSubtitle: "Create a custom category",
    introMessage:
      "Define a custom category with your preferred name, classification, icon, and theme color. Would you like a quick walkthrough?",
    stepNameTitle: "Group Name",
    stepNameDesc:
      "Name this account group, such as High-Yield Savings, Business Accounts, or Crypto Wallets.",
    stepClassificationTitle: "Classification",
    stepClassificationDesc:
      "Designate this group as an Asset (positive wealth) or Liability (debt and obligations).",
    stepIconTitle: "Group Icon",
    stepIconDesc:
      "Choose an icon representing this group across your accounts and reports.",
    stepColorTitle: "Theme Color",
    stepColorDesc:
      "Select a distinct theme color to visually separate and identify this group throughout the app.",
    stepCustomColorTitle: "Add Custom Color",
    stepCustomColorDesc:
      "Create and save your own hex color palette to personalize your finances.",
    stepSaveTitle: "Save Account Group",
    stepSaveDesc:
      "Tap the save checkmark to store your account group and start adding accounts to it.",
  },
  transactionFormWalkthrough: {
    introTitle: "Record Transaction",
    introSubtitle: "Track your income, expense, or transfer",
    introMessage:
      "Quickly enter amounts, choose accounts, assign categories, attach receipts, or split items. Would you like a quick walkthrough of this form?",
    stepPresetsTitle: "Quick Presets",
    stepPresetsDesc:
      "One-tap templates for your recurring transactions. Quickly autofill names, accounts, amounts, and categories.",
    stepCustomizeTitle: "Customize Fields",
    stepCustomizeDesc:
      "Choose which fields to show or hide on the transaction form to streamline your recording experience.",
    stepTypePickerTitle: "Transaction Type",
    stepTypePickerDesc:
      "Toggle between Expense, Income, or Transfer depending on how your funds are moving.",
    stepNameTitle: "Transaction Name",
    stepNameDesc:
      "Enter payee or title for this entry (e.g. Grocery store, Salary, Coffee shop).",
    stepAttachmentTitle: "Receipt & Attachment",
    stepAttachmentDesc:
      "Attach photos, receipts, invoices, or warranty slips directly to this transaction record.",
    stepDateTitle: "Transaction Date",
    stepDateDesc: "Set the calendar date when the transaction took place.",
    stepTimeTitle: "Exact Time",
    stepTimeDesc:
      "Log the exact hour and minute for precise chronological sequencing.",
    stepAmountTitle: "Amount",
    stepAmountDesc:
      "Tap to open the calculator keypad and compute or enter your transaction amount.",
    stepCurrencyTitle: "Currency Picker",
    stepCurrencyDesc:
      "Switch entry currency when spending foreign currencies while traveling or shopping abroad.",
    stepAccountTitle: "Account & Pocket",
    stepAccountDesc:
      "Select the paying or receiving account and optional virtual pocket for this transaction.",
    stepCategoryTitle: "Category",
    stepCategoryDesc:
      "Categorize your transaction to track where your money goes in reports and budgets.",
    stepSplitTitle: "Split by Category",
    stepSplitDesc:
      "Split a single receipt or bill across multiple categories with custom amounts.",
    stepLabelsTitle: "Labels & Tags",
    stepLabelsDesc:
      "Add custom tags (#vacation, #tax-deductible, #project) for cross-category tracking.",
    stepNoteTitle: "Note & Memo",
    stepNoteDesc:
      "Add optional notes, memo reminders, or contextual details for future reference.",
    stepCancelTitle: "Cancel",
    stepCancelDesc:
      "Discard your current changes and close the form without saving.",
    stepSaveTitle: "Save Record",
    stepSaveDesc: "Save your transaction immediately to your local ledger.",
    stepCloseTitle: "Close Form",
    stepCloseDesc:
      "Dismiss this entry modal when you are done or want to exit.",
  },
  scheduledTransactionsWalkthrough: {
    introTitle: "Welcome to Scheduled Transactions!",
    introSubtitle: "Automate recurring bills & income",
    introMessage:
      "Manage subscriptions, recurring bills, and repeating income with automated posting. Would you like a quick walkthrough?",
    stepSearchTitle: "Search Schedules",
    stepSearchDesc:
      "Find scheduled transactions by title, category, or associated account.",
    stepFilterTitle: "Filter by Status",
    stepFilterDesc: "Filter between Active, Completed, and Archived schedules.",
    stepFabTitle: "New Schedule",
    stepFabDesc:
      "Tap the + button to create a new recurring income, expense, or transfer.",
    stepFirstItemTitle: "Scheduled Transaction",
    stepFirstItemDesc:
      "View recurrence schedule, accounts involved, and next upcoming execution date. Tap to edit or manage.",
    stepDueCardTitle: "Due Schedule",
    stepDueCardDesc:
      "Scheduled transactions that reached their due date appear here for your review and execution.",
    stepDueSkipTitle: "Skip Occurrence",
    stepDueSkipDesc:
      "Skip this single occurrence without posting a transaction and advance to the next recurring cycle.",
    stepDuePostTitle: "Post Action",
    stepDuePostDesc:
      "Confirm and post this scheduled occurrence into your transactions immediately.",
  },
  scheduleCongratulations: {
    title: "First Schedule Created! 🎉",
    subtitle: "Automate your recurring finances",
    message:
      "Your recurring transaction is set up. Kaizen can alert you when it's due or automatically post it for you.",
    button: "Explore Schedules Tour",
  },
  scheduleFormWalkthrough: {
    stepTypeTitle: "Transaction Type",
    stepTypeDesc:
      "Choose whether this recurring entry is an Expense, Income, or Transfer.",
    stepNameTitle: "Transaction Name",
    stepNameDesc:
      "Give this schedule a meaningful name, such as Monthly Rent, Net Pay, or Internet Subscription.",
    stepAmountTitle: "Amount",
    stepAmountDesc:
      "Enter the recurring amount for each occurrence using the calculator.",
    stepAccountTitle: "Account Location",
    stepAccountDesc:
      "Select which account and pocket the funds will be deducted from or deposited into.",
    stepCategoryTitle: "Category",
    stepCategoryDesc:
      "Assign a category for this recurring transaction to monitor recurring budgets.",
    stepNoteTitle: "Note & Memo",
    stepNoteDesc:
      "Optional memo or notes attached to each recurring transaction created.",
    stepRecurrenceTitle: "Recurrence",
    stepRecurrenceDesc:
      "Configure how frequently this transaction recurs over time.",
    stepStartingOnTitle: "Starting On",
    stepStartingOnDesc:
      "Select the date and time when the first occurrence should trigger.",
    stepFrequencyTitle: "Frequency",
    stepFrequencyDesc:
      "Choose recurrence intervals: Once, Daily, Weekly, Monthly, or Yearly.",
    stepRepeatTitle: "Repeat Interval",
    stepRepeatDesc:
      "Define interval cadence (e.g., repeat every 2 weeks or every 3 months).",
    stepEndsTitle: "End Condition",
    stepEndsDesc:
      "Specify when this schedule ends: Never, after a set number of occurrences, or on a specific date.",
    stepWeekendTitle: "Weekend Adjustment",
    stepWeekendDesc:
      "Automatically adjust dates if the due date falls on a weekend (move to next weekday, previous weekday, or skip).",
    stepAutoEnterTitle: "Automatically Enter Transaction",
    stepAutoEnterDesc:
      "When enabled, transactions post automatically in the background on their due date without manual confirmation.",
    stepSaveTitle: "Save Schedule",
    stepSaveDesc:
      "Tap to save and activate your recurring scheduled transaction.",
  },
  categoryFormWalkthrough: {
    stepGroupTypeTitle: "Group Type",
    stepGroupTypeDesc:
      "Choose whether this category tracks Expenses (spending) or Income (earnings).",
    stepNameTitle: "Category Name",
    stepNameDesc:
      "Enter a clear name for this category or subcategory, such as Groceries, Dining Out, or Freelance.",
    stepIconTitle: "Category Icon",
    stepIconDesc:
      "Pick an intuitive icon to visually represent this category across transactions and reports.",
    stepColorTitle: "Theme Color",
    stepColorDesc:
      "Choose a distinctive accent color for charts, badges, and quick identification.",
    stepCustomColorTitle: "Add Custom Color",
    stepCustomColorDesc:
      "Pick or enter any custom hex color code to perfectly personalize your categories.",
    stepCancelTitle: "Cancel",
    stepCancelDesc:
      "Discard changes and return without creating a category.",
    stepSaveTitle: "Create Category",
    stepSaveDesc:
      "Save and activate your new category to use in transactions and budgets.",
  },
  pocketFormWalkthrough: {
    stepNameTitle: "Pocket Name",
    stepNameDesc:
      "Give this pocket or envelope a clear sub-account name, such as Emergency Fund, Vacation, or Tax Reserve.",
    stepDefaultExpenseTitle: "Default for Expenses",
    stepDefaultExpenseDesc:
      "When enabled, expense transactions created for this account will automatically choose this pocket.",
    stepDefaultIncomeTitle: "Default for Income",
    stepDefaultIncomeDesc:
      "When enabled, income deposits for this account will automatically route into this pocket.",
    stepSaveTitle: "Save Pocket",
    stepSaveDesc:
      "Save and activate this pocket under your account to start managing isolated balances.",
  },
  presetFormWalkthrough: {
    stepNameTitle: "Preset Name",
    stepNameDesc:
      "Enter a descriptive title for this quick preset, like Daily Coffee or Subway Pass.",
    stepTypeTitle: "Transaction Type",
    stepTypeDesc:
      "Choose whether this preset is for recurring expenses or income.",
    stepAmountTitle: "Pre-filled Amount",
    stepAmountDesc:
      "Optionally set a fixed amount to automatically fill in when tapping this preset.",
    stepDetailsTitle: "Category & Account",
    stepDetailsDesc:
      "Attach a default category and payment account for lightning-fast 1-tap logging.",
    stepSaveTitle: "Save Quick Preset",
    stepSaveDesc:
      "Save to immediately display this shortcut on your Transaction form for instant entry.",
  },
  noteEditorWalkthrough: {
    stepTitleTitle: "Note Title",
    stepTitleDesc:
      "Add a concise title to organize your financial thoughts, receipts, or reminders.",
    stepContentTitle: "Note Content",
    stepContentDesc:
      "Write down detailed notes, financial plans, checklists, or transaction summaries.",
    stepColorTitle: "Color Coding",
    stepColorDesc:
      "Pick an accent color to visually group related notes in your notebook.",
    stepPinTitle: "Pin to Top",
    stepPinDesc:
      "Keep your most important financial notes pinned right at the very top.",
    stepAttachmentsTitle: "Attachments",
    stepAttachmentsDesc:
      "Attach photos of receipts, invoices, warranties, or documents directly to this note.",
    stepSaveTitle: "Save Note",
    stepSaveDesc:
      "Tap the checkmark to save your note securely in your local database.",
  },
  customizeDashboardWalkthrough: {
    stepPreviewTitle: "Dashboard Preview",
    stepPreviewDesc:
      "See live updates as you toggle and reorder your cards.",
    stepCardsTitle: "Cards & Widgets",
    stepCardsDesc:
      "Toggle visibility and drag to rearrange the order of widgets on your home screen.",
    stepDoneTitle: "Done",
    stepDoneDesc:
      "Save your layout preferences and return to your customized dashboard.",
  },
  txFilterWalkthrough: {
    stepDateTitle: "Date Range",
    stepDateDesc:
      "Filter transactions by day, week, month, quarter, year, or custom date ranges.",
    stepTypeTitle: "Transaction Types",
    stepTypeDesc:
      "Filter by Expense, Income, or Transfer records.",
    stepAccountsTitle: "Accounts & Categories",
    stepAccountsDesc:
      "Select one or multiple accounts and categories to narrow down your view.",
    stepAmountTitle: "Amount Limits",
    stepAmountDesc:
      "Set minimum and maximum amount thresholds to pinpoint specific transactions.",
    stepApplyTitle: "Apply Filters",
    stepApplyDesc:
      "Apply your filters to view refined transaction lists instantly.",
  },
  dataImportWalkthrough: {
    stepFileTitle: "Select File",
    stepFileDesc:
      "Choose a CSV, OFX, or QFX bank statement file from your device.",
    stepMappingTitle: "Column Mapping",
    stepMappingDesc:
      "Match your bank file's date, amount, payee, and notes columns with app fields.",
    stepAccountTitle: "Target Account",
    stepAccountDesc:
      "Select which account these imported transactions belong to.",
    stepReviewTitle: "Review & Commit",
    stepReviewDesc:
      "Inspect imported transactions, adjust categories or tags, and safely commit them.",
  },
  budgetFormWalkthrough: {
    introTitle: "New Category Budget",
    introSubtitle: "Set smart spending limits",
    introMessage:
      "Set category spending limits, configure rollover balances, and enable alert thresholds. Would you like a quick walkthrough of this form?",
    stepCategoryTitle: "Category Selection",
    stepCategoryDesc:
      "Select which category this budget applies to (e.g. Groceries, Entertainment, Dining).",
    stepEnableBudgetTitle: "Enable Budget",
    stepEnableBudgetDesc:
      "Turn this budget limit on or off without deleting your configuration.",
    stepAmountTitle: "Budget Amount",
    stepAmountDesc:
      "Enter your target spending limit for the period using the calculator.",
    stepFrequencyTitle: "Budget Frequency",
    stepFrequencyDesc:
      "Choose how often the budget period resets: Daily, Weekly, Monthly, Quarterly, or Yearly.",
    stepRolloverTitle: "Rollover Budget",
    stepRolloverDesc:
      "Carry over unspent funds or budget deficits into the next period automatically.",
    stepOverBudgetAlertTitle: "Over-Budget Alert",
    stepOverBudgetAlertDesc:
      "Receive an alert when spending reaches or exceeds this budget limit.",
    stepSaveTitle: "Save Budget",
    stepSaveDesc: "Tap to save and activate your category spending limit.",
  },
  goalFormWalkthrough: {
    introTitle: "New Savings Goal",
    introSubtitle: "Track your financial targets",
    introMessage:
      "Set target amounts, link accounts or pockets, configure target dates, and track your progress. Would you like a quick walkthrough of this form?",
    stepTitleTitle: "Goal Title",
    stepTitleDesc:
      "Give your savings goal a name, like Emergency Fund, Dream Vacation, or New Car.",
    stepTargetAmountTitle: "Target Amount",
    stepTargetAmountDesc:
      "Set the total amount you want to save for this financial milestone.",
    stepLinkedAccountsTitle: "Linked Accounts & Pockets",
    stepLinkedAccountsDesc:
      "Select which accounts and virtual pockets hold the funds contributing toward this goal.",
    stepTargetDateTitle: "Target Date",
    stepTargetDateDesc:
      "Set an optional completion deadline to track daily or monthly required savings.",
    stepIconTitle: "Goal Icon",
    stepIconDesc: "Choose a motivating icon to visually represent your target.",
    stepAccentColorTitle: "Accent Color",
    stepAccentColorDesc:
      "Select a theme color for the progress bar and goal cards.",
    stepNotesTitle: "Notes & Motivation",
    stepNotesDesc:
      "Add reminders, notes, or motivation why this milestone matters to you.",
    stepSaveTitle: "Save Goal",
    stepSaveDesc:
      "Tap the save checkmark to store your goal and begin tracking progress.",
  },
  transactionsWalkthrough: {
    introTitle: "Welcome to Transactions!",
    introSubtitle: "Your detailed financial ledger",
    introMessage:
      "Search, filter, inspect, and track all your income, expenses, and transfers with ease. Would you like a quick walkthrough?",
    stepSearchTitle: "Search Transactions",
    stepSearchDesc:
      "Quickly find transactions by note, payee, category, account, or amount in real time.",
    stepFilterTitle: "Filter Transactions",
    stepFilterDesc:
      "Open advanced filters to narrow down transactions by date range, account, category, type (income, expense, transfer), or tags.",
    stepSortDateTitle: "Sort by Date",
    stepSortDateDesc:
      "Sort your transaction history chronologically by transaction date.",
    stepSortAmountTitle: "Sort by Amount",
    stepSortAmountDesc:
      "Order transactions by monetary value to immediately highlight your largest or smallest transactions.",
    stepSortOrderTitle: "Sort Order",
    stepSortOrderDesc:
      "Toggle between descending (newest/highest first) and ascending (oldest/lowest first) sorting order.",
    stepViewModeTitle: "Detail & Simple View Mode",
    stepViewModeDesc:
      "Switch between Compact mode for high-density browsing and Detailed mode with notes, tags, and account details.",
    stepScheduledTitle: "Scheduled Transactions",
    stepScheduledDesc:
      "Access upcoming, recurring, and automated scheduled transactions to stay on top of recurring bills.",
    stepTrashTitle: "Transaction Trash",
    stepTrashDesc:
      "Safely review deleted transactions. You can restore accidentally removed records or empty trash permanently.",
    stepExportTitle: "Export CSV",
    stepExportDesc:
      "Export your filtered transaction history as a clean CSV spreadsheet to share, analyze, or back up.",
    stepFabTitle: "Record Transaction",
    stepFabDesc:
      "Tap the (+) button anytime to log a new expense, income, or transfer between accounts. You're ready to go!",
  },
  calendarWalkthrough: {
    introTitle: "Welcome to Calendar!",
    introSubtitle: "Timeline of your financial journey",
    introMessage:
      "View daily cash flow, upcoming recurring bills, and projected balances on an interactive calendar. Would you like a quick walkthrough?",
    stepArrowsTitle: "Calendar Navigation",
    stepArrowsDesc:
      "Use the month navigation arrows to browse backward and forward across months, or jump straight back to today.",
    stepTransactionsTitle: "Transactions Tab",
    stepTransactionsDesc:
      "Review all recorded income, expense, and transfer transactions for the selected day or the full month.",
    stepSchedulesTitle: "Schedules Tab",
    stepSchedulesDesc:
      "View and manage scheduled bills, recurring transfers, and upcoming occurrences directly on the calendar timeline.",
    stepNetTitle: "Net Earnings Tab",
    stepNetDesc:
      "Analyze daily income vs expense variance, cash flow trends, and net earnings trajectories.",
    stepBalanceSheetTitle: "Balance Sheet Tab",
    stepBalanceSheetDesc:
      "Track your assets, liabilities, and projected equity across the calendar at a single glance.",
  },
  categoriesWalkthrough: {
    introTitle: "Welcome to Categories!",
    introSubtitle: "Organize your income & spending",
    introMessage:
      "Customize category groups, icons, and nested subcategories to classify every transaction. Would you like a quick walkthrough?",
    stepTypeToggleTitle: "Expenses & Income",
    stepTypeToggleDesc:
      "Toggle between Expense categories and Income streams to organize and customize your cash flows.",
    stepReorderGroupsTitle: "Reorder Categories",
    stepReorderGroupsDesc:
      "Rearrange category groups into your preferred sequence across entry pickers and reports.",
    stepPresetsIconTitle: "Category Presets",
    stepPresetsIconDesc:
      "Quickly load curated starter category bundles or manage built-in presets.",
    stepNewCategoryTitle: "New Category",
    stepNewCategoryDesc:
      "Create a custom category group with tailored colors, icons, and classification.",
    stepReorderSubTitle: "Reorder Subcategories",
    stepReorderSubDesc:
      "Organize and rank nested subcategories within this group for quicker transaction tagging.",
    stepAddSubTitle: "Add Subcategory",
    stepAddSubDesc:
      "Add granular subcategories under this group for detailed spending and income tracking.",
  },
  budgetCongratulations: {
    title: "First Budget Created!",
    subtitle: "Smart Spending Management",
    message:
      "You've successfully created your first category budget! Track spending limits, avoid overages, and monitor rollover balances with confidence.",
    button: "Explore Budget Features",
  },
  budgetsWalkthrough: {
    introTitle: "Welcome to Budgets!",
    introSubtitle: "Smart spending management",
    introMessage:
      "Set category spending limits, track rollover buffers, and keep your finances on target. Would you like a quick walkthrough?",
    stepEmptyCreateTitle: "Set Your First Budget",
    stepEmptyCreateDesc:
      "Tap here to configure spending limits for any category with daily, weekly, monthly, or custom rollover periods.",
    stepTotalActiveTitle: "Total Active Budget",
    stepTotalActiveDesc:
      "Track your combined budgeted limits, real-time spending progress, remaining buffer, and over-budget alerts in one glance.",
    stepFrequencyTabsTitle: "Frequency Filter",
    stepFrequencyTabsDesc:
      "Quickly filter your category budgets by period — daily, weekly, monthly, quarterly, or yearly.",
    stepFirstItemToggleTitle: "Enable & Disable Budgets",
    stepFirstItemToggleDesc:
      "Toggle any budget on or off at will, or tap View transactions on any card to inspect that category's spending.",
    stepFabTitle: "Create Category Budget",
    stepFabDesc:
      "Tap the (+) button anytime to set up additional category limits and stay on top of your financial goals.",
  },
  goalCongratulations: {
    title: "First Goal Created!",
    subtitle: "Target Set for Success",
    message:
      "Congratulations on setting your first savings goal! Track your progress, link accounts, and stay motivated as you build your financial future.",
    button: "Explore Goals Tour",
  },
  goalsWalkthrough: {
    introTitle: "Welcome to Goals!",
    introSubtitle: "Turn financial dreams into reality",
    introMessage:
      "Track your savings milestones, link accounts, and monitor progress toward your future. Would you like a quick walkthrough?",
    stepTotalTargetTitle: "Total Target & Progress",
    stepTotalTargetDesc:
      "Monitor your combined savings target, total accumulated funds, percentage progress, and remaining shortfall across all active goals.",
    stepStatusFiltersTitle: "Goal Status Filters",
    stepStatusFiltersDesc:
      "Easily filter between All Goals, active In Progress targets, and Completed milestones with live counter badges.",
    stepFirstItemMarkCompleteTitle: "Add Funds & Complete Goal",
    stepFirstItemMarkCompleteDesc:
      "Tap Add Funds to quickly record a deposit into your goal's linked account, or mark the goal as completed when you reach your target.",
    stepFabTitle: "Add New Goal",
    stepFabDesc:
      "Tap the (+) button anytime to set up a new target, link bank accounts or pockets, specify deadlines, and calculate required monthly pace.",
  },
  notesWalkthrough: {
    introTitle: "Welcome to Notes!",
    introSubtitle: "Financial checklists & memos",
    introMessage:
      "Keep track of checklists, receipts, reminders, and financial ideas in one organized place. Would you like a quick walkthrough?",
    stepEmptyCreateTitle: "Create Your First Note",
    stepEmptyCreateDesc:
      "Tap here to start capturing your thoughts, financial checklists, memos, and receipt photos.",
    stepSearchTitle: "Search Notes",
    stepSearchDesc:
      "Quickly find any note by searching through titles, checklist items, or memo content.",
    stepViewModeTitle: "Display Mode",
    stepViewModeDesc:
      "Toggle between square tiles for a visual gallery or a compact list view.",
    stepSortFilterTitle: "Modified & Sort Filter",
    stepSortFilterDesc:
      "Sort your notes by last modified date (newest or oldest) or alphabetically by title.",
    stepFirstItemTitle: "Note Preview & Gestures",
    stepFirstItemDesc:
      "Tap any note to view or edit details. When the display mode is list, you can swipe it to the left to show the delete button.",
    stepFabTitle: "Add New Note",
    stepFabDesc:
      "Tap the (+) button anytime to create a new note with rich attachments, color tags, and pinning options.",
  },
  creditCardsWalkthrough: {
    introTitle: "Welcome to Credit Cards!",
    introSubtitle: "Smart credit card monitoring",
    introMessage:
      "Monitor billing cycles, statement cutoffs, credit limits, and active installments all in one place. Would you like a quick walkthrough?",
    stepEmptyAddTitle: "Add Credit Card",
    stepEmptyAddDesc:
      "Tap here to create a Credit Card account to track billing cycles, installments, and credit limits.",
    stepDueSummaryTitle: "Payment Due Summary",
    stepDueSummaryDesc:
      "View total payments due across all credit cards this month, along with any past-due alerts.",
    stepAccountChipsTitle: "Card Switcher",
    stepAccountChipsDesc:
      "Tap any credit card chip to inspect individual balances, statement details, and credit utilization.",
    stepLimitUtilizationTitle: "Credit Limit & Utilization",
    stepLimitUtilizationDesc:
      "Keep track of your assigned credit limit and real-time utilization ring to preserve your credit score.",
    stepMetricsTitle: "Billed vs Unbilled Activity",
    stepMetricsDesc:
      "Monitor your billed statement balance, current cycle unbilled charges, and total outstanding debt.",
    stepDueInstallmentsTitle: "Due Date & Installments",
    stepDueInstallmentsDesc:
      "See your upcoming statement due date, due amount, and the number of active installment plans.",
    stepStatementsTitle: "Billed Statements & History",
    stepStatementsDesc:
      "Browse generated statements, view paid or overdue status, and inspect itemized billed purchases.",
    stepUnbilledTitle: "Unbilled Purchases",
    stepUnbilledDesc:
      "Review card charges made in the current billing cycle before your next statement cutoff.",
  },
  settingsWalkthrough: {
    introTitle: "Welcome to Settings!",
    introSubtitle: "Personalize your Kaizen experience",
    introMessage:
      "Configure currencies, themes, notifications, security, and default accounts. Would you like a quick walkthrough?",
    stepLanguageTitle: "Language Preference",
    stepLanguageDesc:
      "Switch between English, Spanish, and Filipino, or automatically match your device system default.",
    stepCurrencyTitle: "Currency Setup",
    stepCurrencyDesc:
      "Configure your primary reporting currency, secondary currencies, and custom exchange rates.",
    stepNicknameTitle: "User Nickname",
    stepNicknameDesc:
      "Personalize your dashboard greeting with a custom display name or nickname.",
    stepThemeTitle: "Theme & Palette",
    stepThemeDesc:
      "Choose from modern light, dark, and vibrant OLED color themes, or match your system appearance.",
    stepRemindersTitle: "Notification Reminders",
    stepRemindersDesc:
      "Set daily expense tracking alarms and reminders for upcoming bills to never miss a payment.",
    stepWidgetsTitle: "Home Screen Widgets",
    stepWidgetsDesc:
      "Pin quick transaction buttons and financial insights directly to your Android home screen.",
    stepGuideHelperTitle: "Guide Helper",
    stepGuideHelperDesc:
      "Show or hide the floating tour chip across screens and forms so you can restart guided walkthroughs anytime.",
    stepKaiKnowledgeTitle: "Manage Kai Knowledge",
    stepKaiKnowledgeDesc:
      "Teach Kai custom keywords for your accounts and categories to make AI chat logging even smarter.",
    stepGesturesTitle: "Gestures",
    stepGesturesDesc:
      "Configure physical device gestures like shaking your phone to quickly launch Chat with Kai or Manual Entry from anywhere in the app.",
    stepDefaultExpenseTitle: "Default Expense Account",
    stepDefaultExpenseDesc:
      "Set the preselected account and pocket automatically used when logging new expenses.",
    stepDefaultIncomeTitle: "Default Income Account",
    stepDefaultIncomeDesc:
      "Choose the default destination account for newly recorded salary or revenue entries.",
    stepHexColorsTitle: "Hex Color Palette",
    stepHexColorsDesc:
      "Manage and create custom hex colors to personalize your categories, accounts, and tags.",
    stepResetDataTitle: "Reset All Data",
    stepResetDataDesc:
      "Permanently erase all local transactions, accounts, and settings to start with a fresh slate.",
    stepLocalBackupTitle: "Local Device Backup",
    stepLocalBackupDesc:
      "Export and import encrypted full SQLite database backups directly to your device storage.",
    stepGoogleDriveTitle: "Google Drive Cloud Backup",
    stepGoogleDriveDesc:
      "Safely sync your financial data to your private Google Drive for automated multi-device cloud backups.",
    stepSecurityTitle: "Password & Fingerprint",
    stepSecurityDesc:
      "Protect your sensitive financial records with biometric fingerprint unlock or a secure PIN.",
    stepProTitle: "Finance Pro - Lifetime",
    stepProDesc:
      "Unlock unlimited accounts, cloud backup, attachments, receipt scanning, and smart budget rollover.",
    stepRestorePurchasesTitle: "Restore Purchases",
    stepRestorePurchasesDesc:
      "Restore your active Pro license if reinstalling or moving your workspace to a new device.",
    stepVersionHistoryTitle: "Version History",
    stepVersionHistoryDesc:
      "Browse what changed in every version of the app, including new features, fixes, and improvements.",
  },
  resetData: {
    dismissAccessibility: "Dismiss reset data confirmation",
    title: "Reset all data?",
    message:
      "This permanently deletes your accounts, transactions, budgets, goals, notes, settings, attachments, and app-managed local backups from this device.",
    externalNote:
      "Files already saved in Google Drive are not deleted. This device disconnects from Google Drive and clears Quick Sync settings.",
    confirmationInstruction: "Type RESET to confirm",
    confirmationAccessibility: "Type RESET to confirm resetting all data",
    deleteAll: "Delete all data",
  },
  security: {
    menuTitle: "Password & Fingerprint",
    appLockedTitle: "Kaizen Finance",
    enterPasswordToUnlock: "Enter your password to unlock the app",
    enterPasswordOrBiometrics:
      "Use %{biometric} or enter your password to unlock",
    unlockWithBiometric: "Unlock with %{biometric}",
    tapToScan: "Tap to scan %{biometric}",
    passwordPlaceholder: "Enter password",
    hidePassword: "Hide password",
    showPassword: "Show password",
    unlockButton: "Unlock",
    enterPassword: "Enter your password.",
    incorrectPassword: "Incorrect password. Please try again.",
    passwordSection: "PASSWORD",
    appPassword: "App Password",
    passwordIsConfigured: "Configured · Protects app access",
    passwordNotConfigured: "Not set · App is currently unlocked",
    badgeActive: "SET",
    badgeOff: "OFF",
    setPasswordButton: "Set Password",
    changePasswordButton: "Change",
    removePasswordButton: "Remove",
    biometricSection: "BIOMETRIC UNLOCK",
    biometricTitle: "%{biometric} Unlock",
    defaultBiometricLabel: "Biometrics",
    setupPasswordToActivate: "Set up Password to activate",
    biometricRequiresPassword:
      "Biometric unlock requires an app password to be set first.",
    biometricNoHardware: "Biometric sensor is not available on this device",
    biometricNotEnrolled:
      "No fingerprints enrolled. Register in device settings",
    biometricDescription: "Unlock faster using your %{biometric}",
    biometricCancelledFallback:
      "Biometric scan cancelled. Please enter your password to unlock.",
    biometricLockoutFallback:
      "Too many biometric attempts. Please enter your password to unlock.",
    biometricFailedFallback:
      "Biometric verification failed. Please try again or enter your password.",
    securityNote:
      "Your credentials are encrypted on this device. When enabled, the app locks automatically when you minimize or leave the app.",
    setPasswordTitle: "Set App Password",
    changePasswordTitle: "Change App Password",
    removePasswordTitle: "Remove App Password",
    savePasswordButton: "Save Password",
    updatePasswordButton: "Update Password",
    removePasswordWarning:
      "Removing your password will also disable fingerprint unlock. The app will no longer be locked on startup.",
    currentPasswordLabel: "Current Password",
    currentPasswordPlaceholder: "Enter current password",
    newPasswordLabel: "New Password",
    newPasswordPlaceholder: "Enter new password (min. 4 characters)",
    confirmPasswordLabel: "Confirm Password",
    confirmPasswordPlaceholder: "Re-enter new password",
    enterCurrentPassword: "Enter your current password.",
    passwordMinLength: "Password must be at least 4 characters.",
    passwordsDoNotMatch: "Passwords do not match.",
    forgotPassword: "Forgot password?",
    forgotPasswordTitle: "Forgot Password?",
    forgotPasswordSubtitle:
      "Choose how you want to recover access to Kaizen Finance.",
    biometricResetTitle: "Reset with %{biometric}",
    biometricResetDesc:
      "Scan your %{biometric} to set a new password without entering your current one.",
    verifyBiometricToReset: "Verify %{biometric} to Reset",
    biometricVerifiedBadge: "%{biometric} verified",
    verifyWithBiometricToChange:
      "Forgot current password? Verify with %{biometric}",
    verifyWithBiometricToRemove: "Forgot password? Remove with %{biometric}",
    emergencyResetSectionTitle: "EMERGENCY RECOVERY",
    emergencyResetTitle: "Emergency Reset App Data",
    emergencyResetDesc:
      "Kaizen Finance is 100% offline-first. Credentials are stored securely on this device without cloud recovery or email reset.",
    emergencyResetWarning:
      "This permanently deletes all accounts, transactions, budgets, notes, and local settings, and removes the password lock.",
    emergencyResetButton: "Reset App Data",
    emergencyResetConfirmTitle: "Emergency Reset All Data?",
    emergencyResetConfirmDesc:
      "This will permanently delete all your financial data and remove the app lock. This action cannot be undone.",
    emergencyResetInstruction: "Type RESET to confirm reset",
    emergencyResetAction: "Erase All Data & Unlock",
    resetSuccessfulUnlocking: "Password updated successfully. Unlocking...",
    setNewPasswordTitle: "Set New Password",
    setNewPasswordDesc: "Enter and confirm your new app password.",
    saveAndUnlockButton: "Save & Unlock",
  },
  pro: {
    badge: "PRO",
    lifetime: "Lifetime",
    oneTimeOffer: "One-Time Offer",
    unlockPro: "Unlock Pro",
    proActive: "Lifetime Pro Active",
    allFeaturesUnlocked: "All features unlocked · Ad-free",
    sidebarTitle: "Finance Pro · Lifetime",
    sidebarSubtitle: "No Ads · Advanced Reports",
    sidebarUnlockBtn: "Upgrade to Pro",
    paywallTitle: "Upgrade to Kaizen Pro",
    paywallSubtitle:
      "Take full control of your finances with lifetime access to advanced analytics and an ad-free experience.",
    paywallLifetimeBadge: "ONE-TIME PURCHASE · LIFETIME ACCESS",
    paywallUpgradeBtn: "Unlock Lifetime Pro (%{price})",
    paywallProcessing: "Processing...",
    featuresLeadIn: "Here’s what you’ll get when you upgrade to Pro:",
    launchSpecialBadge: "EARLY BIRD LAUNCH SPECIAL",
    launchSpecialSubtitle: "Limited time offer · Save 60%",
    launchRegularPrice: "₱499",
    launchPromoPrice: "₱199",
    launchDiscountBadge: "60% OFF",
    launchSavingsText: "SAVE ₱300",
    launchSubtext: "Pay once · Lifetime access · Forever updates",
    launchUpgradeBtn: "Claim Launch Offer (%{price})",
    featureModalUpgradeBtn: "Claim Launch Offer (%{price}) · 60% OFF",
    exploreAllFeatures: "Explore All Pro Features →",
    swipeCardsHint: "Swipe left or right to explore Pro features",
    guaranteeText: "One-time purchase · 100% Private · Restore anytime",
    limits: {
      accountsTitle: "You're expanding your portfolio!",
      accountsDesc:
        "You’ve maxed out your first %{count} accounts — great job staying organized! Level up to Kaizen Pro for unlimited accounts, sub-pockets, and complete wealth tracking.",
      pocketsDesc:
        "You're organizing your finances like a pro! Upgrade to Kaizen Pro to create unlimited sub-pockets for granular expense and savings segregation.",
      budgetsTitle: "Mastering your spending!",
      budgetsDesc:
        "You’re actively tracking %{count} category budgets! Upgrade to Kaizen Pro to manage unlimited budgets with automatic surplus rollovers and threshold alerts.",
      goalsTitle: "Big dreams in motion!",
      goalsDesc:
        "You’ve set your first %{count} savings milestones! Supercharge your journey with Kaizen Pro for unlimited goals, target dates, and multi-pocket tracking.",
      schedulesTitle: "Automating your finances!",
      schedulesDesc:
        "You’re staying on top of your bills! Upgrade to Kaizen Pro for unlimited recurring transactions, background auto-posting, and recurrence analytics.",
      notesTitle: "Keeping great records!",
      notesDesc:
        "You’ve filled your first %{count} financial notes! Unlock Kaizen Pro for unlimited notes, document and receipt photo attachments, and custom color tagging.",
      restoreAccountDesc:
        "Restoring this account would exceed your %{count} active accounts. Upgrade to Kaizen Pro for unlimited accounts and complete portfolio freedom.",
      restorePocketDesc:
        "Restoring this pocket would exceed your %{count} pockets for this account. Upgrade to Kaizen Pro for unlimited sub-pockets.",
      restoreScheduleDesc:
        "Restoring this schedule would exceed your %{count} recurring transactions. Upgrade to Kaizen Pro for unlimited schedules.",
    },
    restorePurchases: "Restore Purchases",
    restoring: "Restoring...",
    restoreSuccessTitle: "Purchases Restored",
    restoreSuccessMsg:
      "Your Lifetime Pro status has been successfully restored!",
    restoreNotFoundTitle: "No Purchases Found",
    restoreNotFoundMsg:
      "We couldn't find an active Lifetime Pro purchase for the account currently active in your Google Play Store.\n\nTip: Purchases are linked to your Google Play Store account. If you purchased using another account, open Google Play Store, switch accounts at the top-right profile icon, and try restoring again.",
    restoreErrorTitle: "Restore Failed",
    restoreErrorMsg:
      "Unable to restore purchases at this time. Please try again later.",
    purchaseSuccessTitle: "Welcome to Pro!",
    purchaseSuccessMsg:
      "Thank you for supporting Kaizen Finance! All Pro features are now unlocked.",
    disclaimer:
      "Payment will be charged to your Google Play account at confirmation of purchase. This is a one-time non-consumable purchase with no recurring fees.",
    reportsLockedTitle: "Ready for Complete Financial Clarity?",
    reportsLockedSubtitle:
      "You’re taking control of your daily spending — now see the big picture! Elevate your finances with executive-level Cash Flow charts, Balance Sheets, and Net Worth trajectory.",
    reportsLockedCta: "Unlock Lifetime Access",
    widgetsLockedTitle: "Your Money at a Glance",
    widgetsLockedSubtitle:
      "Stay effortlessly mindful of your budget without opening the app. Pin interactive monthly spend meters and net worth charts straight to your Android home screen.",
    widgetsLockedCta: "Unlock Pro Widgets",
    locked: {
      cloudSyncTitle: "Total Peace of Mind for Your Finances",
      cloudSyncDesc:
        "Your financial journey is priceless. Keep every transaction, budget, and receipt permanently backed up to your personal Google Drive and restore in one tap anytime.",
      securityTitle: "Bank-Grade Privacy for Your Eyes Only",
      securityDesc:
        "Your finances are personal. Add instant Fingerprint or Face ID security so your private net worth and transactions stay completely protected.",
      creditCardsTitle: "Outsmart Credit Card Interest & Fees",
      creditCardsDesc:
        "Take command of multiple billing cycles, statement cutoff reminders, 0% installment schedules, and credit limit alerts to keep your credit score spotless.",
      budgetRolloverTitle: "Make Your Unspent Budget Work for You",
      budgetRolloverDesc:
        "Rewarding smart habits! Automatically roll unspent surplus forward into your next month so every peso you save stays accounted for.",
      receiptsTitle: "Keep Tax-Ready Financial Records",
      receiptsDesc:
        "Never lose a paper receipt or invoice again. Snap and attach high-res photos directly to your transactions and notes for effortless bookkeeping.",
      autoPostTitle: "Save Time on Autopilot",
      autoPostDesc:
        "Automatically execute recurring income, bills, and transfers on their due dates in the background so you never miss a payment.",
      fieldReceiptsTitle: "Tax-Ready Bookkeeping",
      fieldReceiptsDesc:
        "Keep paper receipts and invoices permanently organized by attaching high-res photos directly to your records.",
      fieldSplitTitle: "Pinpoint Multi-Category Precision",
      fieldSplitDesc:
        "One receipt, multiple categories! Effortlessly break down supermarket or mall purchases across exact accounts.",
      fieldInstallmentsTitle: "Never Lose Track of Pay-Offs",
      fieldInstallmentsDesc:
        "Take total control of gadget installments, credit terms, and subscriptions with clear payoff roadmaps.",
      fieldLabelsTitle: "Dimensional Financial Clarity",
      fieldLabelsDesc:
        "Organize spending by project, trip, or tax event for razor-sharp filtering and analytics.",
      fieldQuickPresetsTitle: "Lightning-Fast 1-Tap Logging",
      fieldQuickPresetsDesc:
        "Save time every day by logging frequent coffee, groceries, and commute expenses in a single tap.",
      remindersMonthlyTitle: "Start Every Month with Full Clarity",
      remindersMonthlyDesc:
        "Celebrate your progress with a private executive report summarizing your cash flow, savings rate, and net worth on the 1st of every month.",
      remindersCreditCardsTitle: "Protect Your Credit Score",
      remindersCreditCardsDesc:
        "Stay ahead of statement cutoffs and payment deadlines with proactive reminders tailored to each card.",
      remindersCreditLimitTitle: "Real-Time Debt Protection",
      remindersCreditLimitDesc:
        "Avoid over-limit fees and credit score drops with proactive alerts as balances approach 80% of your limit.",
      remindersScheduledTitle: "Never Miss a Bill Payment",
      remindersScheduledDesc:
        "Stay ahead of upcoming bills, subscriptions, and scheduled transfers with smart advance notifications.",
      remindersBudgetTitle: "Stay Inside Your Budget Comfort Zone",
      remindersBudgetDesc:
        "Keep your spending on target with instant proactive alerts as category expenses approach 80% and 100%.",
      remindersGoalsTitle: "Celebrate Every Savings Milestone",
      remindersGoalsDesc:
        "Stay energized and motivated with advance deadline notices and milestone celebrations as you hit 50%, 75%, and 100%.",
      accountHideSelectionTitle: "Streamlined Everyday Logging",
      accountHideSelectionDesc:
        "Keep your daily transaction picker clutter-free by tucking away emergency funds or vault accounts.",
      accountHideReportsTitle: "True Personal Net Worth",
      accountHideReportsDesc:
        "Exclude escrow deposits, business collateral, or tracked external funds so your personal analytics reflect 100% pure personal wealth.",
      fundGroupsTitle: "Multi-Portfolio Command",
      fundGroupsDesc:
        "Effortlessly separate personal savings, business cash flows, and side-hustles into organized fund groups with dedicated balance rollups.",
      localBackupTitle: "Automated Device Redundancy",
      localBackupDesc:
        "Keep full control of your financial records with automatic, encrypted daily, weekly, or monthly local backups directly on your device storage.",
      quickSyncTitle: "Real-Time Cloud Peace of Mind",
      quickSyncDesc:
        "Every transaction and budget change safely syncs to your personal Google Drive in the background as you record it.",
      hexColorsTitle: "Personalized Visual Styling",
      hexColorsDesc:
        "Design custom hex color palettes to personalize accounts, categories, and tags across your financial dashboard.",
      iconLibraryTitle: "Expanded 200+ Icon Collection",
      iconLibraryDesc:
        "Personalize every account, budget, and savings goal with over 200 high-definition Lucide icons.",
    },
  },
  transactions: {
    swipeDelete: "Delete",
    swipeDuplicate: "Duplicate",
    speedDialForm: "Manual Entry",
    speedDialChat: "Chat with Kai",
    exportSavedTitle: "Saved to device",
    exportSavedMessage: "%{fileName} was saved to the folder you selected.",
    exportEmptyTitle: "Nothing to export",
    exportEmptyMessage: "Adjust your filters or record transactions first.",
    exportFailedTitle: "Export failed",
    exportFailedMessage: "Unable to export transactions.",
    transferFeeTitle: "Transfer Fee",
    transferFeeHelpMessage: "Deduct an instant transaction fee (e.g. InstaPay, GCash, bank charges).",
  },
  chatWithKai: {
    modalTitle: "Chat with Kai",
    modalSubtitle: "Your smart personal finance companion",
    settingsTitle: "Kai Chat Settings",
    settingsSubtitle: "Configure transaction recording behavior",
    modeSectionTitle: "TRANSACTION RECORDING MODE",
    modeReviewTitle: "Review First",
    modeReviewDesc:
      "Kai prepares a draft for you to review and confirm before saving.",
    modeReviewPill: "Tap to Edit · Save",
    modeAutoTitle: "Auto-Save",
    modeAutoDesc:
      "Kai records transactions instantly as you chat. Tap to edit or delete anytime.",
    modeAutoPill: "Tap to Edit · Delete",
    recordedBadge: "Recorded",
    tapToEdit: "Tap to Edit",
    deleteButton: "Delete",
    deleteConfirmTitle: "Delete Transaction?",
    deleteConfirmMessage:
      "Are you sure you want to delete this recorded transaction?",
    deletedBadge: "Deleted",
    deletedNotice: "Transaction was deleted",
    manageKnowledgeLink: "Manage Recognition Keywords",
    inputPlaceholder: "e.g. Spent 500 on lunch at McDonald's from wallet",
    sectionTitle: "Keywords (Kai Assistant Knowledge)",
    bannerCategory:
      "Keywords entered here teach Kai to automatically recognize this category when you enter transactions via chat.",
    bannerAccount:
      "Keywords entered here teach Kai to automatically recognize this account when you enter transactions via chat.",
    manageKeywords: "Recognition Keywords",
    manageKeywordsSubtitle:
      "Assign keywords to categories for accurate recognition",
    manageKeywordsAction: "Manage Keywords",
    addKeywordPlaceholder: "Add keyword (e.g. boba, grab, netflix)...",
    addKeywordPlaceholderCategory:
      "Add keyword (e.g. coffee, groceries, netflix)...",
    addKeywordPlaceholderAccount: "Add keyword (e.g. payroll, wallet, bpi)...",
    addKeywordButton: "Add",
    keywordAdded: "Keyword added successfully",
    keywordDeleted: "Keyword removed",
    keywordDuplicateInList: "Keyword '%{keyword}' is already in the list",
    keywordAlreadyExists:
      "Keyword '%{keyword}' is already assigned to '%{entity}'",
    resetDefaults: "Restore Defaults",
    resetDefaultsConfirm:
      "Are you sure you want to restore the default recognition keywords?",
    noKeywordsYet: "No keywords added yet.",
    filterCategory: "Select Category",
    knowledgeHubTitle: "Manage Kai Knowledge",
    knowledgeHubSubtitle:
      "Teach Kai to recognize actions, categories, and accounts",
    selectorTitle: "Keywords (Kai Knowledge)",
    selectorSubtitle: "%{count} keywords",
    selectorSubtitleSingle: "1 keyword",
    selectorSaveFirstCategory: "Save category first to add keywords",
    selectorSaveFirstAccount: "Save account first to add keywords",
    tabActions: "Actions",
    tabCategories: "Categories",
    tabAccounts: "Accounts",
    tabMerchants: "Merchants",
    subTabMerchants: "Merchants",
    subTabMerchantKeywords: "Keywords",
    actionExpense: "Expense",
    actionIncome: "Income",
    actionTransfer: "Transfer",
    actionExpenseDescription: "Words that indicate spending or money going out",
    actionIncomeDescription: "Words that indicate receiving money or income",
    actionTransferDescription:
      "Words that indicate moving money between accounts",
    searchPlaceholder: "Search...",
    addActionPlaceholder: "Add action word (e.g. bought, paid, send)...",
    tableHeaderKeyword: "Keyword",
    tableHeaderLanguage: "Language",
    tableHeaderActions: "Actions",
    tableHeaderMerchant: "Merchant",
    tableHeaderCategory: "Category",
    tableHeaderAccount: "Account",
    tableHeaderAliases: "Aliases",
    searchKeywordsPlaceholder: "Search keywords or language...",
    editKeywordTitle: "Edit Keyword",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    selectLanguage: "Language",
    langAny: "Any",
    langEn: "English",
    langFil: "Filipino",
    langEs: "Spanish",
    changeCategory: "Change Category",
    changeAccount: "Change Account",
    changeMerchant: "Change Merchant",
    selectCategoryPrompt:
      "Select a category to view and manage its recognition keywords.",
    selectAccountPrompt:
      "Select an account to view and manage its recognition keywords.",
    selectMerchantPrompt:
      "Select a merchant to view and manage its recognition keywords.",
    addKeywordPlaceholderMerchant:
      "Add alias/keyword (e.g. mcdo, sbux, 711)...",
    addMerchantPlaceholder: "Merchant name (e.g. Starbucks, Shell)...",
    defaultCategory: "Default Category",
    defaultAccount: "Default Account",
    noDefaultCategory: "None (Optional)",
    noDefaultAccount: "None (Optional)",
    optionalBadge: "Optional",
    aliasesCount: "%{count} aliases",
    aliasesCountSingle: "1 alias",
    editMerchantTitle: "Edit Merchant",
    addMerchantTitle: "Add Merchant",
    deleteMerchantTitle: "Delete Merchant",
    deleteMerchantConfirm:
      "Are you sure you want to delete '%{name}' and all its recognition keywords?",
    deleteMerchantKeywordTitle: "Delete Keyword",
    deleteMerchantKeywordConfirm:
      "Are you sure you want to delete this keyword?",
    deleteKeywordTitle: "Delete Keyword",
    deleteKeywordConfirm: "Are you sure you want to delete '%{keyword}'?",
    deleteBtn: "Delete",
    noKeywordsMatching: 'No keywords found matching "%{query}"',
    helpModalTitle: "About Kai Knowledge",
    helpModalSubtitle: "How Kai Assistant recognizes your input",
    helpActionsTitle: "Action Keywords",
    helpActionsDesc:
      "Teach Kai which verbs represent spending (Expense), receiving (Income), or moving money between accounts (Transfer).",
    helpCategoriesTitle: "Category Recognition",
    helpCategoriesDesc:
      "Add keywords for apps, stores, services, or brands (e.g. Netflix, Grab, Starbucks). When you mention them in chat, Kai automatically selects the correct category.",
    helpAccountsTitle: "Account Recognition",
    helpAccountsDesc:
      "Kai automatically matches your Account Name by default (e.g. 'using BDO' or 'from GCash'). Adding keywords is only needed for nicknames, abbreviations, or alternate names (e.g. 'wallet' for 'Cash Wallet', or 'payroll' for 'BPI Savings').",
    helpMerchantsTitle: "Merchant Recognition & Defaults",
    helpMerchantsDesc:
      "Add stores, restaurants, or utility providers. Kai recognizes their names and aliases, automatically filling in their default category and default payment account if you didn't specify one in chat.",
    helpLanguagesTitle: "Multi-Language Support",
    helpLanguagesDesc:
      "Kai understands everyday chat across English, Filipino, and Spanish. Chat naturally like 'spent 200 on lunch from bdo' or 'nagbayad ng 500 sa kuryente gamit gcash'.",
    helpClose: "Got it",
    unknownAccountError:
      "I couldn't find an account matching '%{account}'. Please check your account name or add it in Manage Kai Knowledge.",
    pickerSelectCategory: "Select Category",
    pickerSelectAccount: "Select Account",
    pickerSelectMerchant: "Select Merchant",
    pickerSearchCategory: "Search categories...",
    pickerSearchAccount: "Search accounts...",
    pickerSearchMerchant: "Search merchants...",
    noCategoriesFound: "No categories found",
    noAccountsFound: "No accounts found",
    noMerchantsFound: "No merchants found",
    allCategories: "All",
    selectCategory: "Select Category:",
    browseAll: "Browse All",
    chooseCorrectAmount: "Choose the correct amount:",
    alwaysCategorizeAs: "Always categorize '%{keyword}' as '%{category}'?",
    yesAlways: "Yes, Always",
    justThisTime: "Just this time",
  },
  widgetGallery: {
    title: "Home Screen Widgets",
    introTitle: "Add Kaizen to your home screen",
    introSubtitle:
      "Tap Add on any widget and confirm the prompt. You can move or resize it afterwards.",
    unsupportedPlatform:
      "Home screen widgets are currently available on Android only.",
    quickActionsSection: "Quick Actions",
    insightsSection: "Money Insights",
    addButton: "Add",
    addAgainButton: "Add Again",
    unlockButton: "Unlock",
    addedBadge: "On home screen",
    addAccessibility: "Add %{widget} widget to home screen",
    proFeatureDescription:
      "Upgrade to Pro to see your cashflow, net worth, and budget right on your home screen.",
    manualHelpLink: "Can't add it? Add it manually",
    manualStepsTitle: "Add a widget manually",
    manualStepsMessage:
      "1. Go to your home screen and long-press an empty area.\n2. Tap Widgets.\n3. Scroll to Kaizen Finance.\n4. Press and hold a widget, then drag it into place.",
    manualStepsClose: "Got it",
    quickExpenseTitle: "Quick Expense",
    quickExpenseDescription: "Record an expense in one tap.",
    quickIncomeTitle: "Quick Income",
    quickIncomeDescription: "Record income in one tap.",
    quickTransferTitle: "Quick Transfer",
    quickTransferDescription: "Move money between accounts in one tap.",
    dualActionTitle: "Expense & Income",
    dualActionDescription: "Two buttons for recording expenses and income.",
    tripleActionTitle: "Expense, Income & Transfer",
    tripleActionDescription: "One bar for all three transaction types.",
    monthlyCashflowTitle: "Monthly Cashflow",
    monthlyCashflowDescription:
      "See this month's income, spending, and savings at a glance.",
    netWorthTitle: "Net Worth Glance",
    netWorthDescription: "Track your total net worth, assets, and debts.",
    monthlyBudgetTitle: "Monthly Budget Progress",
    monthlyBudgetDescription: "Watch how much of this month's budget is left.",
  },
  appUpdates: {
    updateDownloadedTitle: "Update ready to install",
    updateDownloadedDescription:
      "A new version of Kaizen has finished downloading. Restart now to complete the update.",
    restartToApply: "Restart",
    later: "Later",
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
