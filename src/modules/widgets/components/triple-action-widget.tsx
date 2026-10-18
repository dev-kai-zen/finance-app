import React from "react";
import {
  FlexWidget,
  TextWidget,
} from "react-native-android-widget";
import {
  QUICK_EXPENSE_DEEP_LINK,
  QUICK_INCOME_DEEP_LINK,
  QUICK_TRANSFER_DEEP_LINK,
  WIDGET_THEME,
} from "../constants/widget.constants";

export function TripleActionWidget() {
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: WIDGET_THEME.background,
        borderRadius: 20,
        borderColor: WIDGET_THEME.border,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 6,
      }}
      accessibilityLabel="Kaizen Expense, Income and Transfer Quick Actions"
    >
      {/* Expense Action Button */}
      <FlexWidget
        style={{
          flex: 1,
          height: "match_parent",
          backgroundColor: WIDGET_THEME.surface,
          borderRadius: 14,
          borderColor: WIDGET_THEME.border,
          borderWidth: 1,
          marginRight: 3,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 4,
          paddingHorizontal: 2,
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: QUICK_EXPENSE_DEEP_LINK }}
        accessibilityLabel="Record new Expense"
      >
        <FlexWidget
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: WIDGET_THEME.expenseAccent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TextWidget
            text="−"
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: "#FFFFFF",
            }}
          />
        </FlexWidget>

        <TextWidget
          text="Expense"
          style={{
            fontSize: 10,
            fontWeight: "bold",
            color: "#FFFFFF",
            marginTop: 4,
          }}
        />
      </FlexWidget>

      {/* Income Action Button */}
      <FlexWidget
        style={{
          flex: 1,
          height: "match_parent",
          backgroundColor: WIDGET_THEME.surface,
          borderRadius: 14,
          borderColor: WIDGET_THEME.border,
          borderWidth: 1,
          marginHorizontal: 2,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 4,
          paddingHorizontal: 2,
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: QUICK_INCOME_DEEP_LINK }}
        accessibilityLabel="Record new Income"
      >
        <FlexWidget
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: WIDGET_THEME.incomeAccent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TextWidget
            text="+"
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: "#FFFFFF",
            }}
          />
        </FlexWidget>

        <TextWidget
          text="Income"
          style={{
            fontSize: 10,
            fontWeight: "bold",
            color: "#FFFFFF",
            marginTop: 4,
          }}
        />
      </FlexWidget>

      {/* Transfer Action Button */}
      <FlexWidget
        style={{
          flex: 1,
          height: "match_parent",
          backgroundColor: WIDGET_THEME.surface,
          borderRadius: 14,
          borderColor: WIDGET_THEME.border,
          borderWidth: 1,
          marginLeft: 3,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 4,
          paddingHorizontal: 2,
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: QUICK_TRANSFER_DEEP_LINK }}
        accessibilityLabel="Record new Transfer"
      >
        <FlexWidget
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: WIDGET_THEME.transferAccent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TextWidget
            text="⇄"
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: "#FFFFFF",
            }}
          />
        </FlexWidget>

        <TextWidget
          text="Transfer"
          style={{
            fontSize: 10,
            fontWeight: "bold",
            color: "#FFFFFF",
            marginTop: 4,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
