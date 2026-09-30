import type { StyleProp, ViewStyle } from "react-native";

export type TransactionDateTimePickerMode = "date" | "time";

export interface TransactionDateTimePickerControlProps {
  mode: TransactionDateTimePickerMode;
  onValueChange: (value: Date) => void;
  style?: StyleProp<ViewStyle>;
  value: Date;
}
