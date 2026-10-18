import React from "react";
import {
  FlexWidget,
  ImageWidget,
  TextWidget,
} from "react-native-android-widget";
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
        paddingHorizontal: 6,
        paddingVertical: 8,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderColor: WIDGET_THEME.border,
        borderWidth: 1,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: QUICK_EXPENSE_DEEP_LINK }}
      accessibilityLabel="Kaizen Quick Expense: Tap to record a new expense"
    >
      <ImageWidget
        image={require("../../../../assets/finance-app-logo.png")}
        imageWidth={40}
        imageHeight={40}
        radius={10}
      />

      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 6,
        }}
      >
        <TextWidget
          text="Quick "
          style={{
            fontSize: 11,
            fontWeight: "bold",
            color: WIDGET_THEME.textPrimary,
          }}
        />
        <FlexWidget
          style={{
            backgroundColor: WIDGET_THEME.expenseAccent,
            borderRadius: 6,
            paddingHorizontal: 5,
            paddingVertical: 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TextWidget
            text="Expense"
            style={{
              fontSize: 10,
              fontWeight: "bold",
              color: "#FFFFFF",
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
