import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronRight } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

export interface ActionBottomSheetItem {
  id: string;
  label: string;
  description?: string;
  icon: ReactNode;
  onPress: () => void;
  selected?: boolean;
}

export interface ActionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  items: ActionBottomSheetItem[];
  title?: string;
}

export function ActionBottomSheet({
  visible,
  onClose,
  items,
  title,
}: ActionBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const styles = useThemeStyles(createStyles);
  const translateY = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const sheetHeight = useSharedValue(0);

  useEffect(() => {
    if (visible) translateY.set(0);
  }, [translateY, visible]);

  const finishDragDismiss = useCallback(() => {
    onClose();
    requestAnimationFrame(() => {
      translateY.set(0);
      dragStartY.set(0);
    });
  }, [dragStartY, onClose, translateY]);

  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .onStart(() => {
          dragStartY.set(translateY.get());
        })
        .onUpdate((event) => {
          const next = dragStartY.get() + event.translationY;
          const height = Math.max(sheetHeight.get(), 1);
          translateY.set(next >= 0 ? next : rubberband(next, height));
        })
        .onEnd((event) => {
          const height = Math.max(sheetHeight.get(), windowHeight * 0.35);
          const projected = translateY.get() + project(event.velocityY);
          if (projected > height * 0.4) {
            translateY.set(
              withSpring(
                height + insets.bottom,
                {
                  dampingRatio: 1,
                  duration: 300,
                  overshootClamping: true,
                  reduceMotion: ReduceMotion.System,
                  velocity: event.velocityY,
                },
                (finished) => {
                  if (finished) scheduleOnRN(finishDragDismiss);
                },
              ),
            );
            return;
          }
          translateY.set(
            withSpring(0, {
              dampingRatio: 0.8,
              duration: 300,
              reduceMotion: ReduceMotion.System,
              velocity: event.velocityY,
            }),
          );
        }),
    [
      dragStartY,
      insets.bottom,
      finishDragDismiss,
      sheetHeight,
      translateY,
      windowHeight,
    ],
  );

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.get(),
      [0, Math.max(sheetHeight.get(), 1)],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <GestureHandlerRootView style={styles.overlay}>
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          <Pressable
            accessibilityLabel="Close menu"
            accessibilityRole="button"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          onLayout={(event) => sheetHeight.set(event.nativeEvent.layout.height)}
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
            sheetAnimatedStyle,
          ]}
        >
          <GestureDetector gesture={dragGesture}>
            <View collapsable={false} style={styles.dragRegion}>
              <Pressable
                accessibilityHint="Drag down or double tap to close"
                accessibilityLabel="Close menu"
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 32, right: 32 }}
                onPress={onClose}
                style={styles.handleContainer}
              >
                {({ pressed }) => (
                  <View style={[styles.handle, pressed && styles.handlePressed]} />
                )}
              </Pressable>
              {title ? <Text style={styles.title}>{title}</Text> : null}
            </View>
          </GestureDetector>
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityLabel={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected: item.selected }}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              style={({ pressed }) => [
                styles.item,
                index > 0 && styles.itemBorder,
                pressed && styles.itemPressed,
              ]}
            >
              <View style={styles.itemIcon}>{item.icon}</View>
              <View style={styles.itemCopy}>
                <Text
                  style={[
                    styles.itemLabel,
                    item.selected && styles.itemLabelSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {item.description ? (
                  <Text style={styles.itemDescription}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              {item.selected ? (
                <Check color={styles.selectedColor.color} size={20} />
              ) : (
                <ChevronRight color={styles.chevronColor.color} size={18} />
              )}
            </Pressable>
          ))}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function project(velocity: number, decelerationRate = 0.998): number {
  "worklet";
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

function rubberband(
  overshoot: number,
  dimension: number,
  constant = 0.55,
): number {
  "worklet";
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.overlay,
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.large,
      borderTopRightRadius: theme.borderRadius.large,
      paddingTop: theme.spacing.sm,
      ...theme.shadows.modal,
    },
    dragRegion: {
      paddingBottom: theme.spacing.sm,
    },
    handleContainer: {
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xs,
      width: 60,
    },
    handle: {
      backgroundColor: theme.colors.border,
      borderRadius: 999,
      height: 4,
      width: 40,
    },
    handlePressed: {
      backgroundColor: theme.colors.textMuted,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      paddingHorizontal: theme.spacing.xl,
    },
    item: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 56,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
    },
    itemBorder: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
    },
    itemPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    itemIcon: {
      alignItems: "center",
      justifyContent: "center",
      width: 28,
    },
    itemLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    itemLabelSelected: {
      color: theme.colors.primary,
    },
    itemCopy: {
      flex: 1,
      gap: 2,
    },
    itemDescription: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    chevronColor: {
      color: theme.colors.textMuted,
    },
    selectedColor: {
      color: theme.colors.primary,
    },
  });
}
