function resolveBrandLogo() {
  try {
    return require("../../assets/kaizen-finance-app-logo.png");
  } catch {
    return null;
  }
}

export const APP_BRAND = {
  name: "Kaizen Finance",
  tagline: "Continuous financial improvement",
  logo: resolveBrandLogo(),
} as const;
