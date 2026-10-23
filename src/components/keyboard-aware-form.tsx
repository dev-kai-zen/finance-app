import { forwardRef, type PropsWithChildren } from "react";
import { Platform, type ScrollView } from "react-native";
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";

export interface KeyboardAwareFormProps
  extends PropsWithChildren,
    Omit<KeyboardAwareScrollViewProps, "children"> {}

export const KeyboardAwareForm = forwardRef<ScrollView, KeyboardAwareFormProps>(
  function KeyboardAwareForm(
    {
      bottomOffset = 24,
      children,
      keyboardDismissMode = Platform.OS === "ios" ? "interactive" : "on-drag",
      keyboardShouldPersistTaps = "handled",
      mode = "insets",
      ...scrollViewProps
    },
    ref,
  ) {
    return (
      <KeyboardAwareScrollView
        ref={ref as never}
        bottomOffset={bottomOffset}
        keyboardDismissMode={keyboardDismissMode}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        mode={mode}
        {...scrollViewProps}
      >
        {children}
      </KeyboardAwareScrollView>
    );
  },
);

