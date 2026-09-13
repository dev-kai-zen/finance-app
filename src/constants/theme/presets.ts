import { lightTheme } from "./light-theme";
import { palette } from "./palette";
import type { AppTheme } from "./theme.types";

const baseSpacing = lightTheme.spacing;
const baseBorderRadius = lightTheme.borderRadius;
const baseTypography = lightTheme.typography;

const darkShadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  modal: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 10,
  },
};

export const kaizenLight: AppTheme = lightTheme;

export const kaizenEmerald: AppTheme = {
  id: "kaizen-emerald",
  name: "Kaizen Emerald",
  mode: "dark",
  colors: {
    background: "#0F121A",
    surface: "#181E2C",
    surfaceMuted: "#222B3D",
    surfaceElevated: "#2C374D",
    surfaceInverse: "#090C12",
    surfaceInverseElevated: "#121824",

    textPrimary: "#F5F7FA",
    textSecondary: "#94A3B8",
    textMuted: "#525C6E",
    textInverse: "#0F121A",
    textInverseMuted: "#8E99A8",

    border: "#283348",
    borderStrong: "#364560",

    primary: "#28C76F",
    onPrimary: "#071C10",
    accent: "#FFB020",
    onAccent: "#1F1302",

    success: "#28C76F",
    warning: "#FFB020",
    danger: "#FF5C5C",
    info: "#3898EC",

    overlay: "rgba(0, 0, 0, 0.65)",

    categorical: { ...palette.categorical },
  },
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  typography: baseTypography,
  shadows: darkShadows,
};

export const cyberAzure: AppTheme = {
  id: "cyber-azure",
  name: "Cyber Azure",
  mode: "dark",
  colors: {
    background: "#0B132B",
    surface: "#1C2541",
    surfaceMuted: "#283454",
    surfaceElevated: "#3A506B",
    surfaceInverse: "#060A17",
    surfaceInverseElevated: "#0E1833",

    textPrimary: "#F0F6FC",
    textSecondary: "#8DA0B8",
    textMuted: "#4F637A",
    textInverse: "#0B132B",
    textInverseMuted: "#7A91AD",

    border: "#2E3D5C",
    borderStrong: "#435882",

    primary: "#00B0FF",
    onPrimary: "#001B29",
    accent: "#00E676",
    onAccent: "#002412",

    success: "#00E676",
    warning: "#FFB300",
    danger: "#FF5252",
    info: "#00B0FF",

    overlay: "rgba(0, 0, 0, 0.65)",

    categorical: { ...palette.categorical },
  },
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  typography: baseTypography,
  shadows: darkShadows,
};

export const amethystGlow: AppTheme = {
  id: "amethyst-glow",
  name: "Amethyst Glow",
  mode: "dark",
  colors: {
    background: "#120B1E",
    surface: "#1E1430",
    surfaceMuted: "#2E2048",
    surfaceElevated: "#3F2D61",
    surfaceInverse: "#090510",
    surfaceInverseElevated: "#150D24",

    textPrimary: "#FBF7FF",
    textSecondary: "#A799BC",
    textMuted: "#65567A",
    textInverse: "#120B1E",
    textInverseMuted: "#9584AD",

    border: "#33224E",
    borderStrong: "#4A3370",

    primary: "#A855F7",
    onPrimary: "#1C062E",
    accent: "#F43F5E",
    onAccent: "#24040A",

    success: "#10B981",
    warning: "#F59E0B",
    danger: "#F43F5E",
    info: "#818CF8",

    overlay: "rgba(0, 0, 0, 0.65)",

    categorical: { ...palette.categorical },
  },
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  typography: baseTypography,
  shadows: darkShadows,
};

export const sunsetAmber: AppTheme = {
  id: "sunset-amber",
  name: "Sunset Amber",
  mode: "dark",
  colors: {
    background: "#1A120B",
    surface: "#2B1E12",
    surfaceMuted: "#3E2D1D",
    surfaceElevated: "#523C27",
    surfaceInverse: "#0D0905",
    surfaceInverseElevated: "#1A120B",

    textPrimary: "#FFFBEB",
    textSecondary: "#B8A089",
    textMuted: "#786350",
    textInverse: "#1A120B",
    textInverseMuted: "#A18A74",

    border: "#423020",
    borderStrong: "#5E452E",

    primary: "#F59E0B",
    onPrimary: "#241501",
    accent: "#FACC15",
    onAccent: "#241D01",

    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#38BDF8",

    overlay: "rgba(0, 0, 0, 0.65)",

    categorical: { ...palette.categorical },
  },
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  typography: baseTypography,
  shadows: darkShadows,
};

export const crimsonObsidian: AppTheme = {
  id: "crimson-obsidian",
  name: "Crimson Obsidian",
  mode: "dark",
  colors: {
    background: "#1A0D0D",
    surface: "#291414",
    surfaceMuted: "#3D1E1E",
    surfaceElevated: "#522A2A",
    surfaceInverse: "#0D0606",
    surfaceInverseElevated: "#1A0E0E",

    textPrimary: "#FEF2F2",
    textSecondary: "#B88B8B",
    textMuted: "#755252",
    textInverse: "#1A0D0D",
    textInverseMuted: "#A67878",

    border: "#422222",
    borderStrong: "#5E3131",

    primary: "#EF4444",
    onPrimary: "#260505",
    accent: "#F97316",
    onAccent: "#260E02",

    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#38BDF8",

    overlay: "rgba(0, 0, 0, 0.65)",

    categorical: { ...palette.categorical },
  },
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  typography: baseTypography,
  shadows: darkShadows,
};

export const ALL_THEME_PRESETS: AppTheme[] = [
  kaizenLight,
  kaizenEmerald,
  cyberAzure,
  amethystGlow,
  sunsetAmber,
  crimsonObsidian,
];

export const THEMES_BY_ID: Record<string, AppTheme> = {
  [kaizenLight.id]: kaizenLight,
  [kaizenEmerald.id]: kaizenEmerald,
  [cyberAzure.id]: cyberAzure,
  [amethystGlow.id]: amethystGlow,
  [sunsetAmber.id]: sunsetAmber,
  [crimsonObsidian.id]: crimsonObsidian,
};
