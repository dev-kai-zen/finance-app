import type {
  TranslationCatalog,
  TranslationCatalogShape,
} from "@/infrastructure/localization/translations/en";

export const es = {
  common: {
    cancel: "Cancelar",
    close: "Cerrar",
    goBack: "Volver",
    ok: "Aceptar",
    search: "Buscar",
  },
  navigation: {
    dashboard: "Panel",
    accounts: "Cuentas",
    transactions: "Transacciones",
    scheduledTransactions: "Transacciones programadas",
    calendar: "Calendario",
    creditCards: "Tarjetas de crédito",
    creditCardMonitoring: "Seguimiento de tarjetas de crédito",
    categories: "Categorías",
    budgets: "Presupuestos",
    goals: "Objetivos",
    reports: "Informes",
    notes: "Notas",
    sqliteMonitor: "Monitor de SQLite",
    settings: "Configuración",
    sendFeedback: "Enviar comentarios",
    localBackup: "Copia de seguridad local",
    googleDriveBackup: "Copia de seguridad de Google Drive",
    language: "Idioma",
    currencySetup: "Configuración de moneda",
    menu: "MENÚ",
    openMenu: "Abrir menú de navegación",
    closeMenu: "Cerrar menú de navegación",
    moreFeatures: "Más funciones",
    moreFeaturesDescription:
      "Mostrar u ocultar elementos opcionales del menú. Puedes cambiarlos cuando quieras.",
    resetSimpleMenu: "Restablecer menú simple",
    scrollDown: "Desplazar hacia abajo para ver más elementos",
  },
  brand: {
    tagline: "Mejora financiera continua",
    logoAccessibility: "Logotipo de %{name}",
  },
  sync: {
    localOnly: "Solo local",
    syncing: "Sincronizando...",
    synced: "Sincronizado",
    waitingNetwork: "Esperando Wi-Fi",
    failed: "Error al sincronizar",
    accessibility:
      "Estado de sincronización: %{label}. Toca para abrir la configuración.",
  },
  quickSync: {
    title: "Sincronización Rápida",
    description: "Guarda automáticamente tus cambios en Google Drive",
    networkLabel: "Sincronizar mediante",
    wifiOnly: "Solo Wi-Fi",
    wifiOnlyDescription: "Solo sincronizar al conectarse a Wi-Fi",
    anyNetwork: "Wi-Fi y Datos móviles",
    anyNetworkDescription: "Sincronizar por Wi-Fi o datos móviles",
    statusLabel: "Estado",
    lastSynced: "Última sincronización: %{time}",
    neverSynced: "Nunca sincronizado",
    syncNow: "Sincronizar ahora",
    syncingNow: "Sincronizando...",
    restore: "Restaurar",
    restoring: "Restaurando...",
    restoreFailed: "No se pudo restaurar la copia de Quick Sync.",
    restoreConfirmTitle: "¿Restaurar Quick Sync?",
    restoreConfirmMessage:
      "Esto reemplaza todos los datos locales con el archivo Quick Sync más reciente de Google Drive. Se guarda una copia de seguridad en memoria y se restaura automáticamente si falla la validación.",
    restoreConfirmAction: "Restaurar",
  },
  settings: {
    generalSection: "GENERAL",
    profileSection: "PERFIL",
    nicknameTitle: "Apodo (Nickname)",
    nicknameDescription: "Nombre personalizado mostrado en tu panel",
    nicknameNotSet: "No configurado",
    editNicknameTitle: "Editar apodo",
    editNicknamePrompt: "Introduce el nombre con el que te gustaría que te llamemos en el panel.",
    nicknameSave: "Guardar",
    nicknameCancel: "Cancelar",
    localizationSection: "LOCALIZACIÓN",
    themeTitle: "Tema",
    defaultAccountExpenseLabel: "Cuenta predeterminada (Gastos)",
    defaultAccountIncomeLabel: "Cuenta predeterminada (Ingresos)",
    resetDataAccessibility:
      "Restablecer todos los datos de la app. Toca para continuar.",
    languageSection: "IDIOMA",
    languageTitle: "Idioma",
    languageSystemValue: "Predeterminado del sistema · %{language}",
    languageAccessibility:
      "Idioma actual: %{language}. Toca para cambiarlo.",
    currencySection: "MONEDA Y NÚMEROS",
    currencySetup: "Configuración de moneda",
    currencySetupDescription: "Moneda, signos, decimales y colores de importes",
    currencySetupAccessibility: "Configurar la moneda y el formato numérico",
    remindersTitle: "Recordatorios",
    remindersDescription: "Registro diario y alertas de facturas por vencer",
    remindersAccessibility: "Configurar recordatorios",
    defaultAccountsSection: "CUENTAS PREDETERMINADAS",
    expense: "Gastos",
    income: "Ingresos",
    defaultAccountNone: "Ninguna (Primera disponible)",
    defaultAccountPickerNone: "Ninguna (Primera cuenta disponible)",
    defaultExpenseAccessibility:
      "Cuenta de gastos predeterminada: %{account}. Toca para cambiarla.",
    defaultIncomeAccessibility:
      "Cuenta de ingresos predeterminada: %{account}. Toca para cambiarla.",
    defaultExpenseTitle: "Cuenta de gastos predeterminada",
    defaultIncomeTitle: "Cuenta de ingresos predeterminada",
    availablePocket: "Disponible",
    backupSection: "COPIA DE SEGURIDAD Y SINCRONIZACIÓN",
    localBackupAccessibility: "Administrar copias de seguridad locales",
    localBackupDescription:
      "Crear, exportar o restaurar una copia en el dispositivo",
    googleDriveAccessibility:
      "Administrar copias de seguridad de Google Drive",
    googleDrive: "Google Drive",
    googleDriveDescription:
      "Conectar, crear o restaurar una copia en la nube",
    backupPaused: "Copia de seguridad en pausa",
    backupPausedDescription:
      "Los registros de ejemplo son temporales y no se suben a Google Drive. Inicia un espacio de trabajo personal para activar la copia de seguridad.",
    appearanceSection: "TEMAS Y COLORES PREDEFINIDOS",
    themeAccessibility: "Tema actual: %{theme}. Toca para cambiarlo.",
    followingAppearance: "Siguiendo la apariencia del dispositivo",
    paletteSaved: "Paleta %{mode} - guardada en este dispositivo",
    light: "clara",
    dark: "oscura",
    sourceManagementSection: "ADMINISTRACIÓN DE RECURSOS",
    hexColors: "Colores hexadecimales",
    hexColorsAccessibility:
      "Administrar colores hexadecimales. Hay %{count} colores disponibles.",
    securitySection: "SEGURIDAD Y PRIVACIDAD",
    securityMenuTitle: "Contraseña y huella digital",
    securityMenuSubtitleConfigured: "Protegida · Contraseña activa",
    securityMenuSubtitleNotConfigured: "No configurada · Toca para configurar",
    securityMenuAccessibility:
      "Abrir ajustes de seguridad. Configurar contraseña y desbloqueo biométrico.",
    dangerZone: "ZONA DE PELIGRO",
    resetData: "Restablecer datos",
    resetDataDescription:
      "Borra permanentemente todos los datos locales y comienza de nuevo.",
    aboutSection: "ACERCA DE",
    whatsNew: "Novedades",
    whatsNewDescription: "Consulta lo destacado de las últimas actualizaciones",
    whatsNewAccessibility: "Abrir las notas de la versión",
    developerModeEnabledTitle: "Modo desarrollador activado",
    developerModeEnabledMessage: "SQLite Monitor ya está en el menú.",
    developerSection: "DESARROLLADOR",
    developerMode: "Modo desarrollador",
    developerModeDescription: "Mostrar SQLite Monitor en el menú de navegación",
    sqliteMonitor: "SQLite Monitor",
    sqliteMonitorDescription: "Explorar tablas y ejecutar SQL en este dispositivo",
    moreToolsSection: "MÁS HERRAMIENTAS",
    moreToolsDescription: "Mostrar pantallas extra en el menú cuando las necesites",
    navCalendar: "Calendario",
    navCreditCards: "Tarjetas de crédito",
    navCategories: "Categorías",
    navBudgets: "Presupuestos",
    navGoals: "Metas",
    navReports: "Informes",
    navNotes: "Notas",
  },
  currency: {
    defaultCurrency: "Moneda predeterminada",
    displayCurrency: "Mostrar moneda",
    displayCurrencyDescription: "Mostrar la moneda en los importes",
    colorAmounts: "Colorear importes",
    colorAmountsDescription: "Colorear importes positivos y negativos",
    negativeNumber: "Número negativo",
    catalogTitle: "Monedas",
    catalogRowLabel: "Monedas y decimales",
    catalogRowValue: "%{count} monedas",
    catalogDescription: "Añade monedas personalizadas o ajusta los decimales.",
    catalogHelpTitle: "Acerca de las monedas",
    catalogHelpMessage:
      "Añade monedas personalizadas o ajusta los decimales antes de usarlas en cuentas, metas, tipos de cambio o como moneda predeterminada. Las monedas integradas conservan código y nombre; los decimales solo pueden cambiarse antes del uso.",
    catalogHelpAccessibility: "Ayuda de monedas",
    catalogHelpHint: "Muestra ayuda para gestionar monedas",
    decimalPlacesLabel: "%{count} decimales",
    sampleAmount: "Ejemplo",
    addCurrency: "Añadir moneda",
    usedChip: "En uso",
    usageClickToView: "Pulsa para ver",
    usedLockedMessage:
      "Esta moneda ya está en uso. No se pueden cambiar los decimales ni los detalles.",
    usageChipAccessibility: "En uso, mostrar dónde se usa esta moneda",
    usageModalLink: "Ver dónde se usa",
    usageModalTitle: "Dónde se usa %{code}",
    usageModalIntro: "%{code} aparece en los siguientes lugares:",
    usageModalEmpty: "No se encontraron referencias activas para %{code}.",
    usageReasonAccounts: "%{count} cuenta(s)",
    usageReasonGoals: "%{count} meta(s)",
    usageReasonTransactions: "%{count} transacción(es)",
    usageReasonExchangeRates: "Ajustes de tipos de cambio (%{count})",
    usageReasonDefault: "Tu moneda predeterminada para totales y cuentas nuevas",
    fieldCode: "Código de moneda",
    codeAlreadyInUse: "Este código de moneda ya está en uso.",
    fieldName: "Nombre",
    fieldNamePlaceholder: "Dólar canadiense",
    fieldSymbol: "Símbolo",
    fieldDecimalPlaces: "Decimales",
    fieldDecimalPlacesHint: "Número entero de 0 a 3 (p. ej., 2 para céntimos, 0 para yen, 3 para dinar).",
    builtinEditHint:
      "Monedas integradas: solo puedes cambiar los decimales antes de usarlas.",
    deleteTitle: "Eliminar moneda",
    deleteAction: "Eliminar",
    deleteCurrency: "Eliminar moneda",
    deleteConfirm:
      "¿Eliminar %{code}? Se quitarán los ajustes de tipo de cambio de esta moneda. No se puede deshacer.",
    errorTitle: "No se pudo guardar",
    decimalFormat: "Formato decimal",
    automaticFormat: "Automático · Según la región del dispositivo",
    chooseCurrency: "Moneda predeterminada",
    chooseCurrencyDescription:
      "Elige la moneda para los totales combinados y las cuentas nuevas.",
    searchCurrencies: "Buscar por nombre o código de moneda",
    noCurrenciesFound: "No hay monedas que coincidan con la búsqueda.",
    negativeNumberDescription:
      "Elige cómo se muestran los importes negativos.",
    decimalFormatDescription:
      "Elige el formato de los separadores de miles y decimales.",
    helpTitle: "Acerca de la configuración de moneda",
    helpMessage:
      "La moneda predeterminada se usa en totales combinados y cuentas nuevas. Las cuentas existentes conservan su moneda. Las opciones de visualización no modifican los valores guardados.",
  },
  googleDriveBackup: {
    helpTitle: "Acerca de la copia en Google Drive",
    helpMessage:
      "Guarda una copia exportada de tu base de datos financiera en Google Drive y restáurala en otro dispositivo. Conecta tu cuenta, crea copias cuando quieras y elige un archivo guardado al restaurar.",
    loading: "Cargando copia de Google Drive...",
    loadingBackups: "Cargando copias de seguridad...",
    onboardingQuickSyncPromptTitle: "Copia Quick Sync encontrada",
    onboardingQuickSyncPromptMessage:
      "Encontramos un archivo Quick Sync automático en Google Drive. Restáuralo para obtener los datos más recientes, o elige una copia cifrada completa.",
    restoreQuickSyncTitle: "Restaurar Quick Sync",
    restoreQuickSyncDescription: "Última sincronización automática del %{date}",
    restoreQuickSyncAction: "Restaurar Quick Sync",
    restoreQuickSyncUseFullBackup: "Elegir copia completa",
    restoreQuickSyncConfirmTitle: "¿Restaurar Quick Sync?",
    restoreQuickSyncConfirmMessage:
      "Esto reemplaza todos los datos locales con tu archivo Quick Sync y vuelve a activar Quick Sync en este dispositivo.",
  },
  language: {
    helpTitle: "Acerca del idioma",
    helpMessage:
      "Elige el idioma para la navegación y la configuración. El predeterminado del sistema sigue el idioma del dispositivo cuando hay una traducción compatible.",
    searchPlaceholder: "Buscar idiomas",
    searchAccessibility: "Buscar idiomas",
    systemDefault: "Predeterminado del sistema",
    systemDefaultDescription: "Actualmente %{language}",
    selectedAccessibility: "%{language}, seleccionado",
    optionAccessibility: "Usar %{language}",
    moreComingSoon: "Próximamente habrá más idiomas.",
    noResultsTitle: "No se encontraron idiomas",
    noResultsDescription: "Prueba otro nombre de idioma o código regional.",
  },
  scheduledTransactions: {
    helpTitle: "Acerca de las transacciones programadas",
    helpMessage:
      "Configura ingresos, gastos o transferencias recurrentes. Elige si cada ocurrencia se registra automáticamente o espera tu confirmación. Los elementos vencidos o fallidos aparecen en Necesita atención; puedes pausar, finalizar o archivar programaciones sin eliminar las transacciones ya registradas.",
  },
  themePicker: {
    closeAccessibility: "Cerrar selector de tema",
    title: "Elegir apariencia",
    subtitle:
      "Previsualiza toda la paleta de la aplicación antes de salir de esta pantalla.",
    followDevice: "Seguir la apariencia del dispositivo",
    followDeviceDescription: "Paper en modo claro e Ink en modo oscuro.",
    palettes: "PALETAS",
    choices: "%{count} opciones",
  },
  whatsNew: {
    heading: "Novedades",
    continue: "Continuar",
    dismissAccessibility: "Cerrar novedades",
    versionLabel: "Versión %{version}",
    empty: "Aún no hay notas de la versión para esta actualización.",
    v100: {
      title: "Te damos la bienvenida a Kaizen Finance",
      item1:
        "Gestiona cuentas, transacciones, presupuestos y metas con una base de datos local offline-first.",
      item2:
        "Haz copias de seguridad y restaura tus datos con archivos locales o sincronización con Google Drive.",
      item3:
        "Personaliza temas, idiomas y formato de moneda según cómo administras tu dinero.",
    },
    v100fixes: {
      title: "Correcciones y mejoras",
      item1:
        "Se corrigió un error al editar una transacción programada que aún requiere atención (vencida o fallida).",
      item2:
        "Las ocurrencias programadas pendientes reflejan el importe, la cuenta y la categoría más recientes cuando editas la programación.",
    },
  },
  onboarding: {
    welcomeTitle: "Bienvenido a Kaizen Finance",
    welcomeDescription:
      "Un lugar tranquilo para registrar entradas, salidas y lo que te queda.",
    welcomePoint1: "Registra gastos e ingresos con unos toques",
    welcomePoint2: "Mira cuánto tienes y cuánto gastaste este mes",
    welcomePoint3: "Tus datos están en este dispositivo y funcionan sin conexión",
    getStarted: "Empezar",
    restoreBackup: "Restaurar una copia de seguridad",
    seeExample: "Ver un espacio de ejemplo",
    setupMyself: "Configurarlo yo mismo",
    allSetupOptions: "Ver todas las opciones de onboarding",
    backToSample: "Volver al ejemplo",
    backToSetupChoices: "Volver a las opciones de setup",
    nicknameTitle: "¿Cómo deberíamos llamarte?",
    nicknameDescription:
      "Personalizaremos tu espacio y tu panel financiero diario.",
    nicknameLabel: "TU APODO",
    nicknamePlaceholder: "p. ej. Alex, Sam, Jordan",
    nicknameHint: "Puedes cambiar tu apodo en cualquier momento en Ajustes.",
    languageTitle: "Elige tu idioma",
    languageDescription: "Puedes cambiarlo cuando quieras en Ajustes.",
    languageTitleAssisted: "¡Mucho gusto, %{name}!",
    languageDescriptionAssisted:
      "¿Qué idioma prefieres para tu espacio de trabajo?",
    currencyTitle: "¿Qué moneda usas?",
    currencyDescription: "La usaremos para tu primera cuenta y los importes.",
    currencyTitleAssisted: "¿Qué moneda usas, %{name}?",
    currencyDescriptionAssisted:
      "La usaremos para mostrar tus saldos, informes y cuentas.",
    currencyHint:
      "¿No encuentras tu moneda? Puedes agregarla más tarde en Ajustes.",
    accountTitle: "Tu primera cuenta",
    accountDescription: "¿Dónde sueles guardar el dinero que gastas?",
    accountTitleAssisted: "Configuremos tu primera cuenta, %{name}",
    accountDescriptionAssisted:
      "¿Dónde sueles guardar el dinero que gastas o ahorras?",
    accountTypeLabel: "TIPO DE CUENTA",
    accountTemplateCash: "Efectivo",
    accountTemplateBank: "Banco",
    accountTemplateEwallet: "Monedero digital",
    accountTemplateSavings: "Ahorros",
    accountNameLabel: "NOMBRE DE LA CUENTA",
    accountNamePlaceholder: "p. ej. Cartera, BDO, GCash",
    openingBalanceLabel: "¿CUÁNTO TIENE AHORA?",
    openingBalanceHint: "Opcional. Puedes cambiarlo más tarde.",
    notificationsTitle: "Mantén el ritmo",
    notificationsTitleAssisted: "¡Mantén la constancia, %{name}!",
    notificationsDescription:
      "Activa el recordatorio diario para tener el control de tus gastos.",
    notificationsDescriptionAssisted:
      "Activa el recordatorio diario para crear el hábito de registrar tus gastos.",
    notificationsPermissionTitle: "Notificaciones push",
    notificationsPermissionDesc:
      "Recibe recordatorios, alertas y novedades importantes.",
    dailyReminderTitle: "Recordatorio diario",
    dailyReminderDesc:
      "Recibe un aviso amable cada noche para registrar tus gastos (8:00 PM).",
    notificationsTip:
      "Puedes ajustar la hora del recordatorio o tus preferencias en cualquier momento en Ajustes.",
    readyTitle: "Ya estás listo",
    readyDescription: "Toca + en Inicio para registrar tu primer gasto.",
    readyTitleAssisted: "¡Todo listo, %{name}!",
    readyDescriptionAssisted:
      "Tu espacio de trabajo está preparado. Demos el primer paso hacia la claridad financiera.",
    readyNickname: "Apodo: %{name}",
    readyCurrency: "Moneda: %{currency}",
    readyAccount: "Cuenta: %{name}",
    readyDailyReminder: "Recordatorio diario: Activado (8:00 PM)",
    finishSetup: "Ir a Inicio",
    continue: "Continuar",
    fullSetupTitle: "Configura tu espacio",
    fullSetupDescription: "Elige cuánta estructura quieres el primer día.",
    manualSetupTitle: "Empezar desde cero",
    manualSetupDescription:
      "Crea tipos de cuenta, cuentas y categorías por tu cuenta.",
    recommendedSetupTitle: "Usar configuración recomendada",
    recommendedSetupDescription:
      "Cuentas y categorías listas para registrar rápido.",
    recommendedBadge: "Recomendado",
  },
  transactionForm: {
    customizeFieldsTitle: "Personalizar campos",
    customizeFieldsSubtitle:
      "Importe, cuenta, categoría y fecha siempre permanecen en el formulario.",
    alwaysOn: "Siempre visible",
    fields: {
      amount: "Importe",
      account: "Cuenta",
      category: "Categoría",
      date: "Fecha",
      transactionName: "Nombre de la transacción",
      attachments: "Adjuntos",
      split: "Dividir transacción",
      installments: "Plazos",
      labels: "Etiquetas",
      note: "Nota",
      quickPresets: "Ajustes rápidos",
      exactTime: "Hora exacta",
    },
  },
  dashboard: {
    greetingMorning: "Buenos días, %{name}",
    greetingAfternoon: "Buenas tardes, %{name}",
    greetingEvening: "Buenas noches, %{name}",
    greetingNight: "Buenas noches, %{name}",
    greetingMorningGeneric: "Buenos días",
    greetingAfternoonGeneric: "Buenas tardes",
    greetingEveningGeneric: "Buenas noches",
    greetingNightGeneric: "Buenas noches",
    quoteShuffle: "Nueva frase",
    dailyInspiration: "Inspiración Diaria",
    displayModeAccessibility: "Elegir estilo del panel",
    displayModeTitle: "Vista del panel",
    displayModeSimple: "Simple",
    displayModeSimpleDescription:
      "Etiquetas amigables como “Dinero que tienes” y “Gastado este mes.” Los importes siguen siendo patrimonio neto y gasto mensual.",
    displayModeDetailed: "Detallada",
    displayModeDetailedDescription:
      "Etiquetas financieras estándar con patrimonio neto, activos totales y pasivos.",
    moneyYouHave: "Dinero que tienes",
    spentThisMonth: "Gastado este mes",
    firstExpenseHint: "Toca + para registrar tu primer gasto.",
    dismissHint: "Cerrar",
    promptQuickPresetsTitle: "¿Reutilizar gastos habituales?",
    promptQuickPresetsMessage:
      "Activa el nombre y los ajustes rápidos para rellenar el formulario más rápido.",
    promptQuickPresetsAction: "Activar",
    promptTransfersTitle: "¿Mover dinero entre cuentas?",
    promptTransfersMessage:
      "Puedes registrar transferencias entre cuentas desde el formulario.",
    promptCreditCardsTitle: "¿Usas tarjeta de crédito?",
    promptCreditCardsMessage:
      "Activa tarjetas y plazos para compras con tarjeta.",
    promptCreditCardsAction: "Activar",
    promptDismiss: "Ahora no",
    walkthroughChip: "Guía",
    walkthroughSkip: "Omitir",
    walkthroughNext: "Siguiente",
    walkthroughBack: "Atrás",
    walkthroughStartTx: "Toca + para empezar",
    walkthroughStepCount: "Paso %{current} de %{total}",
    stepNetWorthTitle: "Patrimonio neto",
    stepNetWorthDesc:
      "Esta tarjeta te muestra un resumen financiero completo: calcula tu patrimonio neto total (activos menos pasivos) y el historial de balance.",
    stepCollapseTitle: "Plegar gráfico",
    stepCollapseDesc:
      "Toca este icono para plegar o desplegar el gráfico de patrimonio neto y ahorrar espacio.",
    stepSettingsTitle: "Configuración de vista",
    stepSettingsDesc:
      "Personaliza el estilo de tu panel. Toca Siguiente para ver cómo cambiar entre las vistas Simple y Detallada.",
    stepSettingsModalTitle: "Opciones de visualización",
    stepSettingsModalDesc:
      "En el modo Simple, verás etiquetas claras sobre dinero y gasto. En el modo Detallado, activos y pasivos completos. ¡Cambia cuando quieras!",
    stepEyeTitle: "Ocultar saldos",
    stepEyeDesc:
      "Toca el ojo para ocultar o mostrar los importes (••••••) cuando uses la app en lugares públicos.",
    stepRecentTxTitle: "Transacciones recientes",
    stepRecentTxDesc:
      "Tus gastos, ingresos y transferencias más recientes aparecen aquí. Toca cualquiera para ver detalles o editar.",
    stepFabTitle: "Registra tu primera transacción",
    stepFabDesc:
      "¡Toca el botón (+) aquí para añadir tu primera transacción y empezar a controlar tu dinero!",
    congratulationsTitle: "🎉 ¡Felicitaciones!",
    congratulationsSubtitle: "¡Primera transacción registrada!",
    congratulationsMessage:
      "Has dado el primer paso para dominar tus finanzas. Cada registro te acerca más a tus objetivos.",
    congratulationsButton: "Explorar panel",
  },
  accountsWalkthrough: {
    stepArchivedTitle: "Cuentas archivadas",
    stepArchivedDesc:
      "Accede a todas tus cuentas y bolsillos archivados guardados de forma segura. Puedes ver su historial o restaurarlos en cualquier momento.",
    stepFundGroupsTitle: "Grupos de fondos",
    stepFundGroupsDesc:
      "Organiza múltiples cuentas en grupos personalizados (como Fondo de emergencia, Ahorros u Operaciones) para monitorear totales combinados.",
    stepSearchTitle: "Buscar cuentas",
    stepSearchDesc:
      "Filtra rápidamente tus cuentas por nombre en activos y pasivos.",
    stepAssetsTitle: "Resumen de activos",
    stepAssetsDesc:
      "Consulta tus cuentas positivas (bancos, efectivo, inversiones y bolsillos) junto con su saldo total.",
    stepLiabilitiesTitle: "Resumen de pasivos",
    stepLiabilitiesDesc:
      "Lleva el control de tarjetas de crédito, préstamos y deudas pendientes para conocer tus obligaciones.",
    stepFabTitle: "Menú de cuentas",
    stepFabDesc:
      "Toca el botón (+) para abrir el menú de cuentas donde puedes crear nuevas cuentas o configurar tipos y grupos.",
    stepSheetTitle: "Acciones de cuentas",
    stepSheetDesc:
      "Elige si deseas crear una nueva cuenta o configurar tus grupos y categorías de cuentas. ¡Toca Finalizar para completar la guía!",
    actionAddAccount: "Agregar nueva cuenta",
    actionAddAccountDesc:
      "Crea cuentas de banco, efectivo, billetera o inversiones con saldo inicial.",
    actionManageTypes: "Configuración de grupos",
    actionManageTypesDesc:
      "Define y administra tipos y grupos personalizados de cuentas.",
  },
  transactionsWalkthrough: {
    stepSearchTitle: "Buscar transacciones",
    stepSearchDesc:
      "Encuentra rápidamente transacciones por nota, beneficiario, categoría, cuenta o monto en tiempo real.",
    stepFilterTitle: "Filtrar transacciones",
    stepFilterDesc:
      "Abre los filtros avanzados para acotar por rango de fechas, cuenta, categoría, tipo o etiquetas.",
    stepSortDateTitle: "Ordenar por fecha",
    stepSortDateDesc:
      "Ordena tu historial cronológicamente por la fecha de transacción.",
    stepSortAmountTitle: "Ordenar por monto",
    stepSortAmountDesc:
      "Ordena las transacciones por valor monetario para identificar rápidamente tus gastos más altos o más bajos.",
    stepSortOrderTitle: "Sentido de ordenación",
    stepSortOrderDesc:
      "Alterna entre orden descendente (más recientes/altos primero) y ascendente (más antiguos/bajos primero).",
    stepViewModeTitle: "Modo detallado y simple",
    stepViewModeDesc:
      "Alterna entre el modo Compacto para visualización densa y el modo Detallado con notas, etiquetas y cuentas.",
    stepScheduledTitle: "Transacciones programadas",
    stepScheduledDesc:
      "Accede a transacciones futuras y recurrentes automatizadas para mantener al día tus pagos pendientes.",
    stepTrashTitle: "Papelera de transacciones",
    stepTrashDesc:
      "Revisa de forma segura las transacciones eliminadas. Puedes restaurar registros o vaciar la papelera de forma permanente.",
    stepExportTitle: "Exportar CSV",
    stepExportDesc:
      "Exporta tu historial filtrado a una hoja de cálculo CSV para compartir, respaldar o analizar.",
    stepFabTitle: "Registrar transacción",
    stepFabDesc:
      "Toca el botón (+) en cualquier momento para registrar un nuevo gasto, ingreso o transferencia. ¡Listo para comenzar!",
  },
  calendarWalkthrough: {
    stepArrowsTitle: "Navegación del calendario",
    stepArrowsDesc:
      "Usa las flechas de navegación para desplazarte entre meses anteriores y futuros, o volver al día de hoy.",
    stepTransactionsTitle: "Pestaña Transacciones",
    stepTransactionsDesc:
      "Revisa todos los ingresos, gastos y transferencias registrados para el día seleccionado o el mes completo.",
    stepSchedulesTitle: "Pestaña Programados",
    stepSchedulesDesc:
      "Supervisa pagos recurrentes, facturas programadas y próximos vencimientos directamente en el calendario.",
    stepNetTitle: "Pestaña Ganancias netas",
    stepNetDesc:
      "Analiza la diferencia entre ingresos y gastos, tendencias de flujo de caja y trayectoria neta.",
    stepBalanceSheetTitle: "Pestaña Balance general",
    stepBalanceSheetDesc:
      "Monitorea activos, pasivos y patrimonio neto proyectados a lo largo de tu calendario en un solo vistazo.",
  },
  categoriesWalkthrough: {
    stepTypeToggleTitle: "Gastos e Ingresos",
    stepTypeToggleDesc:
      "Alterna entre categorías de gastos y fuentes de ingresos para organizar y personalizar tus flujos de efectivo.",
    stepReorderGroupsTitle: "Reordenar categorías",
    stepReorderGroupsDesc:
      "Reorganiza los grupos de categorías en tu orden preferido para selectores e informes.",
    stepPresetsIconTitle: "Preajustes de categorías",
    stepPresetsIconDesc:
      "Carga rápidamente paquetes iniciales de categorías seleccionadas o administra los preajustes integrados.",
    stepNewCategoryTitle: "Nueva categoría",
    stepNewCategoryDesc:
      "Crea un grupo de categorías personalizado con colores, íconos y clasificación a tu medida.",
    stepReorderSubTitle: "Reordenar subcategorías",
    stepReorderSubDesc:
      "Organiza y jerarquiza subcategorías dentro de este grupo para un etiquetado más ágil.",
    stepAddSubTitle: "Agregar subcategoría",
    stepAddSubDesc:
      "Agrega subcategorías detalladas dentro de este grupo para un control financiero más minucioso.",
  },
  budgetCongratulations: {
    title: "¡Primer presupuesto creado!",
    subtitle: "Gestión inteligente del gasto",
    message:
      "¡Has creado con éxito tu primer presupuesto por categoría! Controla límites de gasto, evita excesos y supervisa saldos transferibles con confianza.",
    button: "Explorar funciones de presupuesto",
  },
  budgetsWalkthrough: {
    stepEmptyCreateTitle: "Configura tu primer presupuesto",
    stepEmptyCreateDesc:
      "Toca aquí para establecer límites de gasto para cualquier categoría con periodos diarios, semanales, mensuales o acumulativos.",
    stepTotalActiveTitle: "Presupuesto activo total",
    stepTotalActiveDesc:
      "Monitorea tus límites totales presupuestados, el avance del gasto en tiempo real, el saldo restante y alertas de exceso de un vistazo.",
    stepFrequencyTabsTitle: "Filtro de frecuencia",
    stepFrequencyTabsDesc:
      "Filtra rápidamente tus presupuestos por periodo: diario, semanal, mensual, trimestral o anual.",
    stepFirstItemToggleTitle: "Activar o desactivar presupuestos",
    stepFirstItemToggleDesc:
      "Activa o desactiva cualquier presupuesto a voluntad sin perder tus transacciones previas ni la configuración.",
    stepFabTitle: "Crear presupuesto por categoría",
    stepFabDesc:
      "Toca el botón (+) en cualquier momento para fijar nuevos límites por categoría y alcanzar tus metas financieras.",
  },
  goalCongratulations: {
    title: "¡Primer objetivo creado!",
    subtitle: "Meta fijada para el éxito",
    message:
      "¡Felicitaciones por fijar tu primera meta de ahorro! Monitorea tu progreso, vincula cuentas y mantén la motivación para forjar tu futuro financiero.",
    button: "Explorar recorrido de objetivos",
  },
  goalsWalkthrough: {
    stepTotalTargetTitle: "Meta total y progreso",
    stepTotalTargetDesc:
      "Supervisa tu meta de ahorro consolidada, fondos acumulados, porcentaje de avance y el monto restante en todos tus objetivos activos.",
    stepStatusFiltersTitle: "Filtros por estado",
    stepStatusFiltersDesc:
      "Filtra fácilmente entre Todos los objetivos, metas En progreso y logros Completados con contadores en tiempo real.",
    stepFirstItemMarkCompleteTitle: "Marcar como completado",
    stepFirstItemMarkCompleteDesc:
      "Celebra alcanzar tu meta marcándola como completada, o reábrela en cualquier momento si deseas seguir ahorrando.",
    stepFabTitle: "Agregar nuevo objetivo",
    stepFabDesc:
      "Toca el botón (+) en cualquier momento para crear una nueva meta, vincular cuentas bancarias o bolsillos, fijar fechas límite y calcular el ritmo mensual necesario.",
  },
  resetData: {
    dismissAccessibility:
      "Cerrar confirmación de restablecimiento de datos",
    title: "¿Restablecer todos los datos?",
    message:
      "Esto elimina permanentemente de este dispositivo tus cuentas, transacciones, presupuestos, objetivos, notas, configuraciones, archivos adjuntos y copias locales administradas por la aplicación.",
    externalNote:
      "Los archivos ya guardados en Google Drive no se eliminan. Este dispositivo se desconecta de Google Drive y borra la configuración de Quick Sync.",
    confirmationInstruction: "Escribe KAIZEN para confirmar",
    confirmationAccessibility:
      "Escribe KAIZEN para confirmar el restablecimiento de todos los datos",
    deleteAll: "Eliminar todos los datos",
  },
  security: {
    menuTitle: "Contraseña y huella digital",
    appLockedTitle: "Kaizen Finance",
    enterPasswordToUnlock: "Ingresa tu contraseña para desbloquear la aplicación",
    enterPasswordOrBiometrics:
      "Usa %{biometric} o ingresa tu contraseña para desbloquear",
    unlockWithBiometric: "Desbloquear con %{biometric}",
    tapToScan: "Toca para escanear %{biometric}",
    passwordPlaceholder: "Ingresa contraseña",
    hidePassword: "Ocultar contraseña",
    showPassword: "Ver contraseña",
    unlockButton: "Desbloquear",
    enterPassword: "Por favor ingresa tu contraseña.",
    incorrectPassword: "Contraseña incorrecta. Inténtalo de nuevo.",
    passwordSection: "CONTRASEÑA",
    appPassword: "Contraseña de la aplicación",
    passwordIsConfigured: "Configurada · Protege el acceso a la app",
    passwordNotConfigured: "No configurada · La app está desbloqueada",
    badgeActive: "ACTIVO",
    badgeOff: "DESACTIVADO",
    setPasswordButton: "Crear contraseña",
    changePasswordButton: "Cambiar",
    removePasswordButton: "Eliminar",
    biometricSection: "DESBLOQUEO BIOMÉTRICO",
    biometricTitle: "Desbloqueo con %{biometric}",
    defaultBiometricLabel: "Biometría",
    setupPasswordToActivate: "Configura contraseña para activar",
    biometricRequiresPassword:
      "El desbloqueo biométrico requiere crear una contraseña primero.",
    biometricNoHardware:
      "El sensor biométrico no está disponible en este dispositivo",
    biometricNotEnrolled:
      "No hay huellas registradas. Regístralas en los ajustes del dispositivo",
    biometricDescription: "Desbloquea más rápido usando tu %{biometric}",
    biometricCancelledFallback:
      "Escaneo biométrico cancelado. Por favor ingresa tu contraseña para desbloquear.",
    biometricLockoutFallback:
      "Demasiados intentos biométricos. Por favor ingresa tu contraseña para desbloquear.",
    biometricFailedFallback:
      "La verificación biométrica falló. Inténtalo de nuevo o ingresa tu contraseña.",
    securityNote:
      "Tus credenciales están cifradas en este dispositivo. Cuando está activado, la aplicación se bloquea automáticamente al minimizarla.",
    setPasswordTitle: "Crear contraseña de la app",
    changePasswordTitle: "Cambiar contraseña de la app",
    removePasswordTitle: "Eliminar contraseña de la app",
    savePasswordButton: "Guardar contraseña",
    updatePasswordButton: "Actualizar contraseña",
    removePasswordWarning:
      "Eliminar tu contraseña también desactivará el desbloqueo por huella digital. La app ya no se bloqueará al abrirla.",
    currentPasswordLabel: "Contraseña actual",
    currentPasswordPlaceholder: "Ingresa contraseña actual",
    newPasswordLabel: "Nueva contraseña",
    newPasswordPlaceholder: "Ingresa nueva contraseña (mín. 4 caracteres)",
    confirmPasswordLabel: "Confirmar contraseña",
    confirmPasswordPlaceholder: "Vuelve a ingresar la nueva contraseña",
    enterCurrentPassword: "Por favor ingresa tu contraseña actual.",
    passwordMinLength: "La contraseña debe tener al menos 4 caracteres.",
    passwordsDoNotMatch: "Las contraseñas no coinciden.",
    forgotPassword: "¿Olvidaste tu contraseña?",
    forgotPasswordTitle: "¿Olvidaste tu contraseña?",
    forgotPasswordSubtitle:
      "Elige cómo deseas recuperar el acceso a Kaizen Finance.",
    biometricResetTitle: "Restablecer con %{biometric}",
    biometricResetDesc:
      "Escanea tu %{biometric} para crear una nueva contraseña sin ingresar la actual.",
    verifyBiometricToReset: "Verificar %{biometric} para restablecer",
    biometricVerifiedBadge: "%{biometric} verificada",
    verifyWithBiometricToChange:
      "¿Olvidaste la actual? Verifica con %{biometric}",
    verifyWithBiometricToRemove:
      "¿Olvidaste tu contraseña? Eliminar con %{biometric}",
    emergencyResetSectionTitle: "RECUPERACIÓN DE EMERGENCIA",
    emergencyResetTitle: "Restablecimiento de emergencia",
    emergencyResetDesc:
      "Kaizen Finance funciona 100% sin conexión. Las credenciales se guardan en este dispositivo sin recuperación por correo o nube.",
    emergencyResetWarning:
      "Esto eliminará permanentemente todas las cuentas, transacciones, presupuestos, notas y ajustes locales, y quitará el bloqueo.",
    emergencyResetButton: "Restablecer datos de la app...",
    emergencyResetConfirmTitle: "¿Restablecer todos los datos?",
    emergencyResetConfirmDesc:
      "Esto eliminará permanentemente todos tus datos financieros y quitará el bloqueo. Esta acción no se puede deshacer.",
    emergencyResetInstruction: "Escribe KAIZEN para confirmar el restablecimiento",
    emergencyResetAction: "Borrar todo y desbloquear",
    resetSuccessfulUnlocking: "Contraseña actualizada. Desbloqueando...",
    setNewPasswordTitle: "Nueva contraseña",
    setNewPasswordDesc: "Ingresa y confirma tu nueva contraseña.",
    saveAndUnlockButton: "Guardar y desbloquear",
  },
  pro: {
    badge: "PRO",
    lifetime: "De por vida",
    oneTimeOffer: "Oferta Única",
    unlockPro: "Desbloquear Pro",
    proActive: "Pro De Por Vida Activo",
    allFeaturesUnlocked: "Todas las funciones activas · Sin anuncios",
    sidebarTitle: "Finanzas Pro · De Por Vida",
    sidebarSubtitle: "Sin Anuncios · Reportes Avanzados",
    sidebarUnlockBtn: "Mejorar a Pro",
    paywallTitle: "Mejora a Kaizen Pro",
    paywallSubtitle:
      "Toma el control total de tus finanzas con acceso de por vida a análisis avanzados y una experiencia sin anuncios.",
    paywallLifetimeBadge: "PAGO ÚNICO · ACCESO DE POR VIDA",
    paywallUpgradeBtn: "Desbloquear Pro De Por Vida (%{price})",
    paywallProcessing: "Procesando...",
    restorePurchases: "Restaurar Compras",
    restoring: "Restaurando...",
    restoreSuccessTitle: "Compras Restauradas",
    restoreSuccessMsg: "¡Tu estado Pro de por vida ha sido restaurado exitosamente!",
    restoreNotFoundTitle: "Sin Compras Encontradas",
    restoreNotFoundMsg:
      "No encontramos una compra activa de Lifetime Pro para la cuenta actualmente activa en tu Google Play Store.\n\nConsejo: Las compras se vinculan a tu cuenta de Google Play Store. Si compraste con otra cuenta, abre la app de Google Play Store, cambia de cuenta en el icono de perfil y vuelve a intentar restaurar.",
    restoreErrorTitle: "Fallo al Restaurar",
    restoreErrorMsg: "No se pudieron restaurar las compras. Por favor intenta de nuevo.",
    purchaseSuccessTitle: "¡Bienvenido a Pro!",
    purchaseSuccessMsg: "¡Gracias por apoyar a Kaizen Finance! Todas las funciones Pro ya están desbloqueadas.",
    disclaimer:
      "El pago se cargará a tu cuenta de Google Play al confirmar la compra. Esta es una compra única no consumible sin tarifas recurrentes.",
    reportsLockedTitle: "Reportes y Análisis Financiero",
    reportsLockedSubtitle:
      "Desbloquea tendencias de flujo de caja, balance general, crecimiento de patrimonio neto y análisis de gastos con Kaizen Pro.",
    reportsLockedCta: "Desbloquear Acceso De Por Vida",
  },
} satisfies TranslationCatalogShape<TranslationCatalog>;
