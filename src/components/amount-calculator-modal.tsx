import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

export interface AmountCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (amountMinorUnits: number, formattedDecimal: string) => void;
  initialMinorUnits?: number;
  title?: string;
  currencyCode?: string;
  allowNegative?: boolean;
}

/**
 * Safely evaluates basic arithmetic expressions (+, -, *, /)
 * with full support for negative numbers and unary minus signs.
 */
function evaluateExpression(expr: string): number {
  const sanitized = expr.replace(/×/g, "*").replace(/÷/g, "/").trim();
  if (!sanitized || sanitized === "-") return 0;

  // Split into tokens: numbers and operators
  const tokens: (number | string)[] = [];
  let currentNum = "";

  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    if ((char >= "0" && char <= "9") || char === ".") {
      currentNum += char;
    } else if (["+", "-", "*", "/"].includes(char)) {
      if (currentNum !== "") {
        tokens.push(parseFloat(currentNum) || 0);
        currentNum = "";
      } else if (
        char === "-" &&
        (tokens.length === 0 || typeof tokens[tokens.length - 1] === "string")
      ) {
        // Negative sign for next number
        currentNum = "-";
        continue;
      }
      tokens.push(char);
    }
  }

  if (currentNum !== "" && currentNum !== "-") {
    tokens.push(parseFloat(currentNum) || 0);
  }

  if (tokens.length === 0) return 0;
  if (tokens.length === 1 && typeof tokens[0] === "number") return tokens[0];

  // First pass: multiplication and division
  const pass1: (number | string)[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "*" || token === "/") {
      const prev = pass1.pop() as number;
      const next = tokens[++i] as number;
      if (typeof prev === "number" && typeof next === "number") {
        pass1.push(token === "*" ? prev * next : next !== 0 ? prev / next : 0);
      } else {
        pass1.push(prev ?? 0);
      }
    } else {
      pass1.push(token);
    }
  }

  // Second pass: addition and subtraction
  let result = typeof pass1[0] === "number" ? (pass1[0] as number) : 0;
  for (let i = 1; i < pass1.length; i += 2) {
    const op = pass1[i];
    const next = pass1[i + 1] as number;
    if (typeof next === "number") {
      if (op === "+") result += next;
      if (op === "-") result -= next;
    }
  }

  return Number.isFinite(result) ? result : 0;
}

/**
 * Checks if the string contains a math operation (addition, multiplication,
 * division, or subtraction between operands) rather than a lone negative number.
 */
function isMathExpression(expr: string): boolean {
  const trimmed = expr.trim();
  if (!trimmed) return false;
  if (
    trimmed.includes("+") ||
    trimmed.includes("×") ||
    trimmed.includes("÷") ||
    trimmed.includes("*") ||
    trimmed.includes("/")
  ) {
    return true;
  }
  const withoutLeadingMinus = trimmed.startsWith("-")
    ? trimmed.slice(1).trim()
    : trimmed;
  return withoutLeadingMinus.includes("-");
}

/**
 * Toggles the positive/negative sign of the current number or operand.
 */
function toggleSign(expr: string): string {
  if (!expr || expr === "0") return "-";
  if (expr === "-") return "";
  const match = expr.match(/(-?\d+\.?\d*)$/);
  if (!match) {
    if (expr.endsWith("-")) {
      return expr.slice(0, -1).trimEnd();
    }
    return expr + "-";
  }
  const lastNumStr = match[0];
  const startIndex = match.index ?? 0;
  const prefix = expr.slice(0, startIndex);
  const toggled = lastNumStr.startsWith("-")
    ? lastNumStr.slice(1)
    : "-" + lastNumStr;
  return prefix + toggled;
}

function formatWithCommas(val: string): string {
  if (!val) return "0";
  if (val === "-") return "-";
  const isNegative = val.startsWith("-");
  const unsigned = isNegative ? val.slice(1) : val;
  const parts = unsigned.split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatted = parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
  return isNegative ? `-${formatted}` : formatted;
}

