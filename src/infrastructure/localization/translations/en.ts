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
    sendFeedback: "Send Feedback",
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
  quickSync: {
    title: "Quick Sync",
    description: "Automatically backup your changes to Google Drive",
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
    generalSection: "GENERAL",
    profileSection: "PROFILE",
    nicknameTitle: "Nickname",
    nicknameDescription: "Personalized name shown on your dashboard",
    nicknameNotSet: "Not set",
    editNicknameTitle: "Edit Nickname",
    editNicknamePrompt: "Enter the name you'd like to be called on your dashboard.",
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
    whatsNew: "What's New",
    whatsNewDescription: "See highlights from the latest app updates",
    whatsNewAccessibility: "Open what's new release notes",
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
    readyDailyReminder: "Daily Reminder: Enabled (8:00 PM)",
    finishSetup: "Go to Home",
    continue: "Continue",
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
    walkthroughChip: "Tour",
    walkthroughSkip: "Skip",
    walkthroughNext: "Next",
    walkthroughBack: "Back",
    walkthroughStartTx: "Tap + below to start",
    walkthroughStepCount: "Step %{current} of %{total}",
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
    stepEyeTitle: "Privacy Masking",
    stepEyeDesc:
      "Tap the eye icon to quickly hide or reveal your balance amounts (••••••), ideal for using the app in public.",
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
  },
  accountsWalkthrough: {
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
  transactionsWalkthrough: {
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
  resetData: {
    dismissAccessibility: "Dismiss reset data confirmation",
    title: "Reset all data?",
    message:
      "This permanently deletes your accounts, transactions, budgets, goals, notes, settings, attachments, and app-managed local backups from this device.",
    externalNote:
      "Files already saved in Google Drive are not deleted. This device disconnects from Google Drive and clears Quick Sync settings.",
    confirmationInstruction: "Type KAIZEN to confirm",
    confirmationAccessibility: "Type KAIZEN to confirm resetting all data",
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
    emergencyResetInstruction: "Type KAIZEN to confirm reset",
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
    restorePurchases: "Restore Purchases",
    restoring: "Restoring...",
    restoreSuccessTitle: "Purchases Restored",
    restoreSuccessMsg: "Your Lifetime Pro status has been successfully restored!",
    restoreNotFoundTitle: "No Purchases Found",
    restoreNotFoundMsg:
      "We couldn't find an active Lifetime Pro purchase for the account currently active in your Google Play Store.\n\nTip: Purchases are linked to your Google Play Store account. If you purchased using another account, open Google Play Store, switch accounts at the top-right profile icon, and try restoring again.",
    restoreErrorTitle: "Restore Failed",
    restoreErrorMsg: "Unable to restore purchases at this time. Please try again later.",
    purchaseSuccessTitle: "Welcome to Pro!",
    purchaseSuccessMsg: "Thank you for supporting Kaizen Finance! All Pro features are now unlocked.",
    disclaimer:
      "Payment will be charged to your Google Play account at confirmation of purchase. This is a one-time non-consumable purchase with no recurring fees.",
    reportsLockedTitle: "Reports & Financial Analytics",
    reportsLockedSubtitle:
      "Unlock Cash Flow trends, Balance Sheet comparisons, Net Worth Growth, and Expense breakdowns with Kaizen Pro.",
    reportsLockedCta: "Unlock Lifetime Access",
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
