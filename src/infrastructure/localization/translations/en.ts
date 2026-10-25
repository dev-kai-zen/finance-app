export const en = {
  common: {
    cancel: "Cancel",
    close: "Close",
    goBack: "Go back",
    ok: "OK",
    search: "Search",
  },
  search: {
    openSearch: "Open search",
    searchPlaceholder: "Search screens, settings & actions...",
    noResultsTitle: "No matching results",
    noResultsSubtitle:
      "Try searching with other keywords like 'password', 'expense', or 'currency'.",
    sectionActions: "QUICK ACTIONS",
    sectionScreens: "SCREENS & FEATURES",
    sectionSettings: "SETTINGS & SECURITY",
    sectionAccounts: "ACCOUNTS",
    sectionCategories: "CATEGORIES",
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
    screenTransactionsExpense: "Transactions (Expenses)",
    screenTransactionsExpenseDesc: "View history of all recorded expenses",
    screenTransactionsIncome: "Transactions (Income)",
    screenTransactionsIncomeDesc: "View history of all recorded income",
    screenCategoriesExpense: "Expense Categories",
    screenCategoriesExpenseDesc: "Manage and organize expense categories",
    screenCategoriesIncome: "Income Categories",
    screenCategoriesIncomeDesc: "Manage and organize income categories",
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
    guideHelperTitle: "Guide helper",
    guideHelperDescription:
      "Show a draggable Guide button on screens to replay walkthroughs",
    quickSearchTitle: "Quick Search",
    quickSearchDescription:
      "Show search button in header and navigation to quickly jump to features",
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
    privacy: "Privacy",
    privacySubtitle: "Read our privacy policy online",
    privacyAccessibility: "Open privacy policy website",
    privacyOpenError: "Could not open privacy policy website.",
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
  versionHistory: {
    heading: "Version History",
    continue: "Continue",
    dismissAccessibility: "Dismiss version history",
    versionLabel: "Version %{version}",
    empty: "Release notes for this version are not available yet.",
    categories: {
      feature: "Feature",
      update: "Update",
      fix: "Fix",
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
    v110: {
      updateItem1:
        "Rename What's New to Version History and show every past update in one list.",
    },
    v100: {
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
      calendarItem2:
        "Fix bugs when selecting date.",
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
    stepDateDesc:
      "Set the calendar date when the transaction took place.",
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
    stepSaveDesc:
      "Save your transaction immediately to your local ledger.",
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
    stepFilterDesc:
      "Filter between Active, Completed, and Archived schedules.",
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
    stepSaveDesc:
      "Tap to save and activate your category spending limit.",
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
    stepIconDesc:
      "Choose a motivating icon to visually represent your target.",
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
      "Toggle any budget on or off at will without losing your past transactions or configuration.",
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
    stepFirstItemMarkCompleteTitle: "Mark as Completed",
    stepFirstItemMarkCompleteDesc:
      "Celebrate reaching your target by marking the goal as completed, or reopen it anytime if you want to keep saving.",
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
    stepGuideHelperTitle: "Guide Helper",
    stepGuideHelperDesc:
      "Show or hide the floating tour chip across screens and forms so you can restart guided walkthroughs anytime.",
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
