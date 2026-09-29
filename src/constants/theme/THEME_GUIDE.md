# Application Theme & UI Styling Guide

This guide establishes the styling rules and design token usage conventions for all UI development in this application.

---

## 1. Core Rules for Future UI Code

1. **Use Semantic Theme Tokens**:
   Never use hard-coded raw hex colors (`#11231E`, `#FFFFFF`, `#D4FA66`, etc.) in screens or components. Always consume semantic tokens from `theme.colors` (e.g. `theme.colors.primary`, `theme.colors.surface`, `theme.colors.textPrimary`).

2. **Use Shared Spacing & Radius Scales**:
   - Spacing: Use `theme.spacing` (`xs: 4`, `sm: 8`, `md: 12`, `lg: 16`, `xl: 24`, `xxl: 32`).
   - Radii: Use `theme.borderRadius` (`small: 4`, `medium: 8`, `large: 12`, `round: 9999`).

3. **Use Shared Typography**:
   - Font sizes: `theme.typography.fontSize` (`xs` through `display`).
   - Font weights: `theme.typography.fontWeight` (`regular`, `medium`, `semibold`, `bold`).

4. **Separate Semantic Colors from Categorical Colors**:
   - Semantic tokens (`background`, `surface`, `textPrimary`, `border`, `primary`, etc.) control application UI hierarchy and respond to light/dark themes.
   - Categorical colors (`theme.colors.categorical`) are reserved exclusively for domain entities: charts, category indicators, tags, and account types. Never use categorical colors as general UI background or text colors.

5. **Theme State in React Context and Device Preferences**:
   The resolved theme belongs in `AppThemeProvider`. Persist only the user's `ThemeSelection` through `expo-sqlite/kv-store`; never store theme preferences in the Drizzle business tables used for accounts, categories, and transactions.

6. **Do Not Add Premature One-Off Tokens**:
   Use the existing foundational scales. Only add new tokens to `AppTheme` when an app-wide design pattern genuinely requires them.

7. **Promote Reusable Components Strictly When Needed**:
   Keep feature-specific UI inside `src/modules/<feature>/components/`. Only promote a component to `src/components/` once it is reused across multiple unrelated modules.

8. **Treat System Appearance as a Selection Mode**:
   `Follow device appearance` is not a color palette. It resolves to Paper for light mode and Ink for dark mode. Explicit palette selections override native appearance so alerts, pickers, status-bar content, and application surfaces agree.

---

## 2. Theme Architecture

```text
ThemeSelection (system or preset ID)
    |
    v
theme-registry.ts
    |
    v
AppThemeProvider
    |
    v
useAppTheme / useThemeStyles
    |
    v
Shared components and feature screens
```

- `foundations.ts` owns spacing, typography, radii, and shadows shared by every palette.
- `presets.ts` owns all semantic palettes: Paper, Ink, Contrast, Midnight,
  Cobalt, Graphite, Tide, Lavender, Moss, Blush, Clay, and Dune.
- `theme-registry.ts` owns ordering, lookup, fallbacks, and system light/dark mappings.
- `theme-preference.storage.ts` persists the small preference object outside the domain database.
- `AppButton` maps interaction variants to semantic control colors.
- The settings module owns the theme picker and its finance-specific preview cards.

---

## 3. Standard Component Styling Pattern

Use `useThemeStyles` with a typed style factory function to ensure styles are memoized and only recalculated if the theme changes:

```tsx
import { StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

export function TransactionCard() {
  const styles = useThemeStyles(createStyles);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Card Content</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
```

---

## 4. Handling Domain Colors (e.g. `account_types.color`)

The `account_types` table includes an optional `color: text("color")` column.

* **Convention**: In future UI work, values stored in `account_types.color` should be treated as **Categorical Color Keys** (e.g. `'blue'`, `'teal'`, `'green'`, `'purple'`) mapped to `theme.colors.categorical[key]`, with fallback to a default categorical color if an arbitrary hex string is supplied.
* **Why**: This ensures custom account-type badges remain legible, harmonious with the active palette, and accessible across light and dark modes.