export function AmountCalculatorModal({
  visible,
  onClose,
  onConfirm,
  initialMinorUnits = 0,
  title = "Enter Amount",
  currencyCode = "PHP",
  allowNegative = true,
}: AmountCalculatorModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const styles = useThemeStyles(createStyles);

  const [expression, setExpression] = useState<string>("");

  useEffect(() => {
    if (visible) {
      if (initialMinorUnits !== 0 && initialMinorUnits !== undefined) {
        setExpression((initialMinorUnits / 100).toFixed(2));
      } else {
        setExpression("");
      }
    }
  }, [visible, initialMinorUnits]);

  const previewResult = evaluateExpression(expression);

  const handleKeyPress = (key: string) => {
    if (key === "C") {
      setExpression("");
      return;
    }

    if (key === "backspace") {
      setExpression((prev) => {
        if (!prev) return "";
        if (prev.endsWith(" ")) {
          return prev.slice(0, -3);
        }
        return prev.slice(0, -1);
      });
      return;
    }

    if (key === "±") {
      if (!allowNegative) return;
      setExpression((prev) => toggleSign(prev));
      return;
    }

    if (key === "=") {
      if (!expression || expression === "-") return;
      const res = evaluateExpression(expression);
      setExpression(res % 1 === 0 ? res.toString() : res.toFixed(2));
      return;
    }

    // Minus / Negative Sign
    if (key === "-") {
      if (!expression) {
        // Direct negative input at start
        if (!allowNegative) return;
        setExpression("-");
        return;
      }
      if (expression === "-") {
        return;
      }
      const trimmed = expression.trim();
      const lastChar = trimmed.slice(-1);
      // Preceding character is an operator (e.g. +, ×, ÷) -> negative operand
      if (["+", "×", "÷"].includes(lastChar)) {
        if (!allowNegative) return;
        setExpression((prev) => prev + " -");
        return;
      }
      if (lastChar === "-") {
        return;
      }
      setExpression((prev) => prev + " - ");
      return;
    }

    // Other Operators (+, ×, ÷)
    if (["+", "×", "÷"].includes(key)) {
      if (!expression || expression === "-") return;
      const trimmed = expression.trim();
      const lastChar = trimmed.slice(-1);
      if (["+", "-", "×", "÷"].includes(lastChar)) {
        if (expression.endsWith(" -")) {
          setExpression((prev) => prev.slice(0, -3) + " " + key + " ");
        } else {
          setExpression((prev) => prev.slice(0, -1) + key);
        }
      } else {
        setExpression((prev) => prev + " " + key + " ");
      }
      return;
    }

    // Decimal point
    if (key === ".") {
      if (!expression || expression === "-") {
        setExpression((prev) => (prev === "-" ? "-0." : "0."));
        return;
      }
      const parts = expression.split(/[\s+×÷]+|(?<=\d)-(?=\d)/);
      const current = parts[parts.length - 1];
      if (current && current.includes(".")) return;
      setExpression((prev) => (prev.endsWith(" ") ? prev + "0." : prev + "."));
      return;
    }

    // Numbers
    if (key === "00") {
      if (!expression || expression === "-" || expression.endsWith(" ")) return;
      setExpression((prev) => prev + "00");
      return;
    }

    setExpression((prev) => prev + key);
  };

  const handleConfirm = () => {
    const finalAmount = evaluateExpression(expression);
    const minorUnits = Math.round(finalAmount * 100);
    const formatted = finalAmount.toFixed(2);
    onConfirm(minorUnits, formatted);
    onClose();
  };

  const displayCurrency = currencyCode === "PHP" ? "₱" : `${currencyCode} `;
  const isMathExpr = isMathExpression(expression);
  const isNegative =
    (!isMathExpr && expression.startsWith("-")) ||
    (isMathExpr && previewResult < 0);

  let displayAmount: string;
  if (isMathExpr) {
    displayAmount = formatWithCommas(Math.abs(previewResult).toFixed(2));
  } else if (!expression || expression === "-") {
    displayAmount = "0.00";
  } else {
    const unsigned = expression.startsWith("-")
      ? expression.slice(1)
      : expression;
    displayAmount = formatWithCommas(unsigned);
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Dismiss calculator modal"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.sheetContainer,
            isDesktop && styles.sheetContainerDesktop,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable
              accessibilityLabel="Close calculator"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Amount Display Screen */}
          <View style={styles.screenContainer}>
            {isMathExpr ? (
              <Text style={styles.expressionText} numberOfLines={1}>
                {expression}
              </Text>
            ) : null}

            <View style={styles.amountHeroRow}>
              {isNegative && (
                <Text style={[styles.currencySymbol, styles.negativeSign]}>
                  -
                </Text>
              )}
              <Text style={styles.currencySymbol}>{displayCurrency}</Text>
              <Text
                style={[
                  styles.amountDisplay,
                  isNegative && styles.negativeAmountDisplay,
                ]}
                numberOfLines={1}
              >
                {displayAmount}
              </Text>
            </View>
          </View>

          {/* Keypad Grid */}
          <View style={styles.keypad}>
            {/* Row 1 */}
            <View style={styles.keypadRow}>
              <KeypadButton
                label="C"
                variant="action"
                onPress={() => handleKeyPress("C")}
              />
              <KeypadButton
                label="⌫"
                variant="action"
                onPress={() => handleKeyPress("backspace")}
              />
              <KeypadButton
                label="÷"
                variant="operator"
                onPress={() => handleKeyPress("÷")}
              />
              <KeypadButton
                label="×"
                variant="operator"
                onPress={() => handleKeyPress("×")}
              />
            </View>

            {/* Row 2 */}
            <View style={styles.keypadRow}>
              <KeypadButton label="7" onPress={() => handleKeyPress("7")} />
              <KeypadButton label="8" onPress={() => handleKeyPress("8")} />
              <KeypadButton label="9" onPress={() => handleKeyPress("9")} />
              <KeypadButton
                label="-"
                variant="operator"
                onPress={() => handleKeyPress("-")}
              />
            </View>

            {/* Row 3 */}
            <View style={styles.keypadRow}>
              <KeypadButton label="4" onPress={() => handleKeyPress("4")} />
              <KeypadButton label="5" onPress={() => handleKeyPress("5")} />
              <KeypadButton label="6" onPress={() => handleKeyPress("6")} />
              <KeypadButton
                label="+"
                variant="operator"
                onPress={() => handleKeyPress("+")}
              />
            </View>

            {/* Row 4 */}
            <View style={styles.keypadRow}>
              <KeypadButton label="1" onPress={() => handleKeyPress("1")} />
              <KeypadButton label="2" onPress={() => handleKeyPress("2")} />
              <KeypadButton label="3" onPress={() => handleKeyPress("3")} />
              <KeypadButton
                label="="
                variant="operator"
                onPress={() => handleKeyPress("=")}
              />
            </View>

            {/* Row 5 */}
            <View style={styles.keypadRow}>
              <KeypadButton
                label="±"
                variant="action"
                onPress={() => handleKeyPress("±")}
              />
              <KeypadButton label="0" onPress={() => handleKeyPress("0")} />
              <KeypadButton label="." onPress={() => handleKeyPress(".")} />
              <KeypadButton
                label="Done"
                variant="primary"
                onPress={handleConfirm}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function KeypadButton({
  label,
  onPress,
  variant = "number",
}: {
  label: string;
  onPress: () => void;
  variant?: "number" | "operator" | "action" | "primary";
}) {
  const styles = useThemeStyles(createStyles);

  const getStyle = () => {
    switch (variant) {
      case "primary":
        return styles.btnPrimary;
      case "operator":
        return styles.btnOperator;
      case "action":
        return styles.btnAction;
      default:
        return styles.btnNumber;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case "primary":
        return styles.btnPrimaryText;
      case "operator":
        return styles.btnOperatorText;
      case "action":
        return styles.btnActionText;
      default:
        return styles.btnNumberText;
    }
  };

  const getAccessibilityLabel = () => {
    if (label === "±") return "Toggle positive or negative";
    if (label === "C") return "Clear";
    if (label === "⌫") return "Backspace";
    if (label === "Done") return "Confirm amount";
    return `Calculator key ${label}`;
  };

  return (
    <Pressable
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.keyBtn,
        getStyle(),
        pressed && styles.keyBtnPressed,
      ]}
    >
      <Text style={[styles.keyBtnText, getTextStyle()]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheetContainer: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      width: "100%",
      ...theme.shadows.modal,
    },
    sheetContainerDesktop: {
      alignSelf: "center",
      borderRadius: 24,
      marginBottom: "auto",
      marginTop: "auto",
      maxWidth: 420,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    modalTitle: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    closeBtn: {
      alignItems: "center",
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    closeBtnText: {
      color: theme.colors.textMuted,
      fontSize: 16,
      fontWeight: "bold",
    },
    screenContainer: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    expressionText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontVariant: ["tabular-nums"],
      marginBottom: 2,
      textAlign: "right",
    },
    amountHeroRow: {
      alignItems: "baseline",
      flexDirection: "row",
      gap: 4,
      justifyContent: "flex-end",
    },
    currencySymbol: {
      color: theme.colors.textSecondary,
      fontSize: 24,
      fontWeight: "600",
    },
    negativeSign: {
      color: theme.colors.warning,
      fontSize: 28,
      fontWeight: "700",
      marginRight: 1,
    },
    amountDisplay: {
      color: theme.colors.textPrimary,
      fontSize: 32,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      letterSpacing: -0.5,
    },
    negativeAmountDisplay: {
      color: theme.colors.warning,
    },
    keypad: {
      gap: 10,
    },
    keypadRow: {
      flexDirection: "row",
      gap: 10,
    },
    keyBtn: {
      alignItems: "center",
      borderRadius: 12,
      flex: 1,
      height: 52,
      justifyContent: "center",
    },
    keyBtnPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.97 }],
    },
    keyBtnText: {
      fontSize: 20,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    btnNumber: {
      backgroundColor: theme.colors.surfaceElevated,
    },
    btnNumberText: {
      color: theme.colors.textPrimary,
    },
    btnAction: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    btnActionText: {
      color: theme.colors.textSecondary,
      fontSize: 17,
    },
    btnOperator: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    btnOperatorText: {
      color: theme.colors.primary,
      fontSize: 22,
      fontWeight: "700",
    },
    btnPrimary: {
      backgroundColor: theme.colors.primary,
    },
    btnPrimaryText: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
