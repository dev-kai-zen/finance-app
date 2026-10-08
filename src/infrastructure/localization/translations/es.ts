import type {
  TranslationCatalog,
  TranslationCatalogShape,
} from "@/infrastructure/localization/translations/en";

export const es = {
  common: {
    cancel: "Cancelar",
    close: "Cerrar",
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
    localBackup: "Copia de seguridad local",
    googleDriveBackup: "Copia de seguridad de Google Drive",
    language: "Idioma",
    currencySetup: "Configuración de moneda",
    menu: "MENÚ",
    openMenu: "Abrir menú de navegación",
    closeMenu: "Cerrar menú de navegación",
  },
  brand: {
    tagline: "Mejora financiera continua",
    logoAccessibility: "Logotipo de %{name}",
  },
  sync: {
    localOnly: "Solo local",
    accessibility:
      "Estado de sincronización: %{label}. Toca para abrir la configuración.",
  },
  settings: {
    languageSection: "IDIOMA",
    languageTitle: "Idioma",
    languageSystemValue: "Predeterminado del sistema · %{language}",
    languageAccessibility:
      "Idioma actual: %{language}. Toca para cambiarlo.",
    currencySection: "MONEDA Y NÚMEROS",
    currencySetup: "Configuración de moneda",
    currencySetupDescription: "Moneda, signos, decimales y colores de importes",
    currencySetupAccessibility: "Configurar la moneda y el formato numérico",
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
    dangerZone: "ZONA DE PELIGRO",
    resetData: "Restablecer datos",
    resetDataDescription:
      "Borra permanentemente todos los datos locales y comienza de nuevo.",
  },
  currency: {
    defaultCurrency: "Moneda predeterminada",
    displayCurrency: "Mostrar moneda",
    displayCurrencyDescription: "Mostrar la moneda en los importes",
    colorAmounts: "Colorear importes",
    colorAmountsDescription: "Colorear importes positivos y negativos",
    negativeNumber: "Número negativo",
    decimalDigits: "Dígitos decimales",
    decimalFormat: "Formato decimal",
    automaticFormat: "Automático · Según la región del dispositivo",
    chooseCurrency: "Moneda predeterminada",
    chooseCurrencyDescription:
      "Elige la moneda para los totales combinados y las cuentas nuevas.",
    searchCurrencies: "Buscar por nombre o código de moneda",
    noCurrenciesFound: "No hay monedas que coincidan con la búsqueda.",
    negativeNumberDescription:
      "Elige cómo se muestran los importes negativos.",
    decimalDigitsDescription:
      "Elige la cantidad de dígitos decimales de 0 a 9.",
    decimalFormatDescription:
      "Elige el formato de los separadores de miles y decimales.",
    helpTitle: "Acerca de la configuración de moneda",
    helpMessage:
      "La moneda predeterminada se usa en totales combinados y cuentas nuevas. Las cuentas existentes conservan su moneda. Las opciones de visualización no modifican los valores guardados.",
  },
  language: {
    heading: "Preferencia de idioma",
    description: "Elige el idioma para la navegación y la configuración.",
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
  resetData: {
    dismissAccessibility:
      "Cerrar confirmación de restablecimiento de datos",
    title: "¿Restablecer todos los datos?",
    message:
      "Esto elimina permanentemente de este dispositivo tus cuentas, transacciones, presupuestos, objetivos, notas, configuraciones, archivos adjuntos y copias locales administradas por la aplicación.",
    externalNote:
      "Los archivos exportados y las copias de Google Drive no se eliminarán.",
    confirmationInstruction: "Escribe KAIZEN para confirmar",
    confirmationAccessibility:
      "Escribe KAIZEN para confirmar el restablecimiento de todos los datos",
    deleteAll: "Eliminar todos los datos",
  },
} satisfies TranslationCatalogShape<TranslationCatalog>;
