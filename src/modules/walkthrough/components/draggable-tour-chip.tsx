import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sparkles } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useExperiencePreferences } from "@/modules/settings/hooks/use-experience-preferences";

export type GuideChipPlacement =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface DraggableTourChipProps {
  onPress: () => void;
  visible?: boolean;
  defaultPlacement?: GuideChipPlacement;
}

const EDGE_MARGIN = 16;
const DEFAULT_CHIP_WIDTH = 86;
const DEFAULT_CHIP_HEIGHT = 36;
const GUIDE_CHIP_BORDER = "#00A3FF";
const FAB_CLEARANCE = 130;

function computePlacementPosition(
  placement: GuideChipPlacement,
  width: number,
  height: number,
  chipWidth: number,
  insets: { top: number; bottom: number },
): { x: number; y: number } {
  const minY = 8 + insets.top;
  const maxY = Math.max(minY, height - insets.bottom - FAB_CLEARANCE);
  const bottomY = Math.max(minY, maxY - DEFAULT_CHIP_HEIGHT);

  switch (placement) {
    case "top-left":
      return { x: EDGE_MARGIN, y: minY };
    case "top-right":
      return {
        x: Math.max(EDGE_MARGIN, width - chipWidth - EDGE_MARGIN),
        y: minY,
      };
    case "bottom-right":
      return {
        x: Math.max(EDGE_MARGIN, width - chipWidth - EDGE_MARGIN),
        y: bottomY,
      };
    case "bottom-left":
    default:
      return { x: EDGE_MARGIN, y: bottomY };
  }
}

export function DraggableTourChip({
  onPress,
  visible = true,
  defaultPlacement = "bottom-left",
}: DraggableTourChipProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { guideHelperEnabled } = useExperiencePreferences();

  const [chipWidth, setChipWidth] = useState(DEFAULT_CHIP_WIDTH);
  const isDraggingRef = useRef(false);
  const visibleRef = useRef(visible);
  const onPressRef = useRef(onPress);
  const layoutRef = useRef({ width, height, chipWidth, insets });

  visibleRef.current = visible;
  onPressRef.current = onPress;
  layoutRef.current = { width, height, chipWidth, insets };

  const initialPos = computePlacementPosition(
    defaultPlacement,
    width,
    height,
    DEFAULT_CHIP_WIDTH,
    insets,
  );

  const pan = useRef(new Animated.ValueXY(initialPos)).current;
  const currentPos = useRef(initialPos);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const didApplyInitialPlacement = useRef(false);

  const syncPanToPosition = useCallback(
    (pos: { x: number; y: number }) => {
      pan.stopAnimation();
      pan.flattenOffset();
      pan.setValue(pos);
      currentPos.current = pos;
    },
    [pan],
  );

  useEffect(() => {
    const listenerId = pan.addListener((value) => {
      currentPos.current = value;
    });
    return () => {
      pan.removeListener(listenerId);
    };
  }, [pan]);

  useEffect(() => {
    if (didApplyInitialPlacement.current) return;
    didApplyInitialPlacement.current = true;
    const pos = computePlacementPosition(
      defaultPlacement,
      width,
      height,
      chipWidth,
      insets,
    );
    syncPanToPosition(pos);
  }, [
    chipWidth,
    defaultPlacement,
    height,
    insets,
    syncPanToPosition,
    width,
  ]);

  useEffect(() => {
    if (visible) return;
    pan.stopAnimation();
    pan.flattenOffset();
    isDraggingRef.current = false;
  }, [pan, visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => visibleRef.current,
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (!visibleRef.current) return false;
        return Math.hypot(gesture.dx, gesture.dy) > 4;
      },
      onPanResponderGrant: () => {
        if (!visibleRef.current) return;
        isDraggingRef.current = false;
        pan.stopAnimation();
        pan.flattenOffset();
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });

        Animated.spring(scaleAnim, {
          toValue: 1.08,
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start();
      },
      onPanResponderMove: (_, gesture) => {
        if (!visibleRef.current) return;
        if (!isDraggingRef.current && Math.hypot(gesture.dx, gesture.dy) > 4) {
          isDraggingRef.current = true;
        }
        pan.x.setValue(gesture.dx);
        pan.y.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (!visibleRef.current) {
          pan.flattenOffset();
          isDraggingRef.current = false;
          return;
        }

        pan.flattenOffset();

        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start();

        const distance = Math.hypot(gesture.dx, gesture.dy);
        if (distance < 6 && !isDraggingRef.current) {
          onPressRef.current();
          return;
        }

        const { width: w, chipWidth: cw, insets: ins } = layoutRef.current;
        const screenHeight = layoutRef.current.height;

        const snapToRight = currentPos.current.x > (w - cw) / 2;
        const targetX = snapToRight ? w - cw - EDGE_MARGIN : EDGE_MARGIN;

        const minY = 8 + ins.top;
        const maxY = Math.max(minY, screenHeight - ins.bottom - FAB_CLEARANCE);
        const clampedY = Math.max(minY, Math.min(maxY, currentPos.current.y));

        Animated.spring(pan, {
          toValue: { x: targetX, y: clampedY },
          useNativeDriver: false,
          friction: 7,
          tension: 45,
        }).start();
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        isDraggingRef.current = false;
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start();
      },
    }),
  ).current;

  if (!guideHelperEnabled) {
    return null;
  }

  const chipLabel = t("dashboard.walkthroughChip");

  return (
    <Animated.View
      {...panResponder.panHandlers}
      accessibilityElementsHidden={!visible}
      accessibilityLabel={chipLabel}
      accessibilityRole="button"
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      onLayout={(e) => {
        const layoutWidth = e.nativeEvent.layout.width;
        if (layoutWidth > 0 && Math.abs(layoutWidth - chipWidth) > 2) {
          setChipWidth(layoutWidth);
        }
      }}
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.floatingContainer,
        {
          opacity: visible ? 1 : 0,
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <View style={styles.chipInner}>
        <Sparkles color={GUIDE_CHIP_BORDER} size={14} />
        <Text numberOfLines={1} style={styles.chipText}>
          {chipLabel}
        </Text>
      </View>
    </Animated.View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    floatingContainer: {
      elevation: 8,
      position: "absolute",
      top: 0,
      left: 0,
      zIndex: 999,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.16,
      shadowRadius: 6,
    },
    chipInner: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: GUIDE_CHIP_BORDER,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1.5,
      flexDirection: "row",
      gap: 6,
      height: DEFAULT_CHIP_HEIGHT,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
    },
    chipText: {
      color: GUIDE_CHIP_BORDER,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.2,
    },
  });
}
