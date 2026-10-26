import type {
  TranslationCatalog,
  TranslationCatalogShape,
} from "@/infrastructure/localization/translations/en";

export const fil = {
  common: {
    cancel: "Kanselahin",
    close: "Isara",
    goBack: "Bumalik",
    ok: "OK",
    search: "Maghanap",
  },
  search: {
    openSearch: "Buksan ang paghahanap",
    searchPlaceholder: "Maghanap ng screens, settings at aksyon...",
    noResultsTitle: "Walang tumugmang resulta",
    noResultsSubtitle:
      "Subukang maghanap gamit ang ibang mga keyword tulad ng 'password', 'gastos', o 'currency'.",
    sectionActions: "MGA MABILISANG AKSYON",
    sectionScreens: "MGA SCREEN AT FEATURE",
    sectionSettings: "MGA SETTING AT SEGURIDAD",
    sectionAccounts: "MGA ACCOUNT",
    sectionCategories: "MGA KATEGORYA",
    suggestedTitle: "MGA IPINAPAYONG SHORTCUT",
    clearSearch: "Burahin",
    itemSettingsBadge: "Setting",
    itemActionBadge: "Aksyon",
    itemScreenBadge: "Screen",
    actionRecordExpense: "Magtala ng Gastos",
    actionRecordExpenseDesc: "Buksan ang form ng transaksyon para sa gastos",
    actionRecordIncome: "Magtala ng Kita",
    actionRecordIncomeDesc: "Buksan ang form ng transaksyon para sa kita",
    actionTransfer: "Maglipat ng Pera",
    actionTransferDesc: "Maglipat ng pondo sa pagitan ng iyong mga account",
    actionAddAccount: "Magdagdag ng Bagong Account",
    actionAddAccountDesc: "Gumawa ng bangko, cash, o e-wallet account",
    actionAddBudget: "Gumawa ng Badyet sa Kategorya",
    actionAddBudgetDesc: "Magtakda ng limitasyon sa paggastos",
    actionAddGoal: "Bagong Layunin sa Pag-iipon",
    actionAddGoalDesc: "Magtakda ng bagong target o milestone sa pag-iipon",
    actionAddNote: "Gumawa ng Tala",
    actionAddNoteDesc: "Magdagdag ng memo, checklist, o resibo",
    actionAddScheduled: "Magdagdag ng Naka-iskedyul",
    actionAddScheduledDesc: "Gumawa ng paulit-ulit na bayarin, sahod, o paglipat",
    actionAddCategory: "Magdagdag ng Kategorya",
    actionAddCategoryDesc: "Gumawa ng custom na grupo ng kategorya",
    actionAddCreditCard: "Magdagdag ng Credit Card",
    actionAddCreditCardDesc: "Gumawa ng credit card account para sa monitoring",
    actionTransactionsTrash: "Basurahan ng mga Transaksyon",
    actionTransactionsTrashDesc: "Tingnan, ibalik, o permanenteng burahin ang mga naburang transaksyon",
    actionExportTransactionsCsv: "I-export ang mga Transaksyon (CSV)",
    actionExportTransactionsCsvDesc: "I-save o ibahagi ang mga talaan ng transaksyon bilang CSV spreadsheet",
    actionArchivedAccounts: "Naka-archive na mga Account at Pocket",
    actionArchivedAccountsDesc: "Tingnan at ibalik ang mga nakatagong o naka-archive na account at pocket",
    screenTransactionsExpense: "Mga Transaksyon (Gastos)",
    screenTransactionsExpenseDesc: "Tingnan ang kasaysayan ng lahat ng naitalang gastos",
    screenTransactionsIncome: "Mga Transaksyon (Kita)",
    screenTransactionsIncomeDesc: "Tingnan ang kasaysayan ng lahat ng naitalang kita",
    screenCategoriesExpense: "Mga Kategorya ng Gastos",
    screenCategoriesExpenseDesc: "Pamahalaan at ayusin ang mga kategorya ng gastos",
    screenCategoriesIncome: "Mga Kategorya ng Kita",
    screenCategoriesIncomeDesc: "Pamahalaan at ayusin ang mga kategorya ng kita",
    screenReportCashFlow: "Ulat ng Daloy ng Pera (Cash Flow)",
    screenReportCashFlowDesc: "Suriin ang kabuuang perang pumapasok at lumalabas",
    screenReportBalanceSheet: "Paghahambing ng Talaan ng Balanse",
    screenReportBalanceSheetDesc: "Ihambing ang mga asset at pananagutan sa paglipas ng panahon",
    screenReportNetWorth: "Paglago ng Net Worth",
    screenReportNetWorthDesc: "Subaybayan ang kalusugan ng pananalapi at kabuuang yaman",
    screenReportLabelsSummary: "Buod ng mga Label",
    screenReportLabelsSummaryDesc: "Tingnan ang breakdown ng mga transaksyon ayon sa label",
    settingNicknameDesc: "Itakda ang iyong palayaw at bati sa profile",
    settingDeveloperMessageDesc: "Basahin ang personal na mensahe mula sa gumawa ng app",
    settingPrivacyPolicyDesc: "Suriin ang aming patakaran sa privacy at seguridad",
    settingRestorePurchasesDesc: "Ibalik ang iyong aktibong lisensya ng Kaizen Pro",
    settingQuickSearchDesc: "I-configure ang button ng paghahanap sa header at sidebar",
    settingSqliteMonitorDesc: "Suriin ang mga talahanayan at diagnostics ng SQLite",
    guidesToSetting: "Gigabayan sa setting",
  },
  navigation: {
    dashboard: "Dashboard",
    accounts: "Mga Account",
    transactions: "Mga Transaksyon",
    scheduledTransactions: "Naka-iskedyul na mga Transaksyon",
    calendar: "Kalendaryo",
    creditCards: "Mga Credit Card",
    creditCardMonitoring: "Pagsubaybay sa Credit Card",
    categories: "Mga Kategorya",
    budgets: "Mga Badyet",
    goals: "Mga Layunin",
    reports: "Mga Ulat",
    notes: "Mga Tala",
    sqliteMonitor: "SQLite Monitor",
    settings: "Mga Setting",
    sendFeedback: "Magpadala ng Feedback",
    localBackup: "Lokal na Backup",
    googleDriveBackup: "Google Drive Backup",
    language: "Wika",
    currencySetup: "Setup ng Currency",
    menu: "MENU",
    openMenu: "Buksan ang navigation menu",
    closeMenu: "Isara ang navigation menu",
    moreFeatures: "Higit pang features",
    moreFeaturesDescription:
      "Ipakita o itago ang opsyonal na menu items. Puwede mong baguhin ang mga ito anumang oras.",
    resetSimpleMenu: "Ibalik sa simpleng menu",
    scrollDown: "Mag-scroll pababa para sa higit pang mga item",
  },
  brand: {
    tagline: "Patuloy na pagpapabuti ng pananalapi",
    logoAccessibility: "Logo ng %{name}",
  },
  sync: {
    localOnly: "Lokal lamang",
    syncing: "Nagsi-sync...",
    synced: "Na-sync na",
    waitingNetwork: "Naghihintay ng Wi-Fi",
    failed: "Nabigo ang pag-sync",
    accessibility:
      "Status ng pag-sync: %{label}. I-tap para buksan ang mga setting.",
  },
  scheduledBackup: {
    title: "Naka-iskedyul na backup",
    description:
      "Mag-upload ng buong backup na walang password araw-araw, linggu-linggo, o buwan-buwan kapag binuksan mo ang app.",
    lastRun: "Huling naka-iskedyul na backup: %{time}",
    neverRun: "Hindi pa",
    proTitle: "Naka-iskedyul na Google Drive Backup",
    proDescription:
      "Awtomatikong mag-upload ng buong backup sa Google Drive ayon sa iyong iskedyul gamit ang Kaizen Pro.",
  },
  quickSync: {
    title: "Quick Sync",
    description: "I-sync ang mga pagbabago sa Google Drive kapag nagbago ang data mo",
    networkLabel: "I-sync sa pamamagitan ng",
    wifiOnly: "Wi-Fi lamang",
    wifiOnlyDescription: "I-sync lamang kapag nakakonekta sa Wi-Fi",
    anyNetwork: "Wi-Fi at Mobile data",
    anyNetworkDescription: "I-sync sa Wi-Fi o mobile data",
    statusLabel: "Status",
    lastSynced: "Huling na-sync: %{time}",
    neverSynced: "Hindi pa na-sync",
    syncNow: "I-sync ngayon",
    syncingNow: "Nagsi-sync...",
    restore: "I-restore",
    restoring: "Nire-restore...",
    restoreFailed: "Hindi ma-restore ang Quick Sync backup.",
    restoreConfirmTitle: "I-restore ang Quick Sync?",
    restoreConfirmMessage:
      "Pinapalitan nito ang lahat ng lokal na data ng pinakabagong Quick Sync file mula sa Google Drive. May safety copy sa memory at awtomatikong ibabalik kung mabigo ang validation.",
    restoreConfirmAction: "I-restore",
  },
  settings: {
    generalSection: "PANGKALAHATAN",
    profileSection: "PROFILE",
    nicknameTitle: "Palayaw (Nickname)",
    nicknameDescription: "Personal na pangalan na ipapakita sa iyong dashboard",
    nicknameNotSet: "Hindi nakatakda",
    editNicknameTitle: "I-edit ang Palayaw",
    editNicknamePrompt: "Ilagay ang pangalang nais mong itawag sa iyo sa dashboard.",
    nicknameSave: "I-save",
    nicknameCancel: "Kanselahin",
    localizationSection: "LOKALISASYON",
    themeTitle: "Tema",
    defaultAccountExpenseLabel: "Default na Account (Gastos)",
    defaultAccountIncomeLabel: "Default na Account (Kita)",
    resetDataAccessibility:
      "I-reset ang lahat ng app data. I-tap para magpatuloy.",
    languageSection: "WIKA",
    languageTitle: "Wika",
    languageSystemValue: "Default ng system · %{language}",
    languageAccessibility:
      "Kasalukuyang wika: %{language}. I-tap para palitan.",
    currencySection: "CURRENCY AT MGA NUMERO",
    currencySetup: "Setup ng Currency",
    currencySetupDescription: "Currency, sign, decimal, at kulay ng halaga",
    currencySetupAccessibility: "I-configure ang currency at format ng numero",
    remindersTitle: "Mga Paalala",
    remindersDescription: "Araw-araw na pag-record at mga paalala sa bayarin",
    remindersAccessibility: "I-configure ang mga paalala",
    guideHelperTitle: "Guide helper",
    guideHelperDescription:
      "Ipakita ang draggable na Guide button sa mga screen para ulitin ang walkthrough",
    quickSearchTitle: "Mabilisang Paghahanap",
    quickSearchDescription:
      "Ipakita ang button ng paghahanap sa header at navigation para mabilisang pumunta sa mga feature",
    kaiKnowledgeTitle: "Pamahalaan ang Kaalaman ni Kai",
    kaiKnowledgeDescription:
      "Turuan si Kai ng mga keyword para sa aksyon, kategorya, at account",
    defaultAccountsSection: "MGA DEFAULT NA ACCOUNT",
    expense: "Gastos",
    income: "Kita",
    defaultAccountNone: "Wala (Unang available)",
    defaultAccountPickerNone: "Wala (Unang available na account)",
    defaultExpenseAccessibility:
      "Default na account para sa gastos: %{account}. I-tap para palitan.",
    defaultIncomeAccessibility:
      "Default na account para sa kita: %{account}. I-tap para palitan.",
    defaultExpenseTitle: "Default na Account para sa Gastos",
    defaultIncomeTitle: "Default na Account para sa Kita",
    availablePocket: "Available",
    backupSection: "BACKUP AT SYNC",
    localBackupAccessibility: "Pamahalaan ang mga lokal na backup",
    localBackupDescription:
      "Gumawa, mag-export, o mag-restore ng backup sa device",
    googleDriveAccessibility: "Pamahalaan ang mga backup sa Google Drive",
    googleDrive: "Google Drive",
    googleDriveDescription:
      "Kumonekta, gumawa, o mag-restore ng cloud backup",
    backupPaused: "Naka-pause ang backup",
    backupPausedDescription:
      "Pansamantala ang mga sample record at hindi ina-upload sa Google Drive. Magsimula ng personal na workspace para paganahin ang backup.",
    appearanceSection: "TEMA AT MGA PRESET NG KULAY",
    themeAccessibility:
      "Kasalukuyang tema: %{theme}. I-tap para palitan.",
    followingAppearance: "Sinusunod ang hitsura ng device",
    paletteSaved: "%{mode} na palette - naka-save sa device na ito",
    light: "Maliwanag",
    dark: "Madilim",
    sourceManagementSection: "PAMAMAHALA NG SOURCE",
    hexColors: "Mga Hex Color",
    hexColorsAccessibility:
      "Pamahalaan ang mga hex color. %{count} kulay ang available.",
    securitySection: "SEGURIDAD AT PRIVACY",
    securityMenuTitle: "Password at Fingerprint",
    securityMenuSubtitleConfigured: "Protektado · Aktibo ang password",
    securityMenuSubtitleNotConfigured: "Hindi pa naka-set · I-tap para i-set up",
    securityMenuAccessibility:
      "Buksan ang mga setting ng seguridad. I-configure ang password at biometric unlock.",
    dangerZone: "DELIKADONG ZONE",
    resetData: "I-reset ang Data",
    resetDataDescription:
      "Permanenteng burahin ang lahat ng lokal na app data at magsimulang muli.",
    aboutSection: "TUNGKOL SA APP",
    versionHistory: "Kasaysayan ng Bersyon",
    versionHistoryDescription: "Tingnan ang mga pagbabago sa bawat bersyon ng app",
    versionHistoryAccessibility: "Buksan ang kasaysayan ng bersyon",
    developerMessage: "Mensahe at Layunin ng Developer",
    developerMessageSubtitle:
      "Liham mula kay John Paul Arellano tungkol sa aming misyon at financial literacy",
    developerMessageAccessibility: "Basahin ang mensahe at layunin mula sa developer",
    privacy: "Privacy",
    privacySubtitle: "Basahin ang aming patakaran sa privacy online",
    privacyAccessibility: "Buksan ang website ng patakaran sa privacy",
    privacyOpenError: "Hindi mabuksan ang website ng patakaran sa privacy.",
    developerModeEnabledTitle: "Naka-on ang developer mode",
    developerModeEnabledMessage: "Available na ang SQLite Monitor sa menu.",
    developerSection: "DEVELOPER",
    developerMode: "Developer mode",
    developerModeDescription: "Ipakita ang SQLite Monitor sa navigation menu",
    sqliteMonitor: "SQLite Monitor",
    sqliteMonitorDescription: "Tingnan ang mga table at mag-SQL sa device na ito",
    moreToolsSection: "MGA KARAGDAGANG TOOL",
    moreToolsDescription: "Ipakita ang extra screen sa menu kapag kailangan mo",
    navCalendar: "Calendar",
    navCreditCards: "Credit Cards",
    navCategories: "Mga Kategorya",
    navBudgets: "Mga Budget",
    navGoals: "Mga Goal",
    navReports: "Mga Report",
    navNotes: "Mga Note",
  },
  currency: {
    defaultCurrency: "Default na currency",
    displayCurrency: "Ipakita ang currency",
    displayCurrencyDescription: "Ipakita ang currency sa mga halaga",
    colorAmounts: "Kulayan ang mga halaga",
    colorAmountsDescription: "Kulayan ang positibo at negatibong halaga",
    negativeNumber: "Negatibong Numero",
    catalogTitle: "Mga Currency",
    catalogRowLabel: "Mga currency at decimal place",
    catalogRowValue: "%{count} na currency",
    catalogDescription: "Magdagdag ng custom currency o ayusin ang decimal places.",
    catalogHelpTitle: "Tungkol sa mga currency",
    catalogHelpMessage:
      "Magdagdag ng custom currency o baguhin ang decimal places bago gamitin sa account, goal, rate, o bilang default currency. Pananatilihin ng built-in currencies ang code at pangalan; maaaring baguhin ang decimal places bago pa gamitin.",
    catalogHelpAccessibility: "Tulong sa mga currency",
    catalogHelpHint: "Ipinapakita ang tulong sa pamamahala ng currency",
    decimalPlacesLabel: "%{count} decimal place",
    sampleAmount: "Halimbawa",
    addCurrency: "Magdagdag ng currency",
    usedChip: "Ginagamit",
    usageClickToView: "I-click para tingnan",
    usedLockedMessage:
      "Ginagamit na ang currency na ito. Hindi na maaaring baguhin ang decimal places o detalye.",
    usageChipAccessibility: "Ginagamit, ipakita kung saan ginagamit ang currency",
    usageModalLink: "Tingnan kung saan ginagamit",
    usageModalTitle: "Saan ginagamit ang %{code}",
    usageModalIntro: "Ang %{code} ay nakaugnay sa mga sumusunod:",
    usageModalEmpty: "Walang nakitang aktibong reference para sa %{code}.",
    usageReasonAccounts: "%{count} account",
    usageReasonGoals: "%{count} goal",
    usageReasonTransactions: "%{count} transaction",
    usageReasonExchangeRates: "Mga setting ng conversion rate (%{count})",
    usageReasonDefault: "Default currency mo para sa total at bagong account",
    fieldCode: "Currency code",
    codeAlreadyInUse: "Ginagamit na ang currency code na ito.",
    fieldName: "Pangalan",
    fieldNamePlaceholder: "Canadian Dollar",
    fieldSymbol: "Simbolo",
    fieldDecimalPlaces: "Decimal places",
    fieldDecimalPlacesHint: "Buong numero mula 0 hanggang 3 (hal. 2 para sa cents, 0 para sa yen, 3 para sa dinar).",
    builtinEditHint:
      "Built-in currency: puwede lang baguhin ang decimal places bago gamitin.",
    deleteTitle: "Burahin ang currency",
    deleteAction: "Burahin",
    deleteCurrency: "Burahin ang currency",
    deleteConfirm:
      "Burahin ang %{code}? Aalisin ang mga conversion rate para sa currency na ito. Hindi na ito maibabalik.",
    errorTitle: "Hindi ma-save",
    decimalFormat: "Format ng Decimal",
    automaticFormat: "Awtomatiko · Batay sa rehiyon ng device",
    chooseCurrency: "Default na Currency",
    chooseCurrencyDescription:
      "Piliin ang currency para sa pinagsamang total at mga bagong account.",
    searchCurrencies: "Maghanap ayon sa pangalan o code ng currency",
    noCurrenciesFound: "Walang currency na tumutugma sa iyong paghahanap.",
    negativeNumberDescription:
      "Piliin kung paano ipapakita ang mga negatibong halaga.",
    decimalFormatDescription:
      "Piliin ang format ng thousands at decimal separator.",
    helpTitle: "Tungkol sa Setup ng Currency",
    helpMessage:
      "Ginagamit ang default na currency para sa pinagsamang total at mga bagong account. Mananatili ang currency ng mga kasalukuyang account. Hindi binabago ng mga display option ang naka-save na halaga.",
  },
  googleDriveBackup: {
    helpTitle: "Tungkol sa Google Drive Backup",
    helpMessage:
      "Magtabi ng exported copy ng financial database sa Google Drive account mo at i-restore ito sa ibang device. Ikonekta ang account, gumawa ng backup kapag kailangan, at pumili ng naka-save na archive kapag magre-restore.",
    loading: "Nilo-load ang Google Drive backup...",
    loadingBackups: "Nilo-load ang mga backup...",
    onboardingQuickSyncPromptTitle: "May Quick Sync backup",
    onboardingQuickSyncPromptMessage:
      "May awtomatikong Quick Sync file sa Google Drive. I-restore ito para sa pinakabagong data, o pumili ng full encrypted backup.",
    restoreQuickSyncTitle: "I-restore ang Quick Sync",
    restoreQuickSyncDescription: "Pinakabagong auto-sync noong %{date}",
    restoreQuickSyncAction: "I-restore ang Quick Sync",
    restoreQuickSyncUseFullBackup: "Pumili ng full backup",
    restoreQuickSyncConfirmTitle: "I-restore ang Quick Sync?",
    restoreQuickSyncConfirmMessage:
      "Pinapalitan nito ang lahat ng lokal na data ng Quick Sync file at ibinabalik ang Quick Sync sa device na ito.",
  },
  language: {
    helpTitle: "Tungkol sa Wika",
    helpMessage:
      "Piliin ang wikang gagamitin sa navigation at mga setting. Ang default ng system ay sumusunod sa wika ng device kapag may suportadong translation.",
    searchPlaceholder: "Maghanap ng wika",
    searchAccessibility: "Maghanap ng wika",
    systemDefault: "Default ng system",
    systemDefaultDescription: "Kasalukuyang %{language}",
    selectedAccessibility: "%{language}, napili",
    optionAccessibility: "Gamitin ang %{language}",
    moreComingSoon: "Mas marami pang wika ang paparating.",
    noResultsTitle: "Walang nahanap na wika",
    noResultsDescription: "Subukan ang ibang pangalan ng wika o locale code.",
  },
  scheduledTransactions: {
    helpTitle: "Tungkol sa Naka-iskedyul na mga Transaksyon",
    helpMessage:
      "Mag-set up ng umuulit na kita, gastos, o transfer. Piliin kung awtomatikong i-po-post ang bawat occurrence o hihintayin ang iyong kumpirmasyon. Ang due o failed na item ay lalabas sa Needs attention; maaari mong i-pause, tapusin, o i-archive ang mga iskedyul nang hindi tinatanggal ang mga transaksyong na-post na.",
  },
  themePicker: {
    closeAccessibility: "Isara ang tagapili ng tema",
    title: "Pumili ng hitsura",
    subtitle:
      "I-preview ang buong palette ng app bago umalis sa screen na ito.",
    followDevice: "Sundin ang hitsura ng device",
    followDeviceDescription:
      "Paper sa light mode at Ink sa dark mode.",
    palettes: "MGA PALETTE",
    choices: "%{count} pagpipilian",
  },
  versionHistory: {
    heading: "Kasaysayan ng Bersyon",
    continue: "Magpatuloy",
    dismissAccessibility: "Isara ang kasaysayan ng bersyon",
    versionLabel: "Bersyon %{version}",
    empty: "Wala pang release notes para sa bersyong ito.",
    categories: {
      feature: "Bagong Feature",
      update: "Update",
      fix: "Ayos",
      accounts: "Mga Account",
      transactions: "Mga Transaksyon",
      calendar: "Kalendaryo",
      budgets: "Mga Badyet",
      scheduledTransactions: "Naka-iskedyul na Transaksyon",
      creditCards: "Mga Credit Card",
      goals: "Mga Layunin",
      reports: "Mga Ulat at Analytics",
      security: "Privacy at Seguridad",
      backup: "Backup at Pag-sync",
      general: "Pangkalahatan",
    },
    v111: {
      quickActionsItem1:
        "Ipakita ang mga limitasyon ng libreng plano kapag ginagamit ang mga quick action button sa dashboard.",
    },
    v110: {
      searchItem1:
        "Magdagdag ng Mabilisang Paghahanap upang madaling mahanap at mapuntahan ang mga screen, setting, at aksyon.",
      updateItem1:
        "Pinalitan ang Ano ang Bago ng Kasaysayan ng Bersyon at ipinapakita na ang lahat ng nakaraang update sa isang listahan.",
    },
    v100: {
      title: "Maligayang pagdating sa Kaizen Finance",
      accountsItem1:
        "Subaybayan ang pera, bank account, credit card, at ipon gamit ang running balance.",
      accountsItem2:
        "Maglipat ng pera sa pagitan ng iyong mga account nang may awtomatikong update sa balanse.",
      transactionsItem1:
        "Mabilis na magtala ng kita at gastos gamit ang mga kategorya, tala, at custom fields.",
      transactionsItem2:
        "Mag-attach ng mga larawan ng resibo at mag-filter ng mga transaksyon ayon sa petsa o account.",
      calendarItem1:
        "Tingnan ang kabuuang gastos bawat araw at mga darating na bayarin sa kalendaryo.",
      calendarItem2:
        "Inayos ang mga bug kapag pumipili ng petsa.",
      budgetsItem1:
        "Magtakda ng buwanang limitasyon sa gastos bawat kategorya upang maiwasan ang labis na paggastos.",
      budgetsItem2:
        "Kumuha ng visual na progress bar at mga babala bago ka lumampas sa badyet.",
      scheduledItem1:
        "Mag-set up ng mga paulit-ulit na bayarin, subscription, at sahod na may paalala sa takdang petsa.",
      creditCardsItem1:
        "Subaybayan ang billing cycle, takdang petsa ng bayad, credit limit, at paggamit ng credit card.",
      goalsItem1:
        "Magtakda ng mga layunin sa pag-iipon at subaybayan ang iyong pag-usad habang nag-iipon.",
      reportsItem1:
        "Tingnan ang malinaw na mga tsart at visual na ulat ng iyong mga gawi sa paggastos at net worth.",
      securityItem1:
        "100% offline-first — mananatiling pribado sa iyong device ang lahat ng datos sa pananalapi.",
      securityItem2:
        "I-lock ang app gamit ang iyong fingerprint, Face ID, o PIN.",
      backupItem1:
        "Ligtas na mag-export at mag-import ng mga backup file o mag-sync sa Google Drive.",
    },
  },
  developerMessage: {
    badge: "MENSAHE AT MISYON NG DEVELOPER",
    title: "Mensahe mula sa Developer",
    subtitle: "Ang layunin at puso sa likod ng application na ito",
    missionTitle: "Ang Misyon: Financial Literacy para sa Lahat",
    missionBody:
      "Nang binuo ko ang app na ito, iisa lang ang aking mithiin: tulungan ang bawat isa na maging maalam sa pananalapi (financially literate). Ang kalayaan sa pera ay hindi nagsisimula sa kumplikadong pamumuhunan; nagsisimula ito sa pagkatutong magmonitor ng sariling cashflow. Kapag alam mo kung saan nanggagaling at saan napupunta ang iyong pera, nagkakaroon ka ng kapayapaan at kontrol.",
    kaizenTitle: "Ang Bunga ng Unti-unting Pag-unlad",
    kaizenBody:
      "Sa wikang Hapon, ang 'Kaizen' (改善) ay nangangahulugang tuluy-tuloy na pagpapabuti. Hindi mo kailangang baguhin ang lahat sa isang iglap. Ang pagtatala ng kahit isang gastos bawat araw ay lumilikha ng pangmatagalang gawi tungo sa tagumpay.",
    supportTitle: "Independiyenteng Gawa para sa Iyo",
    supportBody:
      "Binuo ko ang Kaizen Finance nang mag-isa bilang isang ligtas, offline-first na kasama—walang pagbenta ng datos at walang abala. Kung nakatutulong ito sa iyong buhay, ang pagbili ng Kaizen Pro ay direktang sumusuporta sa akin upang patuloy na mapaganda ang app.",
    feedbackTitle: "Mahalaga ang Iyong Boses",
    feedbackBody:
      "Ang app na ito ay para sa iyo. Huwag mag-atubiling magpadala ng feedback, mga mungkahi, o karanasan. Sabik akong marinig ang iyong kwento.",
    signaturePre: "Kasama mo sa iyong pag-unlad,",
    signatureName: "John Paul C. Arellano",
    actionBegin: "Simulan Natin",
    actionFeedback: "Magpadala ng Feedback",
    actionSupport: "Suportahan gamit ang Pro",
  },
  onboarding: {
    welcomeTitle: "Maligayang pagdating sa Kaizen Finance",
    welcomeDescription:
      "Isang payapang lugar para subaybayan ang pera na pumasok, lumabas, at natitira.",
    welcomePoint1: "I-record ang gastos at kita sa ilang tap lang",
    welcomePoint2: "Tingnan kung magkano ang meron ka at ginastos ngayong buwan",
    welcomePoint3: "Nasa device mo ang data at gumagana offline",
    getStarted: "Magsimula",
    restoreBackup: "I-restore ang backup",
    seeExample: "Tingnan ang halimbawang workspace",
    setupMyself: "Ako na ang mag-setup",
    allSetupOptions: "Tingnan ang lahat ng onboarding options",
    backToSample: "Bumalik sa sample",
    backToSetupChoices: "Bumalik sa setup choices",
    nicknameTitle: "Ano ang itatawag namin sa iyo?",
    nicknameDescription:
      "Gagawin naming personal ang iyong workspace at araw-araw na dashboard.",
    nicknameLabel: "IYONG PALAYAW",
    nicknamePlaceholder: "hal. Alex, Sam, Jordan",
    nicknameHint: "Maaari mong baguhin ang iyong palayaw anumang oras sa Settings.",
    languageTitle: "Piliin ang wika",
    languageDescription: "Maaari mong palitan ito anumang oras sa Settings.",
    languageTitleAssisted: "Ikinagagalak kitang makilala, %{name}!",
    languageDescriptionAssisted:
      "Anong wika ang mas komportable mong gamitin?",
    currencyTitle: "Anong pera ang ginagamit mo?",
    currencyDescription: "Gagamitin ito sa unang account at mga halaga.",
    currencyTitleAssisted: "Anong pera ang ginagamit mo, %{name}?",
    currencyDescriptionAssisted:
      "Gagamitin natin ito upang ipakita ang iyong mga balanse at ulat.",
    currencyHint:
      "Hindi mahanap ang iyong pera? Maaari mo itong idagdag mamaya sa Settings.",
    accountTitle: "Unang account mo",
    accountDescription: "Saan mo karaniwang iniingatan ang pera na ginagastos?",
    accountTitleAssisted: "I-set up natin ang iyong unang account, %{name}",
    accountDescriptionAssisted:
      "Saan mo karaniwang itinatabi ang perang ginagastos o iniipon?",
    accountTypeLabel: "URI NG ACCOUNT",
    accountTemplateCash: "Cash",
    accountTemplateBank: "Bank",
    accountTemplateEwallet: "E-Wallet",
    accountTemplateSavings: "Savings",
    accountNameLabel: "PANGALAN NG ACCOUNT",
    accountNamePlaceholder: "hal. Wallet, BDO, GCash",
    openingBalanceLabel: "MAGKANO ANG LAMAN NGAYON?",
    openingBalanceHint: "Opsyonal. Maaari mong baguhin ito mamaya.",
    notificationsTitle: "Manatiling organisado",
    notificationsTitleAssisted: "Maging konsistent, %{name}!",
    notificationsDescription:
      "I-on ang araw-araw na paalala upang manatiling kontrolado ang iyong mga gastusin.",
    notificationsDescriptionAssisted:
      "I-on ang araw-araw na paalala upang bumuo ng magandang gawi sa pagtatala ng gastos.",
    notificationsPermissionTitle: "Push Notifications",
    notificationsPermissionDesc:
      "Makatanggap ng mga paalala, alerto, at mahahalagang update.",
    dailyReminderTitle: "Araw-araw na Paalala",
    dailyReminderDesc:
      "Makatanggap ng magiliw na paalala sa gabi para itala ang mga nagastos (8:00 PM).",
    notificationsTip:
      "Maaari mong baguhin ang oras ng paalala o kagustuhan sa notifications anumang oras sa Settings.",
    readyTitle: "Handa ka na",
    readyDescription: "I-tap ang + sa Home para i-record ang unang gastos.",
    readyTitleAssisted: "Handa ka na, %{name}!",
    readyDescriptionAssisted:
      "Handa na ang iyong workspace. Simulan natin ang iyong pinansyal na paglalakbay.",
    readyNickname: "Palayaw: %{name}",
    readyCurrency: "Currency: %{currency}",
    readyAccount: "Account: %{name}",
    readyAccountRecommended:
      "Mga Account: Inirekumendang starter pack (Cash, Bangko, Ipon, E-Wallet)",
    readyAccountManual:
      "Mga Account: Magsimula mula sa simula (walang panimulang account)",
    readyDailyReminder: "Araw-araw na Paalala: Naka-on (8:00 PM)",
    finishSetup: "Pumunta sa Home",
    continue: "Magpatuloy",
    accountSetupChoiceTitle: "Paano mo gustong i-setup ang iyong mga account?",
    accountSetupChoiceTitleAssisted:
      "Paano mo gustong i-setup ang iyong mga account, %{name}?",
    accountSetupChoiceDescription:
      "Piliin kung gagawa ng iyong unang account, gagamit ng inirekumendang starter presets, o magsisimula mula sa simula.",
    accountSetupChoiceDescriptionAssisted:
      "Piliin kung gagawa ng iyong unang account, gagamit ng inirekumendang starter presets, o magsisimula mula sa simula.",
    accountChoiceSingleTitle: "Gawin ang aking unang account",
    accountChoiceSingleDesc:
      "I-setup ang iyong pangunahing account gamit ang sariling pangalan, uri, at panimulang balanse.",
    accountChoiceRecommendedTitle: "Gamitin ang inirekumendang mga account",
    accountChoiceRecommendedDesc:
      "Handang gamiting mga account (Cash, Bangko, Ipon, E-Wallet) at kumpletong kategorya.",
    accountChoiceRecommendedBadge: "Inirerekomenda",
    accountChoiceManualTitle: "Magsimula mula sa simula",
    accountChoiceManualDesc:
      "Magsimula nang walang laman. Ikaw ang magdadagdag ng mga account at kategorya mamaya.",
    fullSetupTitle: "I-setup ang workspace",
    fullSetupDescription: "Piliin kung gaano karaming istruktura ang gusto mo sa unang araw.",
    manualSetupTitle: "Magsimula from scratch",
    manualSetupDescription:
      "Gumawa ng account types, accounts, at categories nang sarili mo.",
    recommendedSetupTitle: "Gamitin ang recommended setup",
    recommendedSetupDescription:
      "Handang accounts at categories para mabilis makapag-record.",
    recommendedBadge: "Inirerekomenda",
  },
  transactionForm: {
    customizeFieldsTitle: "I-customize ang mga field",
    customizeFieldsSubtitle:
      "Laging nandiyan ang amount, account, category, at date sa form.",
    alwaysOn: "Laging naka-on",
    fields: {
      amount: "Halaga",
      account: "Account",
      category: "Kategorya",
      date: "Petsa",
      transactionName: "Pangalan ng transaksyon",
      attachments: "Mga attachment",
      split: "Split transaction",
      installments: "Mga installment",
      labels: "Mga label",
      note: "Note",
      quickPresets: "Quick Presets",
      exactTime: "Eksaktong oras",
    },
  },
  dashboard: {
    greetingMorning: "Magandang umaga, %{name}",
    greetingAfternoon: "Magandang hapon, %{name}",
    greetingEvening: "Magandang gabi, %{name}",
    greetingNight: "Magandang gabi, %{name}",
    greetingMorningGeneric: "Magandang umaga",
    greetingAfternoonGeneric: "Magandang hapon",
    greetingEveningGeneric: "Magandang gabi",
    greetingNightGeneric: "Magandang gabi",
    quoteShuffle: "Bagong quote",
    dailyInspiration: "Pang-araw-araw na Inspirasyon",
    displayModeAccessibility: "Pumili ng istilo ng dashboard",
    displayModeTitle: "Dashboard display",
    displayModeSimple: "Simple",
    displayModeSimpleDescription:
      "Friendly na label tulad ng “Perang meron ka” at “Ginastos ngayong buwan.” Pareho pa rin ang net worth at monthly spending sa numbers.",
    displayModeDetailed: "Detalyado",
    displayModeDetailedDescription:
      "Karaniwang finance label na may net worth, total assets, at liabilities.",
    moneyYouHave: "Perang meron ka",
    spentThisMonth: "Ginastos ngayong buwan",
    firstExpenseHint: "I-tap ang + para i-record ang unang gastos.",
    dismissHint: "Isara",
    promptQuickPresetsTitle: "Gusto mong ulit-ulitin ang mga gastos?",
    promptQuickPresetsMessage:
      "I-on ang pangalan ng transaksyon at Quick Presets para mas mabilis mag-fill ng form.",
    promptQuickPresetsAction: "I-on",
    promptTransfersTitle: "Naglilipat ng pera sa pagitan ng accounts?",
    promptTransfersMessage:
      "Maaari kang mag-record ng transfer sa pagitan ng accounts mula sa transaction form.",
    promptCreditCardsTitle: "Gumagamit ng credit card?",
    promptCreditCardsMessage:
      "I-on ang credit cards at installments para sa mga card purchase.",
    promptCreditCardsAction: "I-on",
    promptDismiss: "Hindi muna",
    walkthroughIntroBadge: "Unang beses mo ba rito?",
    walkthroughIntroTitle: "Maligayang pagdating sa iyong Dashboard!",
    walkthroughIntroSubtitle: "Ang iyong command center sa pananalapi",
    walkthroughIntroMessage:
      "Dito mo makikita ang iyong kabuuang net worth, mababantayan ang buwanang gastusin, at mapapamahalaan ang mga transaksyon. Nais mo ba ng mabilisang walkthrough para maging pamilyar?",
    walkthroughIntroStart: "Mag-tour",
    walkthroughIntroSkip: "I-explore mag-isa",
    walkthroughChip: "Guide",
    walkthroughSkip: "Laktawan",
    walkthroughNext: "Susunod",
    walkthroughBack: "Bumalik",
    walkthroughStartTx: "I-tap ang + sa ibaba para magsimula",
    walkthroughStepCount: "Hakbang %{current} ng %{total}",
    stepNetWorthTitle: "Kabuuang Net Worth",
    stepNetWorthDesc:
      "Ipinapakita rito ang iyong kabuuang financial snapshot—kinakalkula ang net worth (assets bawas liabilities) at ang history ng balance.",
    stepCollapseTitle: "I-collapse ang Chart",
    stepCollapseDesc:
      "I-tap ang chevron na ito anumang oras para itago o ilabas ang chart at makatipid sa espasyo.",
    stepSettingsTitle: "Display Settings",
    stepSettingsDesc:
      "I-customize ang itsura ng dashboard. I-tap ang Susunod para makita kung paano lumipat sa Simple at Detalyadong mode.",
    stepSettingsModalTitle: "Mga Opsyon sa Display",
    stepSettingsModalDesc:
      "Sa Simple mode, madaling basahin ang pera at gastusin. Sa Detalyado, buo ang assets at liabilities. Malilipat mo ito anumang oras!",
    stepEyeTitle: "Itago ang Halaga",
    stepEyeDesc:
      "I-tap ang mata para itago o ipakita ang iyong mga halaga (••••••) kapag may ibang kasama o nasa publiko.",
    stepRecentTxTitle: "Kamakailang Transaksyon",
    stepRecentTxDesc:
      "Lalabas dito ang iyong mga bagong gastos, kita, at transfers. I-tap ang alinman para tingnan ang detalye o i-edit.",
    stepFabTitle: "I-record ang Unang Transaksyon",
    stepFabDesc:
      "I-tap ang (+) button dito para ilagay ang iyong pinakaunang transaksyon at simulan ang pagsubaybay!",
    congratulationsTitle: "🎉 Maligayang Bati!",
    congratulationsSubtitle: "Naitala ang Unang Transaksyon!",
    congratulationsMessage:
      "Nagawa mo ang unang hakbang sa pamamahala ng iyong pera. Bawat transaksyon ay maglalapit sa iyo sa iyong mga financial goals.",
    congratulationsButton: "Tingnan ang Dashboard",
  },
  accountsWalkthrough: {
    introTitle: "Maligayang pagdating sa Mga Account!",
    introSubtitle: "Ang iyong buong portfolio sa pananalapi",
    introMessage:
      "Ayusin ang iyong mga cash wallet, bank account, investments, at credit cards sa iisang lugar. Nais mo ba ng mabilisang walkthrough?",
    stepArchivedTitle: "Mga Naka-archive na Account",
    stepArchivedDesc:
      "Tingnan ang lahat ng naka-archive na account at pockets. Ligtas itong nakatago at maaaring ibalik anumang oras.",
    stepFundGroupsTitle: "Mga Grupo ng Pondo",
    stepFundGroupsDesc:
      "Pagsama-samahin ang mga account sa custom na grupo (gaya ng Emergency Fund, Negosyo, o Ipon) para masubaybayan ang kabuuang balanse.",
    stepSearchTitle: "Maghanap ng Account",
    stepSearchDesc:
      "Mabilis na maghanap at mag-filter ng account gamit ang pangalan.",
    stepAssetsTitle: "Pangkalahatang-ideya ng Assets",
    stepAssetsDesc:
      "Tingnan ang iyong mga positibong account—tulad ng bangko, cash, e-wallets, at pockets—kasama ang kabuuang halaga.",
    stepLiabilitiesTitle: "Pangkalahatang-ideya ng Liabilities",
    stepLiabilitiesDesc:
      "Subaybayan ang mga utang, credit card, at bayarin para malinaw ang iyong mga obligasyon.",
    stepFabTitle: "Menu ng mga Account",
    stepFabDesc:
      "I-tap ang (+) action button para magbukas ng menu kung saan makakapagdagdag ng bagong account o makakapag-ayos ng mga uri nito.",
    stepSheetTitle: "Aksyon para sa Account",
    stepSheetDesc:
      "Pumili kung magdadagdag ng bagong account o mag-aayos ng mga grupo at kategorya. I-tap ang Tapos para matapos ang tour!",
    actionAddAccount: "Magdagdag ng Bagong Account",
    actionAddAccountDesc:
      "Gumawa ng bagong account sa bangko, cash, wallet, o puhunan na may panimulang balanse.",
    actionManageTypes: "Pag-setup ng Grupo ng Account",
    actionManageTypesDesc:
      "I-configure ang mga uri ng account at kategorya ayon sa iyong kagustuhan.",
  },
  accountFormWalkthrough: {
    introTitle: "Setup ng Bagong Account",
    introSubtitle: "Lumikha at i-configure ang iyong account",
    introMessage:
      "I-set up ang pangalan, uri, panimulang balanse, pera, at virtual pockets. Nais mo ba ng mabilisang walkthrough sa form na ito?",
    stepNameTitle: "Pangalan ng Account",
    stepNameDesc:
      "Magbigay ng malinaw na pangalan tulad ng Checking, Pangunahing Ipon, o Cash Wallet.",
    stepNoteTitle: "Tala at Karagdagang Detalye",
    stepNoteDesc:
      "Magdagdag ng opsyonal na konteksto, account number, o paalala para sa account na ito.",
    stepTypeTitle: "Uri at Grupo ng Account",
    stepTypeDesc:
      "Pumili kung ito ay Asset (bangko, pera, puhunan) o Liability (credit card, utang).",
    stepIconTitle: "Icon ng Account",
    stepIconDesc:
      "Pumili ng custom icon o gamitin ang default icon ng napiling grupo.",
    stepStartingBalanceTitle: "Panimulang Balanse",
    stepStartingBalanceDesc:
      "Itakda ang simulaing balanse sa araw ng pagbukas. I-tap upang buksan ang calculator.",
    stepCurrencyTitle: "Tagapili ng Currency",
    stepCurrencyDesc:
      "Pumili ng currency para sa account bago magsimulang magtala ng mga transaksyon.",
    stepMaintainingBalanceTitle: "Maintaining Balance",
    stepMaintainingBalanceDesc:
      "Subaybayan ang minimum na balanse upang makaiwas sa bayarin sa bangko.",
    stepEnablePocketsTitle: "Paganahin ang mga Pocket",
    stepEnablePocketsDesc:
      "Tamang-tama kung mayroon kang isang bank account na pinaghahatian! Halimbawa, kung ang iyong checking account ay may nakalaan para sa Gastusin, Emergency Fund, at Ipon, pinapahintulutan ka ng pockets na ihiwalay at subaybayan ang mga balanseng ito sa loob lamang ng isang account.",
    stepHideSelectionTitle: "Itago sa Pagpipilian",
    stepHideSelectionDesc:
      "Itago ang mga pansamantalang account sa araw-araw na listahan ng pagpipilian ng transaksyon.",
    stepHideReportsTitle: "Itago sa mga Ulat",
    stepHideReportsDesc:
      "Ihiwalay ang mga panlabas na pondo o deposito mula sa kabuuang net worth at mga ulat.",
    stepOpeningDateTitle: "Petsa ng Pagbukas",
    stepOpeningDateDesc:
      "Tukuyin kung kailan nagsimula ang account para sa tamang pagsubaybay sa kasaysayan.",
  },
  accountGroupSetupWalkthrough: {
    introTitle: "Setup ng Grupo ng Account",
    introSubtitle: "Ayusin ang mga uri ng account",
    introMessage:
      "Pamahalaan ang mga pasadyang grupo sa assets at liabilities, at baguhin ang pagkakasunod-sunod. Nais mo ba ng mabilisang walkthrough?",
    stepClassificationPickerTitle: "Piliin ang Assets o Liabilities",
    stepClassificationPickerDesc:
      "Lumipat sa pagitan ng Assets (mga pag-aari) at Liabilities (mga utang).",
    stepReorderTitle: "Ayusin ang Pagkakasunod-sunod",
    stepReorderDesc:
      "Baguhin ang ayos ng mga grupo ng account ayon sa madalas mong tinitingnan.",
    stepNewGroupTitle: "Bagong Grupo ng Account",
    stepNewGroupDesc:
      "Gumawa ng sariling grupo tulad ng E-Wallets o mga Raket/Negosyo.",
  },
  accountTypeFormWalkthrough: {
    introTitle: "Bagong Grupo ng Account",
    introSubtitle: "Lumikha ng pasadyang kategorya ng account",
    introMessage:
      "Magtakda ng pasadyang kategorya kasama ang klasipikasyon, icon, at kulay ng tema. Nais mo ba ng mabilisang walkthrough?",
    stepNameTitle: "Pangalan ng Grupo",
    stepNameDesc:
      "Pangalanan ang grupong ito, tulad ng High-Yield Savings o Negosyo.",
    stepClassificationTitle: "Klasipikasyon",
    stepClassificationDesc:
      "Itakda bilang Asset (positibong yaman) o Liability (utang o bayarin).",
    stepIconTitle: "Icon ng Grupo",
    stepIconDesc:
      "Pumili ng icon na kumakatawan sa grupong ito sa iyong mga account at ulat.",
    stepColorTitle: "Kulay ng Tema",
    stepColorDesc:
      "Pumili ng natatanging kulay para madaling makilala ang grupong ito.",
    stepCustomColorTitle: "Magdagdag ng Custom na Kulay",
    stepCustomColorDesc:
      "Gumawa at mag-save ng sarili mong hex color palette.",
    stepSaveTitle: "I-save ang Grupo ng Account",
    stepSaveDesc:
      "I-tap ang checkmark upang i-save ang bagong grupo ng account.",
  },
  transactionFormWalkthrough: {
    introTitle: "Magtala ng Transaksyon",
    introSubtitle: "Subaybayan ang kita, gastos, o paglipat",
    introMessage:
      "Magtala ng halaga, kategorya, account, resibo, tag, at tala nang madali. Nais mo ba ng mabilisang walkthrough sa form na ito?",
    stepPresetsTitle: "Quick Presets",
    stepPresetsDesc:
      "Isang tapik na template para sa mga madalas na transaksyon. Agad na pupunan ang pangalan, account, halaga, at kategorya.",
    stepCustomizeTitle: "I-customize ang mga Field",
    stepCustomizeDesc:
      "Pumili kung aling mga field ang ipapakita o itatago sa form upang mapabilis ang iyong pagtatala.",
    stepTypePickerTitle: "Uri ng Transaksyon",
    stepTypePickerDesc:
      "Pumili sa pagitan ng Gastos, Kita, o Paglipat (Transfer) depende sa daloy ng pera.",
    stepNameTitle: "Pangalan ng Transaksyon",
    stepNameDesc:
      "Ilagay ang tindahan, pinagbayaran, o pamagat (hal. Supermarket, Sahod, Kape).",
    stepAttachmentTitle: "Resibo at Kalakip",
    stepAttachmentDesc:
      "Maglakip ng larawan ng resibo, resibo sa pagbili, o garantiya nang direkta sa transaksyong ito.",
    stepDateTitle: "Petsa ng Transaksyon",
    stepDateDesc:
      "Itakda ang petsa sa kalendaryo kung kailan naganap ang transaksyon.",
    stepTimeTitle: "Eksaktong Oras",
    stepTimeDesc:
      "Itala ang eksaktong oras at minuto para sa tumpak na pagkakasunod-sunod ng mga tala.",
    stepAmountTitle: "Halaga",
    stepAmountDesc:
      "I-tap upang buksan ang calculator keypad at kuwentahin o ilagay ang halaga ng transaksyon.",
    stepCurrencyTitle: "Tagapili ng Currency",
    stepCurrencyDesc:
      "Magpalit ng currency kapag gumagastos ng banyagang salapi sa paglalakbay o pamimili.",
    stepAccountTitle: "Account at Pocket",
    stepAccountDesc:
      "Piliin ang pinanggalingan o patutunguhang account at opsyonal na virtual pocket.",
    stepCategoryTitle: "Kategorya",
    stepCategoryDesc:
      "Ikategorya ang iyong transaksyon upang masubaybayan kung saan napupunta ang iyong pera.",
    stepSplitTitle: "Hatiin ayon sa Kategorya",
    stepSplitDesc:
      "Paghahati-hatiin ang isang resibo o bayarin sa iba't ibang kategorya na may sariling halaga.",
    stepLabelsTitle: "Mga Label at Tag",
    stepLabelsDesc:
      "Magdagdag ng mga tag (#bakasyon, #tax-deductible, #proyekto) para sa pagsubaybay.",
    stepNoteTitle: "Tala at Memo",
    stepNoteDesc:
      "Magdagdag ng opsyonal na tala, paalala, o konteksto para sa hinaharap na sanggunian.",
    stepCancelTitle: "Kanselahin",
    stepCancelDesc:
      "Ibasura ang kasalukuyang mga pagbabago at isara ang form nang hindi nagse-save.",
    stepSaveTitle: "I-save ang Tala",
    stepSaveDesc:
      "I-save agad ang iyong transaksyon sa iyong lokal na talaan.",
    stepCloseTitle: "Isara ang Form",
    stepCloseDesc:
      "Isara ang modal na ito kapag tapos ka na o nais mong lumabas.",
  },
  scheduledTransactionsWalkthrough: {
    introTitle: "Maligayang pagdating sa Naka-iskedyul na Transaksyon!",
    introSubtitle: "I-automate ang mga paulit-ulit na bayarin at kita",
    introMessage:
      "Pamahalaan ang mga subscription, paulit-ulit na gastusin, at kita gamit ang automatic posting. Nais mo ba ng mabilisang walkthrough?",
    stepSearchTitle: "Maghanap ng Iskedyul",
    stepSearchDesc:
      "Maghanap ng mga naka-iskedyul na transaksyon gamit ang pangalan, kategorya, o account.",
    stepFilterTitle: "I-filter ayon sa Katayuan",
    stepFilterDesc:
      "Pumili sa pagitan ng Aktibo, Nakumpleto, at Naka-archive na mga iskedyul.",
    stepFabTitle: "Bagong Iskedyul",
    stepFabDesc:
      "I-tap ang (+) button upang gumawa ng bagong paulit-ulit na gastos, kita, o transfer.",
    stepFirstItemTitle: "Naka-iskedyul na Transaksyon",
    stepFirstItemDesc:
      "Tingnan ang dalas ng pag-ulit, mga sangkot na account, at susunod na petsa ng transaksyon.",
    stepDueCardTitle: "Iskedyul na Dapat Bayaran",
    stepDueCardDesc:
      "Ang mga transaksyong sumapit na sa takdang araw ay lalabas dito para sa iyong kumpirmasyon.",
    stepDueSkipTitle: "Laktawan ang Siklo",
    stepDueSkipDesc:
      "Laktawan ang nag-iisang pagkakataong ito nang hindi nagtatala at pumunta sa susunod na petsa.",
    stepDuePostTitle: "Aksyon na I-post",
    stepDuePostDesc:
      "Kumpirmahin at itala agad ang iskedyul na ito sa iyong mga transaksyon.",
  },
  scheduleCongratulations: {
    title: "Unang Iskedyul ay Nalikha! 🎉",
    subtitle: "Gawing kusa ang iyong paulit-ulit na pananalapi",
    message:
      "Naka-setup na ang iyong paulit-ulit na transaksyon. Maaari kang paalalahanan ng Kaizen kapag dapat nang bayaran o awtomatikong itala ito.",
    button: "Galugarin ang Tour ng Iskedyul",
  },
  scheduleFormWalkthrough: {
    stepTypeTitle: "Uri ng Transaksyon",
    stepTypeDesc:
      "Pumili kung ito ay paulit-ulit na Gastos, Kita, o Paglipat (Transfer).",
    stepNameTitle: "Pangalan ng Transaksyon",
    stepNameDesc:
      "Magbigay ng makabuluhang pangalan, tulad ng Buwanang Renta, Sahod, o Internet Subscription.",
    stepAmountTitle: "Halaga",
    stepAmountDesc:
      "Ilagay ang halaga para sa bawat pag-ulit gamit ang calculator.",
    stepAccountTitle: "Lokasyon ng Account",
    stepAccountDesc:
      "Piliin ang account at pocket kung saan ibabawas o ilalagay ang pera.",
    stepCategoryTitle: "Kategorya",
    stepCategoryDesc:
      "Magtalaga ng kategorya upang masubaybayan ang iyong paulit-ulit na badyet.",
    stepNoteTitle: "Tala at Memo",
    stepNoteDesc:
      "Opsyonal na tala o paalala na nakakabit sa bawat malilikhang transaksyon.",
    stepRecurrenceTitle: "Pag-ulit (Recurrence)",
    stepRecurrenceDesc:
      "Itakda kung gaano kadalas uulitin ang transaksyong ito.",
    stepStartingOnTitle: "Magsisimula sa",
    stepStartingOnDesc:
      "Piliin ang petsa at oras kung kailan dapat magsimula ang unang pagkakataon.",
    stepFrequencyTitle: "Dalas ng Pag-ulit",
    stepFrequencyDesc:
      "Pumili ng agwat: Isang Beses, Araw-araw, Lingguhan, Buwanan, o Taunan.",
    stepRepeatTitle: "Agwat ng Pag-ulit",
    stepRepeatDesc:
      "Tukuyin ang agwat (hal. tuwing 2 linggo o tuwing 3 buwan).",
    stepEndsTitle: "Kailan Matatapos",
    stepEndsDesc:
      "Tukuyin kung kailan titigil: Huwag Matapos, pagkatapos ng itinakdang beses, o sa tiyak na petsa.",
    stepWeekendTitle: "Pagsasaayos sa Weekend",
    stepWeekendDesc:
      "Awtomatikong iakma kung ang petsa ay tumapat sa Sabado o Linggo (ilipat sa susunod na araw ng trabaho, nakaraan, o laktawan).",
    stepAutoEnterTitle: "Awtomatikong Ipasok ang Transaksyon",
    stepAutoEnterDesc:
      "Kapag naka-on, awtomatikong maipopost ang transaksyon sa takdang araw nang hindi humihingi ng manwal na kumpirmasyon.",
    stepSaveTitle: "I-save ang Iskedyul",
    stepSaveDesc:
      "I-tap upang i-save at simulan ang iyong paulit-ulit na iskedyul.",
  },
  budgetFormWalkthrough: {
    introTitle: "Bagong Badyet sa Kategorya",
    introSubtitle: "Magtakda ng limitasyon sa paggastos",
    introMessage:
      "Magtakda ng limitasyon sa kategorya, i-configure ang rollover, at mga alerto sa over-budget. Nais mo ba ng mabilisang walkthrough sa form na ito?",
    stepCategoryTitle: "Pagpili ng Kategorya",
    stepCategoryDesc:
      "Piliin kung saang kategorya ilalapat ang badyet na ito (hal. Pamamalengke, Libangan).",
    stepEnableBudgetTitle: "Paganahin ang Badyet",
    stepEnableBudgetDesc:
      "I-on o i-off ang limitasyon sa badyet nang hindi binubura ang iyong tala.",
    stepAmountTitle: "Halaga ng Badyet",
    stepAmountDesc:
      "Ilagay ang iyong target na limitasyon sa gastusin para sa takdang panahon gamit ang calculator.",
    stepFrequencyTitle: "Dalas ng Badyet",
    stepFrequencyDesc:
      "Piliin kung gaano kadalas magre-reset ang badyet: Araw-araw, Lingguhan, Buwanan, Quarterly, o Taunan.",
    stepRolloverTitle: "Rollover ng Badyet",
    stepRolloverDesc:
      "Awtomatikong ilipat ang natirang pondo o kakulangan sa susunod na panahon.",
    stepOverBudgetAlertTitle: "Alerto Kapag Lumagpas sa Badyet",
    stepOverBudgetAlertDesc:
      "Makatanggap ng babala kapag ang paggastos ay umabot o lumagpas sa limitasyon ng badyet.",
    stepSaveTitle: "I-save ang Badyet",
    stepSaveDesc:
      "I-tap upang i-save at simulan ang limitasyon sa paggastos para sa kategoryang ito.",
  },
  goalFormWalkthrough: {
    introTitle: "Bagong Layunin sa Pag-iipon",
    introSubtitle: "Planuhin at subaybayan ang iyong mga target",
    introMessage:
      "Magtakda ng target na halaga, i-link ang mga account o pocket, at itakda ang target na petsa. Nais mo ba ng mabilisang walkthrough sa form na ito?",
    stepTitleTitle: "Pamagat ng Tunguhin",
    stepTitleDesc:
      "Pangalanan ang iyong layunin sa pag-iipon, tulad ng Emergency Fund, Bakasyon, o Bagong Kotse.",
    stepTargetAmountTitle: "Target na Halaga",
    stepTargetAmountDesc:
      "Itakda ang kabuuang halaga na nais mong maipon para sa mahalagang layuning ito.",
    stepLinkedAccountsTitle: "Mga Nakakabit na Account at Pocket",
    stepLinkedAccountsDesc:
      "Piliin kung aling mga account at virtual pocket ang mag-aambag ng pondo para sa layuning ito.",
    stepTargetDateTitle: "Target na Petsa",
    stepTargetDateDesc:
      "Magtakda ng opsyonal na takdang araw upang masukat ang kailangang ipunin bawat buwan.",
    stepIconTitle: "Icon ng Tunguhin",
    stepIconDesc:
      "Pumili ng nakakapukaw na icon na kakatawan sa iyong pangarap.",
    stepAccentColorTitle: "Kulay ng Accent",
    stepAccentColorDesc:
      "Pumili ng kulay ng tema para sa progress bar at card ng layunin.",
    stepNotesTitle: "Mga Tala at Motibasyon",
    stepNotesDesc:
      "Magdagdag ng paalala kung bakit mahalaga sa iyo ang layuning ito.",
    stepSaveTitle: "I-save ang Tunguhin",
    stepSaveDesc:
      "I-tap ang checkmark upang i-save ang iyong layunin at simulan ang pagsubaybay sa pag-unlad.",
  },
  transactionsWalkthrough: {
    introTitle: "Maligayang pagdating sa Mga Transaksyon!",
    introSubtitle: "Ang iyong detalyadong talaan sa pananalapi",
    introMessage:
      "Maghanap, mag-filter, at subaybayan ang lahat ng iyong kita, gastusin, at transfer nang madali. Nais mo ba ng mabilisang walkthrough?",
    stepSearchTitle: "Maghanap ng Transaksyon",
    stepSearchDesc:
      "Mabilis na maghanap ng transaksyon gamit ang tala, tatanggap, kategorya, account, o halaga.",
    stepFilterTitle: "I-filter ang mga Transaksyon",
    stepFilterDesc:
      "Buksan ang mga advanced filter para limitahan ayon sa petsa, account, kategorya, uri, o tags.",
    stepSortDateTitle: "I-sort ayon sa Petsa",
    stepSortDateDesc:
      "Iayos ang iyong kasaysayan ng transaksyon ayon sa petsa ng transaksyon.",
    stepSortAmountTitle: "I-sort ayon sa Halaga",
    stepSortAmountDesc:
      "Ayusin ang mga tala ayon sa halaga ng pera para agad makita ang pinakamalaki o pinakamaliit na gastusin.",
    stepSortOrderTitle: "Direksyon ng Pag-sort",
    stepSortOrderDesc:
      "Magpalit sa pagitan ng pababa (pinakabago/pinakamalaki muna) at pataas (pinakaluma/pinakamaliit muna).",
    stepViewModeTitle: "Detalyado at Simpleng View",
    stepViewModeDesc:
      "Magpalit sa pagitan ng Compact mode para sa siksik na listahan at Detalyadong mode para sa buong detalye.",
    stepScheduledTitle: "Naka-iskedyul na Transaksyon",
    stepScheduledDesc:
      "Tingnan ang paparating at paulit-ulit na mga transaksyon para manatiling updated sa mga bayarin.",
    stepTrashTitle: "Basurahan ng Transaksyon",
    stepTrashDesc:
      "Ligtas na suriin ang mga tinanggal na transaksyon. Maaari mong ibalik ang mga aksidenteng nabura o tuluyang linisin ang basurahan.",
    stepExportTitle: "I-export sa CSV",
    stepExportDesc:
      "I-export ang iyong kasaysayan bilang malinis na CSV spreadsheet para maibahagi o mai-save sa iyong device.",
    stepFabTitle: "Magtala ng Transaksyon",
    stepFabDesc:
      "I-tap ang (+) button anumang oras para magtala ng bagong gastos, kita, o transfer. Handa ka na!",
  },
  calendarWalkthrough: {
    introTitle: "Maligayang pagdating sa Kalendaryo!",
    introSubtitle: "Timeline ng iyong pananalapi",
    introMessage:
      "Tingnan ang pang-araw-araw na cash flow, mga paparating na bayarin, at mga inaasahang balanse sa kalendaryo. Nais mo ba ng mabilisang walkthrough?",
    stepArrowsTitle: "Paglipat ng Buwan sa Kalendaryo",
    stepArrowsDesc:
      "Gamitin ang mga arrow upang magpalipat-lipat sa mga nakaraan at darating na buwan, o bumalik agad sa araw na ito.",
    stepTransactionsTitle: "Tab ng mga Transaksyon",
    stepTransactionsDesc:
      "Suriin ang lahat ng naitalang kita, gastos, at paglilipat para sa napiling araw o sa buong buwan.",
    stepSchedulesTitle: "Tab ng mga Naka-iskedyul",
    stepSchedulesDesc:
      "Tingnan at pamahalaan ang mga naka-iskedyul na bayarin, paulit-ulit na paglilipat, at darating na gastusin sa kalendaryo.",
    stepNetTitle: "Tab ng Netong Kita",
    stepNetDesc:
      "Suriin ang pagkakaiba ng kita at gastos, direksyon ng cash flow, at kabuuang tubo sa bawat araw.",
    stepBalanceSheetTitle: "Tab ng Balance Sheet",
    stepBalanceSheetDesc:
      "Subaybayan ang iyong mga ari-arian, utang, at kabuuang equity sa timeline ng kalendaryo.",
  },
  categoriesWalkthrough: {
    introTitle: "Maligayang pagdating sa Mga Kategorya!",
    introSubtitle: "Ayusin ang iyong kita at gastusin",
    introMessage:
      "I-customize ang mga category groups, icon, at subcategories upang maiuri ang bawat transaksyon. Nais mo ba ng mabilisang walkthrough?",
    stepTypeToggleTitle: "Mga Gastos at Kita",
    stepTypeToggleDesc:
      "Magpalipat-lipat sa mga kategorya ng gastos at kita upang maisaayos at ma-customize ang iyong cash flow.",
    stepReorderGroupsTitle: "Ayusin ang Pagkakasunod-sunod",
    stepReorderGroupsDesc:
      "Muling ayusin ang mga grupo ng kategorya sa iyong nais na pagkakasunod-sunod sa buong app.",
    stepPresetsIconTitle: "Mga Preset ng Kategorya",
    stepPresetsIconDesc:
      "Mabilis na mag-load ng mga handang bundle ng kategorya o pamahalaan ang mga built-in na preset.",
    stepNewCategoryTitle: "Bagong Kategorya",
    stepNewCategoryDesc:
      "Gumawa ng sariling grupo ng kategorya na may napiling kulay, icon, at uri.",
    stepReorderSubTitle: "Ayusin ang mga Subcategory",
    stepReorderSubDesc:
      "Isaayos ang pagkakasunod-sunod ng mga subcategory sa grupong ito para sa mas mabilis na pagtatala.",
    stepAddSubTitle: "Magdagdag ng Subcategory",
    stepAddSubDesc:
      "Magdagdag ng detalyadong subcategory sa ilalim ng grupong ito para sa mas masusing pagsubaybay.",
  },
  budgetCongratulations: {
    title: "Unang Badyet Nilikha Na!",
    subtitle: "Matalinong Pamamahala ng Gastos",
    message:
      "Matagumpay mong naitakda ang iyong unang badyet sa kategorya! Subaybayan ang mga limitasyon, iwasan ang labis na paggastos, at subaybayan ang mga balanse nang may kumpiyansa.",
    button: "I-explore ang mga Badyet",
  },
  budgetsWalkthrough: {
    introTitle: "Maligayang pagdating sa Mga Badyet!",
    introSubtitle: "Matalinong pamamahala sa gastusin",
    introMessage:
      "Magtakda ng mga limitasyon sa bawat kategorya at panatilihing nasa ayos ang iyong pananalapi. Nais mo ba ng mabilisang walkthrough?",
    stepEmptyCreateTitle: "Itakda ang Iyong Unang Badyet",
    stepEmptyCreateDesc:
      "I-tap dito upang magtakda ng limitasyon sa paggastos para sa anumang kategorya araw-araw, lingguhan, o buwanan.",
    stepTotalActiveTitle: "Kabuuang Aktibong Badyet",
    stepTotalActiveDesc:
      "Subaybayan ang iyong pinagsama-samang limitasyon, pag-unlad ng paggastos, natitirang pondo, at mga babala sa isang sulyap.",
    stepFrequencyTabsTitle: "Salain ayon sa Dalas",
    stepFrequencyTabsDesc:
      "Mabilis na salain ang iyong mga badyet ayon sa panahon — araw-araw, lingguhan, buwanan, o taunan.",
    stepFirstItemToggleTitle: "I-enable o I-disable ang Badyet",
    stepFirstItemToggleDesc:
      "I-on o i-off ang anumang badyet kailanman nang hindi nabubura ang iyong mga nakaraang transaksyon o setting.",
    stepFabTitle: "Gumawa ng Badyet sa Kategorya",
    stepFabDesc:
      "I-tap ang (+) button anumang oras upang magtakda ng karagdagang limitasyon at maabot ang iyong mga layunin.",
  },
  goalCongratulations: {
    title: "Unang Layunin Nalikha!",
    subtitle: "Target Patungo sa Tagumpay",
    message:
      "Binabati kita sa paglikha ng iyong unang layunin sa pag-iipon! Subaybayan ang iyong progreso, ikonekta ang mga account, at magpatuloy para sa iyong magandang kinabukasan.",
    button: "Galugarin ang Tour ng mga Layunin",
  },
  goalsWalkthrough: {
    introTitle: "Maligayang pagdating sa Mga Layunin!",
    introSubtitle: "Tuparin ang iyong mga pangarap sa pananalapi",
    introMessage:
      "Subaybayan ang iyong ipon, mag-link ng mga account, at bantayan ang iyong pag-unlad. Nais mo ba ng mabilisang walkthrough?",
    stepTotalTargetTitle: "Kabuuang Target at Progreso",
    stepTotalTargetDesc:
      "Subaybayan ang iyong kabuuang target sa pag-iipon, naipong pondo, porsyento ng progreso, at natitirang kulang sa lahat ng aktibong layunin.",
    stepStatusFiltersTitle: "Mga Filter ng Katayuan",
    stepStatusFiltersDesc:
      "Madaling mag-filter sa pagitan ng Lahat ng Layunin, Kasalukuyang Isinasagawa, at Nakumpleto gamit ang mga live counter badge.",
    stepFirstItemMarkCompleteTitle: "Markahan bilang Nakumpleto",
    stepFirstItemMarkCompleteDesc:
      "Ipagdiwang ang pag-abot sa iyong target sa pamamagitan ng pagmamarka dito bilang nakumpleto, o muling buksan ito kailanman.",
    stepFabTitle: "Magdagdag ng Bagong Layunin",
    stepFabDesc:
      "I-tap ang (+) button anumang oras upang magtakda ng bagong target, i-link ang mga bank account o pocket, maglagay ng deadline, at kalkulahin ang kinakailangang buwanang ipon.",
  },
  notesWalkthrough: {
    introTitle: "Maligayang pagdating sa Mga Tala!",
    introSubtitle: "Checklists at mga paalala sa pananalapi",
    introMessage:
      "Itala ang mga checklist, resibo, paalala, at mga ideya sa pananalapi sa isang organisadong lugar. Nais mo ba ng mabilisang walkthrough?",
    stepEmptyCreateTitle: "Gumawa ng Unang Tala",
    stepEmptyCreateDesc:
      "Pindutin dito upang simulan ang pagtatala ng iyong mga saloobin, financial checklist, memo, at mga larawan ng resibo.",
    stepSearchTitle: "Maghanap ng mga Tala",
    stepSearchDesc:
      "Mabilis na maghanap ng anumang tala sa pamamagitan ng paghahanap sa mga pamagat, checklist, o nilalaman.",
    stepViewModeTitle: "Mode ng Display",
    stepViewModeDesc:
      "Lumipat sa pagitan ng square tiles para sa visual na gallery o isang compact na listahan.",
    stepSortFilterTitle: "Filter sa Pagbabago at Pag-ayos",
    stepSortFilterDesc:
      "Isaayos ang iyong mga tala ayon sa huling petsa ng pagbabago (pinakabago o pinakaluma) o ayon sa alpabeto ayon sa pamagat.",
    stepFirstItemTitle: "Preview ng Tala at mga Galaw",
    stepFirstItemDesc:
      "Pindutin ang anumang tala upang tingnan o i-edit ang mga detalye. Kapag ang display mode ay listahan, maaari mo itong i-swipe pakaliwa upang lumabas ang delete button.",
    stepFabTitle: "Magdagdag ng Bagong Tala",
    stepFabDesc:
      "Pindutin ang (+) button anumang oras upang gumawa ng bagong tala na may mga attachment, kulay, at pin.",
  },
  settingsWalkthrough: {
    introTitle: "Maligayang pagdating sa Mga Setting!",
    introSubtitle: "I-personalize ang iyong karanasan sa Kaizen",
    introMessage:
      "I-configure ang mga currency, tema, paalala, seguridad, at default accounts. Nais mo ba ng mabilisang walkthrough?",
    stepLanguageTitle: "Kagustuhan sa Wika",
    stepLanguageDesc:
      "Lumipat sa pagitan ng Ingles, Espanyol, at Filipino, o awtomatikong itugma sa default ng iyong device.",
    stepCurrencyTitle: "Setup ng Salapi",
    stepCurrencyDesc:
      "I-configure ang iyong pangunahing pera, pangalawang pera, at sariling exchange rates.",
    stepNicknameTitle: "Palayaw ng Gumagamit",
    stepNicknameDesc:
      "I-personalize ang pagbati sa dashboard gamit ang iyong sariling pangalan o palayaw.",
    stepThemeTitle: "Tema at Palette",
    stepThemeDesc:
      "Pumili mula sa mga light, dark, at OLED themes, o itugma sa hitsura ng iyong system.",
    stepRemindersTitle: "Mga Paalala at Notipikasyon",
    stepRemindersDesc:
      "Magtakda ng pang-araw-araw na paalala sa pagtatala ng gastos at bayarin sa takdang petsa.",
    stepGuideHelperTitle: "Guide Helper",
    stepGuideHelperDesc:
      "Ipakita o itago ang lumulutang na chip ng gabay sa mga screen at form upang masimulan muli ang mga walkthrough anumang oras.",
    stepDefaultExpenseTitle: "Default na Account para sa Gastos",
    stepDefaultExpenseDesc:
      "Itakda ang account at bulsa na awtomatikong gagamitin kapag nagtatala ng bagong gastos.",
    stepDefaultIncomeTitle: "Default na Account para sa Kita",
    stepDefaultIncomeDesc:
      "Piliin ang default na patutunguhang account para sa suweldo o iba pang kita.",
    stepHexColorsTitle: "Hex Color Palette",
    stepHexColorsDesc:
      "Pamahalaan at gumawa ng sariling hex colors para sa iyong mga kategorya, account, at tag.",
    stepResetDataTitle: "I-reset ang Lahat ng Data",
    stepResetDataDesc:
      "Permanenteng burahin ang lahat ng lokal na transaksyon, account, at setting para magsimula muli.",
    stepLocalBackupTitle: "Lokal na Backup ng Device",
    stepLocalBackupDesc:
      "Mag-export at mag-import ng buong SQLite database backup direkta sa storage ng iyong device.",
    stepGoogleDriveTitle: "Google Drive Cloud Backup",
    stepGoogleDriveDesc:
      "Ligtas na i-sync ang iyong data sa Google Drive para sa awtomatikong cloud backup.",
    stepSecurityTitle: "Password at Fingerprint",
    stepSecurityDesc:
      "Protektahan ang iyong data sa pananalapi gamit ang biometric fingerprint o secure na PIN.",
    stepProTitle: "Finance Pro - Habambuhay",
    stepProDesc:
      "I-unlock ang walang limitasyong mga account, cloud backup, attachment, at advanced na budget.",
    stepRestorePurchasesTitle: "Ibalik ang mga Binili",
    stepRestorePurchasesDesc:
      "Ibalik ang iyong Pro license kapag nag-reinstall o naglipat ng workspace sa bagong device.",
    stepVersionHistoryTitle: "Kasaysayan ng Bersyon",
    stepVersionHistoryDesc:
      "Tingnan ang mga pagbabago sa bawat bersyon ng app, kasama ang mga bagong tampok, pag-aayos, at pagpapabuti.",
  },
  resetData: {
    dismissAccessibility: "Isara ang kumpirmasyon sa pag-reset ng data",
    title: "I-reset ang lahat ng data?",
    message:
      "Permanenteng buburahin nito ang iyong mga account, transaksyon, badyet, layunin, tala, setting, attachment, at mga lokal na backup na pinamamahalaan ng app mula sa device na ito.",
    externalNote:
      "Hindi mabubura ang mga file sa Google Drive. Idi-disconnect ng device na ito ang Google Drive at i-clear ang Quick Sync settings.",
    confirmationInstruction: "I-type ang KAIZEN para kumpirmahin",
    confirmationAccessibility:
      "I-type ang KAIZEN para kumpirmahin ang pag-reset ng lahat ng data",
    deleteAll: "Burahin ang lahat ng data",
  },
  security: {
    menuTitle: "Password at Fingerprint",
    appLockedTitle: "Kaizen Finance",
    enterPasswordToUnlock: "Ilagay ang iyong password para i-unlock ang app",
    enterPasswordOrBiometrics:
      "Gamitin ang %{biometric} o ilagay ang iyong password para i-unlock",
    unlockWithBiometric: "I-unlock gamit ang %{biometric}",
    tapToScan: "I-tap para i-scan ang %{biometric}",
    passwordPlaceholder: "Ilagay ang password",
    hidePassword: "Itago ang password",
    showPassword: "Ipakita ang password",
    unlockButton: "I-unlock",
    enterPassword: "Mangyaring ilagay ang iyong password.",
    incorrectPassword: "Maling password. Pakisubukang muli.",
    passwordSection: "PASSWORD",
    appPassword: "Password ng App",
    passwordIsConfigured: "Naka-configure · Pinoprotektahan ang app",
    passwordNotConfigured: "Hindi naka-set · Naka-unlock ang app",
    badgeActive: "NAKA-SET",
    badgeOff: "WALA",
    setPasswordButton: "Mag-set ng Password",
    changePasswordButton: "Palitan",
    removePasswordButton: "Alisin",
    biometricSection: "BIOMETRIC UNLOCK",
    biometricTitle: "%{biometric} Unlock",
    defaultBiometricLabel: "Biometrics",
    setupPasswordToActivate: "Mag-set ng Password para i-activate",
    biometricRequiresPassword:
      "Kailangan munang mag-set ng password para sa biometric unlock.",
    biometricNoHardware:
      "Walang biometric sensor sa device na ito",
    biometricNotEnrolled:
      "Walang nakarehistrong fingerprint. Magrehistro sa settings ng device",
    biometricDescription: "Mas mabilis na mag-unlock gamit ang iyong %{biometric}",
    biometricCancelledFallback:
      "Kinansela ang biometric scan. Mangyaring ilagay ang iyong password para i-unlock.",
    biometricLockoutFallback:
      "Masyadong maraming biometric attempt. Mangyaring ilagay ang iyong password para i-unlock.",
    biometricFailedFallback:
      "Nabigo ang biometric verification. Pakisubukang muli o ilagay ang iyong password.",
    securityNote:
      "Naka-encrypt ang iyong mga kredensyal sa device na ito. Kapag naka-on, awtomatikong magla-lock ang app kapag na-minimize.",
    setPasswordTitle: "Mag-set ng Password ng App",
    changePasswordTitle: "Palitan ang Password ng App",
    removePasswordTitle: "Alisin ang Password ng App",
    savePasswordButton: "I-save ang Password",
    updatePasswordButton: "I-update ang Password",
    removePasswordWarning:
      "Ang pag-alis ng password ay magdi-disable din ng fingerprint unlock. Hindi na magla-lock ang app sa pagsisimula.",
    currentPasswordLabel: "Kasalukuyang Password",
    currentPasswordPlaceholder: "Ilagay ang kasalukuyang password",
    newPasswordLabel: "Bagong Password",
    newPasswordPlaceholder: "Ilagay ang bagong password (min. 4 na character)",
    confirmPasswordLabel: "Kumpirmahin ang Password",
    confirmPasswordPlaceholder: "Ilagay muli ang bagong password",
    enterCurrentPassword: "Mangyaring ilagay ang iyong kasalukuyang password.",
    passwordMinLength: "Dapat hindi bababa sa 4 na character ang password.",
    passwordsDoNotMatch: "Hindi tugma ang mga password.",
    forgotPassword: "Nakalimutan ang password?",
    forgotPasswordTitle: "Nakalimutan ang Password?",
    forgotPasswordSubtitle:
      "Pumili kung paano mo gustong ma-recover ang access sa Kaizen Finance.",
    biometricResetTitle: "I-reset gamit ang %{biometric}",
    biometricResetDesc:
      "I-scan ang iyong %{biometric} para magtakda ng bagong password nang hindi inilalagay ang kasalukuyan.",
    verifyBiometricToReset: "I-verify ang %{biometric} para Mag-reset",
    biometricVerifiedBadge: "Na-verify ang %{biometric}",
    verifyWithBiometricToChange:
      "Nakalimutan ang kasalukuyan? I-verify gamit ang %{biometric}",
    verifyWithBiometricToRemove:
      "Nakalimutan ang password? Alisin gamit ang %{biometric}",
    emergencyResetSectionTitle: "EMERGENCY RECOVERY",
    emergencyResetTitle: "Emergency Reset ng App Data",
    emergencyResetDesc:
      "Ang Kaizen Finance ay 100% offline-first. Ligtas na nakaimbak ang credentials sa device na ito nang walang cloud recovery o email reset.",
    emergencyResetWarning:
      "Permanenteng buburahin nito ang lahat ng account, transaksyon, budget, tala, at local settings, at aalisin ang lock.",
    emergencyResetButton: "I-reset ang App Data...",
    emergencyResetConfirmTitle: "I-reset ang Lahat ng Data?",
    emergencyResetConfirmDesc:
      "Permanenteng buburahin nito ang lahat ng iyong financial data at aalisin ang lock ng app. Hindi na ito maibabalik.",
    emergencyResetInstruction: "I-type ang KAIZEN para kumpirmahin ang pag-reset",
    emergencyResetAction: "Burahin Lahat at I-unlock",
    resetSuccessfulUnlocking: "Matagumpay na na-update ang password. Nag-a-unlock...",
    setNewPasswordTitle: "Magtakda ng Bagong Password",
    setNewPasswordDesc: "Ilagay at kumpirmahin ang iyong bagong password ng app.",
    saveAndUnlockButton: "I-save at I-unlock",
  },
  pro: {
    badge: "PRO",
    lifetime: "Panghabambuhay",
    oneTimeOffer: "Minsang Alok",
    unlockPro: "I-unlock ang Pro",
    proActive: "Aktibo ang Pro (Lifetime)",
    allFeaturesUnlocked: "Lahat ng features bukas · Walang ads",
    sidebarTitle: "Finance Pro · Lifetime",
    sidebarSubtitle: "Walang Ads · Advanced Reports",
    sidebarUnlockBtn: "Mag-upgrade sa Pro",
    paywallTitle: "Mag-upgrade sa Kaizen Pro",
    paywallSubtitle:
      "Hawakan nang buo ang iyong pananalapi gamit ang panghabambuhay na access sa advanced analytics at ad-free na karanasan.",
    paywallLifetimeBadge: "ISANG BESES NA BAYAD · HABAMBUHAY NA ACCESS",
    paywallUpgradeBtn: "I-unlock ang Pro (%{price})",
    paywallProcessing: "Pinoproseso...",
    featuresLeadIn: "Narito ang makukuha mo kapag nag-upgrade ka sa Pro:",
    launchSpecialBadge: "PROMO SA PAGLUNSAD",
    launchSpecialSubtitle: "Limitadong alok · Makatipid ng 60%",
    launchRegularPrice: "₱499",
    launchPromoPrice: "₱199",
    launchDiscountBadge: "60% OFF",
    launchSavingsText: "TIPID ₱300",
    launchSubtext: "Isang bayad · Habambuhay na access · Libreng updates",
    launchUpgradeBtn: "Kunin ang Promo Offer (%{price})",
    featureModalUpgradeBtn: "Kunin ang Promo Offer (%{price}) · 60% OFF",
    exploreAllFeatures: "Tingnan ang Lahat ng Pro Features →",
    swipeCardsHint: "I-swipe pakaliwa o pakanan para sa mga feature",
    guaranteeText: "Isang beses na bayad · 100% Pribado · Ibalik anumang oras",
    limits: {
      accountsTitle: "Lumalago ang iyong portfolio!",
      accountsDesc:
        "Nagamit mo na ang iyong unang %{count} accounts — magaling ang pag-oorganisa! Mag-level up sa Kaizen Pro para sa walang limitasyong accounts, sub-pockets, at buong wealth tracking.",
      pocketsDesc:
        "Inaayos mo ang iyong pera tulad ng isang pro! Mag-upgrade sa Kaizen Pro para sa walang limitasyong sub-pockets para sa mas malinaw na paghihiwalay ng ipon at gastos.",
      budgetsTitle: "Hawak mo ang iyong paggastos!",
      budgetsDesc:
        "Aktibo mong sinusubaybayan ang %{count} category budgets! Mag-upgrade sa Kaizen Pro para sa walang limitasyong badyet na may awtomatikong surplus rollover at threshold alerts.",
      goalsTitle: "Malalaking pangarap ang sumusulong!",
      goalsDesc:
        "Naitakda mo na ang iyong unang %{count} savings milestones! Pabilisin ang iyong pag-unlad gamit ang Kaizen Pro para sa walang limitasyong targets, target dates, at multi-pocket tracking.",
      schedulesTitle: "Awtomasyon sa iyong pananalapi!",
      schedulesDesc:
        "Nananatili kang maagap sa iyong mga bayarin! Mag-upgrade sa Kaizen Pro para sa walang limitasyong recurring transactions, background auto-posting, at recurrence analytics.",
      notesTitle: "Mahusay na pagtatala ng talaan!",
      notesDesc:
        "Napuno mo na ang iyong unang %{count} tala sa pananalapi! Buksan ang Kaizen Pro para sa walang limitasyong notes, photo at receipt attachments, at custom color tagging.",
      restoreAccountDesc:
        "Ang pag-restore sa account na ito ay lalampas sa iyong %{count} aktibong accounts. Mag-upgrade sa Kaizen Pro para sa walang limitasyong accounts at ganap na kalayaan.",
      restorePocketDesc:
        "Ang pag-restore sa pocket na ito ay lalampas sa iyong %{count} pockets para sa account na ito. Mag-upgrade sa Kaizen Pro para sa walang limitasyong sub-pockets.",
      restoreScheduleDesc:
        "Ang pag-restore sa iskedyul na ito ay lalampas sa iyong %{count} recurring transactions. Mag-upgrade sa Kaizen Pro para sa walang limitasyong schedules.",
    },
    restorePurchases: "Ibalik ang mga Binili (Restore)",
    restoring: "Ibinabalik...",
    restoreSuccessTitle: "Naibalik ang mga Binili",
    restoreSuccessMsg: "Matagumpay na naibalik ang iyong Lifetime Pro status!",
    restoreNotFoundTitle: "Walang Nakitang Pagbili",
    restoreNotFoundMsg:
      "Walang nakitang aktibong Lifetime Pro purchase para sa account na kasalukuyang aktibo sa iyong Google Play Store.\n\nTip: Ang mga binili ay nakatali sa iyong Google Play Store account. Kung ibang account ang ginamit mo sa pagbili, buksan ang Google Play Store app, magpalit ng account sa profile icon sa itaas, at subukan muli.",
    restoreErrorTitle: "Nabigo ang Pag-restore",
    restoreErrorMsg: "Hindi maibalik ang mga binili ngayon. Pakisubukan muli mamaya.",
    purchaseSuccessTitle: "Maligayang Pagdating sa Pro!",
    purchaseSuccessMsg: "Salamat sa pagsuporta sa Kaizen Finance! Lahat ng Pro features ay bukas na.",
    disclaimer:
      "Ang bayad ay sisingilin sa iyong Google Play account sa pagkumpirma ng pagbili. Ito ay isang beses na pagbili na walang paulit-ulit na bayarin.",
    reportsLockedTitle: "Handa na para sa Ganap na Kalinawan sa Pera?",
    reportsLockedSubtitle:
      "Hawak mo na ang iyong araw-araw na paggastos — ngayon tingnan ang kabuuang larawan! I-angat ang iyong pananalapi gamit ang Cash Flow charts, Balance Sheets, at Net Worth trajectory.",
    reportsLockedCta: "I-unlock ang Habambuhay na Access",
    widgetsLockedTitle: "Ang Iyong Pera sa Isang Sulyap",
    widgetsLockedSubtitle:
      "Maging maalam sa iyong badyet kahit hindi binubuksan ang app. I-pin ang mga interactive chart ng buwanang gastos at net worth sa iyong home screen.",
    widgetsLockedCta: "I-unlock ang Pro Widgets",
    locked: {
      cloudSyncTitle: "Ganap na Kapayapaan ng Isip para sa Iyong Pera",
      cloudSyncDesc:
        "Walang katumbas ang iyong talaan sa pananalapi. Panatilihing ligtas na naka-backup ang bawat transaksyon sa iyong personal na Google Drive at i-restore sa isang tap lamang.",
      securityTitle: "Bank-Grade na Proteksyon para sa Iyong Paningin Lamang",
      securityDesc:
        "Personal ang iyong pananalapi. Magdagdag ng Fingerprint o Face ID lock upang ang iyong pribadong net worth at mga tala ay manatiling protektado.",
      creditCardsTitle: "Umiwas sa Interes at Bayarin sa Credit Card",
      creditCardsDesc:
        "Pamahalaan ang mga billing cycle, statement cutoffs, 0% installment payoffs, at credit limit alerts upang mapanatiling malinis ang iyong credit record.",
      budgetRolloverTitle: "Gawing Kapaki-pakinabang ang Natirang Badyet",
      budgetRolloverDesc:
        "Gantimpala para sa magandang gawi! Awtomatikong dalhin ang natirang pondo sa susunod na buwan upang ang bawat pisong naipon ay manatiling bilang.",
      receiptsTitle: "Panatilihing Maayos ang mga Resibo at Tala",
      receiptsDesc:
        "Huwag nang mawalan ng resibo o invoice. Mag-attach ng mga larawan sa iyong notes at transaksyon para sa maayos na bookkeeping.",
      autoPostTitle: "Makatipid ng Oras nang Awtomatiko",
      autoPostDesc:
        "Awtomatikong iproseso ang mga recurring income at bayarin sa takdang petsa sa background upang hindi makaligtaan ang anumang bayarin.",
      fieldReceiptsTitle: "Maayos at Handa sa Buwis na Talaan",
      fieldReceiptsDesc:
        "Panatilihing organisado ang mga resibo sa pamamagitan ng pag-attach ng malilinaw na larawan direkta sa iyong tala.",
      fieldSplitTitle: "Eksaktong Paghati-hati ng Gastos",
      fieldSplitDesc:
        "Isang resibo, maraming kategorya! Madaling hatiin ang mga pinamili sa supermarket o mall sa mga tamang account.",
      fieldInstallmentsTitle: "Subaybayan ang mga Hulugan",
      fieldInstallmentsDesc:
        "Maging kontrolado ang mga installment ng gadget, bayarin sa card, at plano ng pagbabayad nang walang kalituhan.",
      fieldLabelsTitle: "Mas Malalim na Pag-uuri ng Pera",
      fieldLabelsDesc:
        "Lagyan ng sariling tag o label ang bawat gastos para sa proyekto, biyahe, o okasyon para sa madaling pagsusuri.",
      fieldQuickPresetsTitle: "Mabilisang 1-Tap na Pagtatala",
      fieldQuickPresetsDesc:
        "Makatipid ng oras araw-araw sa pamamagitan ng pagtatala ng madalas na kape, pamasahe, at groseri sa isang tap lamang.",
      remindersMonthlyTitle: "Simulan ang Buwan nang may Malinaw na Isip",
      remindersMonthlyDesc:
        "Ipagdiwang ang iyong pag-unlad gamit ang buwanang ulat ng cash flow, naipon, at net worth tuwing ika-1 ng buwan.",
      remindersCreditCardsTitle: "Protektahan ang Iyong Credit Score",
      remindersCreditCardsDesc:
        "Maging handa bago ang due date gamit ang mga paalalang akma sa billing cycle ng bawat credit card.",
      remindersCreditLimitTitle: "Babala Bago Lumampas sa Limitasyon",
      remindersCreditLimitDesc:
        "Umiwas sa dagdag na singil gamit ang maagang abiso kapag ang balanse ay umabot na sa 80% ng card limit.",
      remindersScheduledTitle: "Huwag Makaligtaan ang mga Bayarin",
      remindersScheduledDesc:
        "Manatiling una sa mga paparating na bayarin, subscription, at nakatakdang transfer gamit ang maagang paalala.",
      remindersBudgetTitle: "Manatili sa Tamang Hangganan ng Badyet",
      remindersBudgetDesc:
        "Panatilihing nasa ayos ang paggasta gamit ang mga abiso kapag umabot na sa 80% o 100% ang nagastos sa isang kategorya.",
      remindersGoalsTitle: "Ipagdiwang ang Bawat Naabot na Ipon",
      remindersGoalsDesc:
        "Manatiling inspirado gamit ang mga paalala sa deadline at pagbati kapag naabot ang 50%, 75%, at 100% ng iyong ipon.",
      accountHideSelectionTitle: "Malinis na Pang-araw-araw na Pagtatala",
      accountHideSelectionDesc:
        "Panatilihing maayos ang picker ng account sa pamamagitan ng pagtago ng mga emergency fund o lihim na naipon.",
      accountHideReportsTitle: "Tunay na Personal na Net Worth",
      accountHideReportsDesc:
        "Ihiwalay ang escrow, deposito, o panlabas na pondo upang 100% tunay na sariling kayamanan ang makita sa ulat.",
      fundGroupsTitle: "Ganap na Pamamahala sa mga Portfolio",
      fundGroupsDesc:
        "Madaling paghiwalayin ang personal na ipon, pondo sa negosyo, at mga sideline sa organisadong fund groups.",
      localBackupTitle: "Awtomatikong Lokal na Backup",
      localBackupDesc:
        "Panatilihin ang buong kontrol sa iyong talaan gamit ang awtomatiko at ligtas na backup direkta sa memorya ng iyong device.",
      quickSyncTitle: "Real-Time Cloud na Proteksyon",
      quickSyncDesc:
        "Ligtas na naka-sync sa iyong Google Drive ang bawat binagong transaksyon at badyet sa mismong oras na itala ito.",
      hexColorsTitle: "Pansariling Disenyo at Kulay",
      hexColorsDesc:
        "Gumawa ng sariling hex color palette para sa mga account, kategorya, at tag sa iyong dashboard.",
      iconLibraryTitle: "Mahigit 200 Dagdag na Lucide Icon",
      iconLibraryDesc:
        "I-personalize ang bawat account, badyet, at layunin gamit ang pinalawak na koleksyon ng mahigit 200 icon.",
    },
  },
  transactions: {
    speedDialForm: "Manwal na Porma",
    speedDialChat: "Makipag-chat kay Kai",
  },
  chatWithKai: {
    modalTitle: "Makipag-chat kay Kai",
    modalSubtitle: "Ang iyong matalinong kasama sa personal na pananalapi",
    inputPlaceholder: "hal. Nagastos ng 500 sa tanghalian sa McDonald's mula wallet",
    sectionTitle: "Mga Keyword (Kaalaman ng Kai Assistant)",
    bannerCategory: "Ang mga keyword na inilagay dito ay nagtuturo kay Kai na awtomatikong matukoy ang kategoryang ito kapag nagtala ka ng transaksyon sa chat.",
    bannerAccount: "Ang mga keyword na inilagay dito ay nagtuturo kay Kai na awtomatikong matukoy ang account na ito kapag nagtala ka ng transaksyon sa chat.",
    manageKeywords: "Mga Keyword sa Pagkilala",
    manageKeywordsSubtitle: "Magtakda ng mga keyword sa mga kategorya para sa wastong pagkilala",
    manageKeywordsAction: "Pamahalaan ang mga Keyword",
    addKeywordPlaceholder: "Magdagdag ng keyword (hal., boba, grab, netflix)...",
    addKeywordPlaceholderCategory: "Magdagdag ng keyword (hal. groceries, kape, grab)...",
    addKeywordPlaceholderAccount: "Magdagdag ng keyword (hal. payroll, pitaka, bpi)...",
    addKeywordButton: "Idagdag",
    keywordAdded: "Matagumpay na naidagdag ang keyword",
    keywordDeleted: "Natanggal ang keyword",
    keywordDuplicateInList: "Ang keyword na '%{keyword}' ay nasa listahan na",
    keywordAlreadyExists: "Ang keyword na '%{keyword}' ay nakatakda na sa '%{entity}'",
    resetDefaults: "Ibalik ang Default",
    resetDefaultsConfirm: "Sigurado ka bang nais mong ibalik ang mga default na keyword?",
    noKeywordsYet: "Wala pang naidagdag na mga keyword.",
    filterCategory: "Pumili ng Kategorya",
    knowledgeHubTitle: "Pamahalaan ang Kaalaman ni Kai",
    knowledgeHubSubtitle: "Turuan si Kai na matukoy ang mga aksyon, kategorya, at mga account",
    selectorTitle: "Mga Keyword (Kaalaman ni Kai)",
    selectorSubtitle: "%{count} mga keyword",
    selectorSubtitleSingle: "1 keyword",
    selectorSaveFirstCategory: "I-save muna ang kategorya bago magdagdag ng mga keyword",
    selectorSaveFirstAccount: "I-save muna ang account bago magdagdag ng mga keyword",
    tabActions: "Mga Aksyon",
    tabCategories: "Mga Kategorya",
    tabAccounts: "Mga Account",
    actionExpense: "Gastos",
    actionIncome: "Kita",
    actionTransfer: "Paglipat",
    actionExpenseDescription: "Mga salitang nagpapahiwatig ng paggastos o paglabas ng pera",
    actionIncomeDescription: "Mga salitang nagpapahiwatig ng pagtanggap ng pera o kita",
    actionTransferDescription: "Mga salitang nagpapahiwatig ng paglilipat ng pera sa pagitan ng mga account",
    searchPlaceholder: "Maghanap...",
    addActionPlaceholder: "Magdagdag ng salitang aksyon (hal. bumili, bayad, pinadala)...",
    tableHeaderKeyword: "Keyword",
    tableHeaderLanguage: "Wika",
    tableHeaderActions: "Mga Aksyon",
    searchKeywordsPlaceholder: "Maghanap ng keyword o wika...",
    editKeywordTitle: "I-edit ang Keyword",
    saveChanges: "I-save ang mga Pagbabago",
    cancel: "Kanselahin",
    selectLanguage: "Wika",
    langAny: "Lahat",
    langEn: "Ingles",
    langFil: "Filipino",
    langEs: "Espanyol",
    changeCategory: "Palitan ang Kategorya",
    changeAccount: "Palitan ang Account",
    selectCategoryPrompt: "Pumili ng kategorya upang makita at mapamahalaan ang mga keyword nito.",
    selectAccountPrompt: "Pumili ng account upang makita at mapamahalaan ang mga keyword nito.",
    noKeywordsMatching: "Walang nahanap na keyword para sa \"%{query}\"",
    helpModalTitle: "Tungkol sa Kaalaman ni Kai",
    helpModalSubtitle: "Kung paano kinikilala ni Kai ang iyong mga mensahe",
    helpActionsTitle: "Mga Keyword ng Aksyon",
    helpActionsDesc: "Ituro kay Kai kung anong mga salita ang gastusin (Expense), kita (Income), o paglipat ng pera sa pagitan ng mga account (Transfer).",
    helpCategoriesTitle: "Pagkilala sa Kategorya",
    helpCategoriesDesc: "Magdagdag ng mga keyword para sa mga app, tindahan, serbisyo, o brand (hal. Netflix, Grab, Starbucks). Kapag binanggit mo ang mga ito sa chat, awtomatikong pipiliin ni Kai ang tamang kategorya.",
    helpAccountsTitle: "Pagkilala sa Account",
    helpAccountsDesc: "Awtomatikong tinutukoy ni Kai ang Pangalan ng iyong Account bilang default (hal. 'gamit ang BDO' o 'mula GCash'). Kailangan lamang magdagdag ng mga keyword para sa mga palayaw o shortcut (hal. 'wallet' para sa 'Cash Wallet', o 'payroll' para sa 'BPI Savings').",
    helpLanguagesTitle: "Suporta sa Iba't Ibang Wika",
    helpLanguagesDesc: "Naiintindihan ni Kai ang natural na pakikipag-chat sa Ingles, Filipino, at Espanyol. Mag-chat nang natural tulad ng 'nagastos ng 200 sa tanghalian mula bdo' o 'nagbayad ng 500 gamit gcash'.",
    helpClose: "Naintindihan",
    unknownAccountError: "Hindi ko mahanap ang account na tumutugma sa '%{account}'. Pakitingnan ang pangalan ng iyong account o idagdag ito sa Kaalaman ni Kai.",
    pickerSelectCategory: "Pumili ng Kategorya",
    pickerSelectAccount: "Pumili ng Account",
    pickerSearchCategory: "Maghanap ng kategorya...",
    pickerSearchAccount: "Maghanap ng account...",
    noCategoriesFound: "Walang nahanap na kategorya",
    noAccountsFound: "Walang nahanap na account",
    allCategories: "Lahat",
  },
} satisfies TranslationCatalogShape<TranslationCatalog>;
