import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import {
  QUICK_EXPENSE_DEEP_LINK,
  WIDGET_THEME,
} from "../constants/widget.constants";

export function QuickExpenseWidget() {
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: WIDGET_THEME.background,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderColor: WIDGET_THEME.border,
        borderWidth: 1,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: QUICK_EXPENSE_DEEP_LINK }}
      accessibilityLabel="Kaizen Quick Expense: Tap to record a new expense"
    >
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <FlexWidget
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: WIDGET_THEME.expenseBadgeBg,
            borderColor: WIDGET_THEME.expenseBadgeBorder,
            borderWidth: 1,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <TextWidget
            text="−"
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: WIDGET_THEME.expenseAccent,
              textAlign: "center",
            }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <TextWidget
            text="Quick Expense"
            style={{
              fontSize: 15,
              fontWeight: "bold",
              color: WIDGET_THEME.textPrimary,
            }}
          />
          <TextWidget
            text="Kaizen Finance"
            style={{
              fontSize: 11,
              color: WIDGET_THEME.textSecondary,
              marginTop: 2,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget
        style={{
          backgroundColor: WIDGET_THEME.expenseAccent,
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 6,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TextWidget
          text="+ Expense"
          style={{
            fontSize: 12,
            fontWeight: "bold",
            color: "#FFFFFF",
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
