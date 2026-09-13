import React from "react";
import * as LucideIcons from "lucide-react-native";
import { useAppTheme } from "@/hooks/use-app-theme";

export interface IconHelperProps {
  name?: string | null;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// Common icon aliases to map friendly / legacy icon names to Lucide components
const ICON_ALIASES: Record<string, string> = {
  home: "House",
  palmtree: "TreePalm",
  train: "TrainFront",
  "parking-circle": "CircleParking",
  "parking-square": "SquareParking",
  volcano: "Mountain",
  "globe-2": "Globe",
  waves: "WavesHorizontal",
  fingerprint: "FingerprintPattern",
  pills: "Pill",
  smile: "FaceSlightlySmiling",
  unlock: "LockOpen",
  sliders: "SlidersHorizontal",
  "check-circle-2": "CircleCheckBig",
  "alert-circle": "CircleAlert",
  "alert-triangle": "TriangleAlert",
  "help-circle": "CircleHelp",
  grid: "LayoutGrid",
  dashboard: "LayoutDashboard",
};

function toPascalCase(str: string): string {
  return str
    .split(/[-_ ]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

export const IconHelper: React.FC<IconHelperProps> = ({
  name = "tag",
  size = 20,
  color,
  strokeWidth = 2,
}) => {
  const theme = useAppTheme();
  const iconColor = color ?? theme.colors.textPrimary;

  if (!name) {
    return <LucideIcons.Tag color={iconColor} size={size} strokeWidth={strokeWidth} />;
  }

  const normalized = name.toLowerCase().trim();
  const alias = ICON_ALIASES[normalized] || ICON_ALIASES[name];
  const pascalName = alias || toPascalCase(name);
  const IconComponent =
    (LucideIcons as Record<string, any>)[pascalName] ||
    (LucideIcons as Record<string, any>)[name] ||
    LucideIcons.Tag;

  return <IconComponent color={iconColor} size={size} strokeWidth={strokeWidth} />;
};
