import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  LinearTransition,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  ArrowDownAZ,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { FullScreenFormModal } from "./full-screen-form-modal";
import { IconHelper } from "./icon-helper";

const ROW_REORDER_LAYOUT = LinearTransition.duration(180).reduceMotion(
  ReduceMotion.System,
);

export interface SortableItem {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

export interface SortableListModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: SortableItem[];
  onSave: (orderedIds: string[]) => Promise<void> | void;
  showAlphabetizeAction?: boolean;
}

export function SortableListModal({
  visible,
  onClose,
  title,
  items: initialItems,
  onSave,
  showAlphabetizeAction = true,
}: SortableListModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [items, setItems] = useState<SortableItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [rowHeight, setRowHeight] = useState(0);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const activeIndex = useSharedValue(-1);
  const destinationIndex = useSharedValue(-1);
  const dragTranslationY = useSharedValue(0);
  const pendingDropReset = useRef(false);

  useEffect(() => {
    if (visible) {
      setItems([...initialItems]);
      setRowHeight(0);
      setDraggingItemId(null);
      activeIndex.set(-1);
      destinationIndex.set(-1);
      dragTranslationY.set(0);
    }
  }, [
    activeIndex,
    destinationIndex,
    dragTranslationY,
    visible,
    initialItems,
  ]);

  useLayoutEffect(() => {
    if (!pendingDropReset.current) return;
    pendingDropReset.current = false;
    activeIndex.set(-1);
    destinationIndex.set(-1);
    dragTranslationY.set(0);
    setDraggingItemId(null);
  }, [activeIndex, destinationIndex, dragTranslationY, items]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setItems((current) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        fromIndex >= current.length ||
        toIndex < 0 ||
        toIndex >= current.length
      ) {
        return current;
      }
      const updated = [...current];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  const moveItemById = useCallback((id: string, toIndex: number) => {
    pendingDropReset.current = true;
    setItems((current) => {
      const fromIndex = current.findIndex((item) => item.id === id);
      if (
        fromIndex < 0 ||
        fromIndex === toIndex ||
        toIndex < 0 ||
        toIndex >= current.length
      ) {
        return current;
      }
      const updated = [...current];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  const finishCancelledDrag = useCallback(() => {
    setDraggingItemId(null);
  }, []);

  const measureRow = useCallback((event: LayoutChangeEvent) => {
    const measuredHeight = event.nativeEvent.layout.height;
    setRowHeight((current) => current || measuredHeight);
  }, []);

  const sortAlphabetically = () => {
    const sorted = [...items].sort((a, b) => {
      const aIsOther = a.name.toLowerCase().startsWith("other");
      const bIsOther = b.name.toLowerCase().startsWith("other");
      if (aIsOther && !bIsOther) return 1;
      if (!aIsOther && bIsOther) return -1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    setItems(sorted);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(items.map((i) => i.id));
      onClose();
    } catch {
      // Error handled upstream
    } finally {
      setSaving(false);
    }
  };

  return (
    <FullScreenFormModal
      pending={saving}
      saveLabel="Save order"
      title={title}
      visible={visible}
      onClose={onClose}
      onSave={() => {
        void handleSave();
      }}
    >
      <GestureHandlerRootView style={styles.scrollArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollArea}
        >
          <Text style={styles.instructionText}>
            Press and hold a row, then drag it up or down. You can also use the
            arrow buttons or Sort A-Z. Then tap the save icon.
          </Text>

          {showAlphabetizeAction && items.length > 1 ? (
            <Pressable
              accessibilityLabel="Sort A-Z"
              accessibilityRole="button"
              disabled={saving}
              onPress={sortAlphabetically}
              style={[styles.azBtn, saving && styles.azBtnDisabled]}
            >
              <ArrowDownAZ color={theme.colors.primary} size={15} />
              <Text style={styles.azBtnText}>Sort A-Z</Text>
            </Pressable>
          ) : null}

          {items.map((item, index) => (
            <SortableRow
              key={item.id}
              activeIndex={activeIndex}
              destinationIndex={destinationIndex}
              disabled={saving}
              dragTranslationY={dragTranslationY}
              index={index}
              item={item}
              itemCount={items.length}
              layoutEnabled={draggingItemId === null}
              onCancelDrag={finishCancelledDrag}
              onDragStart={setDraggingItemId}
              onDrop={moveItemById}
              onMeasure={index === 0 ? measureRow : undefined}
              onMove={moveItem}
              rowStep={rowHeight > 0 ? rowHeight + theme.spacing.xs : 0}
            />
          ))}
        </ScrollView>
      </GestureHandlerRootView>
    </FullScreenFormModal>
  );
}

function SortableRow({
  activeIndex,
  destinationIndex,
  disabled,
  dragTranslationY,
  index,
  item,
  itemCount,
  layoutEnabled,
  onCancelDrag,
  onDragStart,
  onDrop,
  onMeasure,
  onMove,
  rowStep,
}: {
  activeIndex: SharedValue<number>;
  destinationIndex: SharedValue<number>;
  disabled: boolean;
  dragTranslationY: SharedValue<number>;
  index: number;
  item: SortableItem;
  itemCount: number;
  layoutEnabled: boolean;
  onCancelDrag: () => void;
  onDragStart: (id: string) => void;
  onDrop: (id: string, toIndex: number) => void;
  onMeasure?: (event: LayoutChangeEvent) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  rowStep: number;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled && rowStep > 0)
        .activateAfterLongPress(250)
        .onStart(() => {
          activeIndex.set(index);
          destinationIndex.set(index);
          dragTranslationY.set(0);
          scheduleOnRN(onDragStart, item.id);
        })
        .onUpdate((event) => {
          const minimum = -index * rowStep;
          const maximum = (itemCount - index - 1) * rowStep;
          const translation = Math.max(
            minimum,
            Math.min(maximum, event.translationY),
          );
          dragTranslationY.set(translation);
          destinationIndex.set(
            Math.max(
              0,
              Math.min(
                itemCount - 1,
                index + Math.round(translation / rowStep),
              ),
            ),
          );
        })
        .onEnd((event) => {
          const targetIndex = destinationIndex.get();
          const targetOffset = (targetIndex - index) * rowStep;
          dragTranslationY.set(
            withSpring(
              targetOffset,
              {
                dampingRatio: 1,
                duration: 300,
                overshootClamping: true,
                reduceMotion: ReduceMotion.System,
                velocity: event.velocityY,
              },
              (finished) => {
                if (!finished) return;
                if (targetIndex !== index) {
                  scheduleOnRN(onDrop, item.id, targetIndex);
                  return;
                }
                activeIndex.set(-1);
                destinationIndex.set(-1);
                dragTranslationY.set(0);
                scheduleOnRN(onCancelDrag);
              },
            ),
          );
        })
        .onFinalize((_event, success) => {
          if (success) return;
          dragTranslationY.set(
            withSpring(
              0,
              {
                dampingRatio: 0.8,
                duration: 300,
                reduceMotion: ReduceMotion.System,
              },
              (finished) => {
                if (!finished) return;
                activeIndex.set(-1);
                destinationIndex.set(-1);
                scheduleOnRN(onCancelDrag);
              },
            ),
          );
        }),
    [
      activeIndex,
      destinationIndex,
      disabled,
      dragTranslationY,
      index,
      item.id,
      itemCount,
      onCancelDrag,
      onDragStart,
      onDrop,
      rowStep,
    ],
  );

  const dragStyle = useAnimatedStyle(() => {
    const source = activeIndex.get();
    const destination = destinationIndex.get();
    const isDraggedRow = source === index;
    let insertionOffset = 0;

    if (source < destination && index > source && index <= destination) {
      insertionOffset = -rowStep;
    } else if (
      destination < source &&
      index >= destination &&
      index < source
    ) {
      insertionOffset = rowStep;
    }

    return {
      opacity: isDraggedRow ? 0.94 : 1,
      transform: [
        {
          translateY: isDraggedRow
            ? dragTranslationY.get()
            : withSpring(insertionOffset, {
                dampingRatio: 1,
                duration: 300,
                overshootClamping: true,
                reduceMotion: ReduceMotion.System,
              }),
        },
      ],
      zIndex: isDraggedRow ? 10 : 0,
    };
  });

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View
        accessibilityHint="Press and hold, then drag up or down to reorder"
        accessibilityLabel={`${item.name}, position ${index + 1} of ${itemCount}`}
        layout={layoutEnabled ? ROW_REORDER_LAYOUT : undefined}
        onLayout={onMeasure}
        style={[styles.itemRow, dragStyle]}
      >
        <GripVertical
          color={theme.colors.textMuted}
          size={18}
          style={styles.gripIcon}
        />

        {item.icon ? (
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: item.color
                  ? `${item.color}25`
                  : `${theme.colors.primary}25`,
              },
            ]}
          >
            <IconHelper
              color={item.color ?? theme.colors.primary}
              name={item.icon}
              size={16}
            />
          </View>
        ) : null}

        <Text numberOfLines={1} style={styles.itemNameText}>
          {item.name}
        </Text>

        <Text style={styles.positionText}>{index + 1}</Text>

        <TouchableOpacity
          accessibilityLabel={`Move up ${item.name}`}
          disabled={disabled || index === 0}
          onPress={() => onMove(index, index - 1)}
          style={[
            styles.arrowBtn,
            (disabled || index === 0) && styles.arrowBtnDisabled,
          ]}
        >
          <ChevronUp
            color={
              disabled || index === 0
                ? theme.colors.textMuted
                : theme.colors.primary
            }
            size={18}
          />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel={`Move down ${item.name}`}
          disabled={disabled || index === itemCount - 1}
          onPress={() => onMove(index, index + 1)}
          style={[
            styles.arrowBtn,
            (disabled || index === itemCount - 1) && styles.arrowBtnDisabled,
          ]}
        >
          <ChevronDown
            color={
              disabled || index === itemCount - 1
                ? theme.colors.textMuted
                : theme.colors.primary
            }
            size={18}
          />
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    azBtn: {
      alignSelf: "flex-start",
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: `${theme.colors.primary}35`,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
    },
    azBtnDisabled: {
      opacity: 0.5,
    },
    azBtnText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.bold,
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      gap: theme.spacing.xs,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    instructionText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      marginBottom: theme.spacing.xs,
    },
    itemRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    gripIcon: {
      marginRight: theme.spacing.sm,
    },
    iconWrap: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      height: 30,
      justifyContent: "center",
      marginRight: theme.spacing.sm,
      width: 30,
    },
    itemNameText: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    positionText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.medium,
      marginRight: theme.spacing.sm,
    },
    arrowBtn: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      height: 32,
      justifyContent: "center",
      marginLeft: 2,
      width: 32,
    },
    arrowBtnDisabled: {
      opacity: 0.25,
    },
  });
}
