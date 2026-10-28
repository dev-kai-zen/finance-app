import type { ImageSourcePropType } from "react-native";
import type { TranslationKey } from "@/infrastructure/localization";
import {
  DUAL_ACTION_WIDGET_NAME,
  MONTHLY_BUDGET_WIDGET_NAME,
  MONTHLY_CASHFLOW_WIDGET_NAME,
  NET_WORTH_WIDGET_NAME,
  QUICK_EXPENSE_WIDGET_NAME,
  QUICK_INCOME_WIDGET_NAME,
  QUICK_TRANSFER_WIDGET_NAME,
  TRIPLE_ACTION_WIDGET_NAME,
} from "./widget.constants";

export type WidgetCatalogCategory = "quickActions" | "insights";

export interface WidgetCatalogItem {
  widgetName: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  sizeLabel: string;
  previewImage: ImageSourcePropType;
  isPro: boolean;
  category: WidgetCatalogCategory;
}

export const WIDGET_CATALOG: readonly WidgetCatalogItem[] = [
  {
    widgetName: QUICK_EXPENSE_WIDGET_NAME,
    titleKey: "widgetGallery.quickExpenseTitle",
    descriptionKey: "widgetGallery.quickExpenseDescription",
    sizeLabel: "1×1",
    previewImage: require("../../../../assets/quick-expense-widget-preview.png"),
    isPro: false,
    category: "quickActions",
  },
  {
    widgetName: QUICK_INCOME_WIDGET_NAME,
    titleKey: "widgetGallery.quickIncomeTitle",
    descriptionKey: "widgetGallery.quickIncomeDescription",
    sizeLabel: "1×1",
    previewImage: require("../../../../assets/quick-income-widget-preview.png"),
    isPro: false,
    category: "quickActions",
  },
  {
    widgetName: QUICK_TRANSFER_WIDGET_NAME,
    titleKey: "widgetGallery.quickTransferTitle",
    descriptionKey: "widgetGallery.quickTransferDescription",
    sizeLabel: "1×1",
    previewImage: require("../../../../assets/quick-transfer-widget-preview.png"),
    isPro: false,
    category: "quickActions",
  },
  {
    widgetName: DUAL_ACTION_WIDGET_NAME,
    titleKey: "widgetGallery.dualActionTitle",
    descriptionKey: "widgetGallery.dualActionDescription",
    sizeLabel: "2×1",
    previewImage: require("../../../../assets/dual-action-widget-preview.png"),
    isPro: false,
    category: "quickActions",
  },
  {
    widgetName: TRIPLE_ACTION_WIDGET_NAME,
    titleKey: "widgetGallery.tripleActionTitle",
    descriptionKey: "widgetGallery.tripleActionDescription",
    sizeLabel: "3×1",
    previewImage: require("../../../../assets/triple-action-widget-preview.png"),
    isPro: false,
    category: "quickActions",
  },
  {
    widgetName: MONTHLY_CASHFLOW_WIDGET_NAME,
    titleKey: "widgetGallery.monthlyCashflowTitle",
    descriptionKey: "widgetGallery.monthlyCashflowDescription",
    sizeLabel: "4×2",
    previewImage: require("../../../../assets/monthly-cashflow-widget-preview.png"),
    isPro: true,
    category: "insights",
  },
  {
    widgetName: NET_WORTH_WIDGET_NAME,
    titleKey: "widgetGallery.netWorthTitle",
    descriptionKey: "widgetGallery.netWorthDescription",
    sizeLabel: "4×2",
    previewImage: require("../../../../assets/net-worth-widget-preview.png"),
    isPro: true,
    category: "insights",
  },
  {
    widgetName: MONTHLY_BUDGET_WIDGET_NAME,
    titleKey: "widgetGallery.monthlyBudgetTitle",
    descriptionKey: "widgetGallery.monthlyBudgetDescription",
    sizeLabel: "4×2",
    previewImage: require("../../../../assets/monthly-budget-widget-preview.png"),
    isPro: true,
    category: "insights",
  },
];
