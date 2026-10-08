import type {
  TranslationCatalog,
  TranslationCatalogShape,
} from "@/infrastructure/localization/translations/en";

export const fil = {
  common: {
    cancel: "Kanselahin",
    close: "Isara",
    ok: "OK",
    search: "Maghanap",
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
    localBackup: "Lokal na Backup",
    googleDriveBackup: "Google Drive Backup",
    language: "Wika",
    currencySetup: "Setup ng Currency",
    menu: "MENU",
    openMenu: "Buksan ang navigation menu",
    closeMenu: "Isara ang navigation menu",
  },
  brand: {
    tagline: "Patuloy na pagpapabuti ng pananalapi",
    logoAccessibility: "Logo ng %{name}",
  },
  sync: {
    localOnly: "Lokal lamang",
    accessibility:
      "Status ng pag-sync: %{label}. I-tap para buksan ang mga setting.",
  },
  settings: {
    languageSection: "WIKA",
    languageTitle: "Wika",
    languageSystemValue: "Default ng system · %{language}",
    languageAccessibility:
      "Kasalukuyang wika: %{language}. I-tap para palitan.",
    currencySection: "CURRENCY AT MGA NUMERO",
    currencySetup: "Setup ng Currency",
    currencySetupDescription: "Currency, sign, decimal, at kulay ng halaga",
    currencySetupAccessibility: "I-configure ang currency at format ng numero",
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
    dangerZone: "DELIKADONG ZONE",
    resetData: "I-reset ang Data",
    resetDataDescription:
      "Permanenteng burahin ang lahat ng lokal na app data at magsimulang muli.",
  },
  currency: {
    defaultCurrency: "Default na currency",
    displayCurrency: "Ipakita ang currency",
    displayCurrencyDescription: "Ipakita ang currency sa mga halaga",
    colorAmounts: "Kulayan ang mga halaga",
    colorAmountsDescription: "Kulayan ang positibo at negatibong halaga",
    negativeNumber: "Negatibong Numero",
    decimalDigits: "Mga Decimal Digit",
    catalogTitle: "Mga Currency",
    catalogRowLabel: "Mga currency at decimal place",
    catalogRowValue: "%{count} na currency",
    catalogDescription:
      "Magdagdag ng custom currency o baguhin ang decimal places bago gamitin sa account, goal, rate, o bilang default currency.",
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
    fieldName: "Pangalan",
    fieldNamePlaceholder: "Bitcoin",
    fieldSymbol: "Simbolo",
    fieldDecimalPlaces: "Decimal places",
    fieldDecimalPlacesHint: "Buong numero mula 0 hanggang 18 (hal. 2 para sa cents, 0 para sa yen).",
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
    decimalDigitsDescription:
      "Piliin ang bilang ng decimal digit mula 0 hanggang 9.",
    decimalFormatDescription:
      "Piliin ang format ng thousands at decimal separator.",
    helpTitle: "Tungkol sa Setup ng Currency",
    helpMessage:
      "Ginagamit ang default na currency para sa pinagsamang total at mga bagong account. Mananatili ang currency ng mga kasalukuyang account. Hindi binabago ng mga display option ang naka-save na halaga.",
  },
  language: {
    heading: "Kagustuhan sa wika",
    description: "Piliin ang wikang gagamitin sa navigation at mga setting.",
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
  resetData: {
    dismissAccessibility: "Isara ang kumpirmasyon sa pag-reset ng data",
    title: "I-reset ang lahat ng data?",
    message:
      "Permanenteng buburahin nito ang iyong mga account, transaksyon, badyet, layunin, tala, setting, attachment, at mga lokal na backup na pinamamahalaan ng app mula sa device na ito.",
    externalNote:
      "Hindi mabubura ang mga na-export na file at Google Drive backup.",
    confirmationInstruction: "I-type ang KAIZEN para kumpirmahin",
    confirmationAccessibility:
      "I-type ang KAIZEN para kumpirmahin ang pag-reset ng lahat ng data",
    deleteAll: "Burahin ang lahat ng data",
  },
} satisfies TranslationCatalogShape<TranslationCatalog>;
