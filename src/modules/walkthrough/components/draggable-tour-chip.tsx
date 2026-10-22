import { useEffect, useRef, useState } from "react";
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

export interface DraggableTourChipProps {
  onPress: () => void;
  visible?: boolean;
}

const EDGE_MARGIN = 16;
const DEFAULT_CHIP_WIDTH = 86;
const DEFAULT_CHIP_HEIGHT = 36;

export function DraggableTourChip({
  onPress,
  visible = true,
}: DraggableTourChipProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [chipWidth, setChipWidth] = useState(DEFAULT_CHIP_WIDTH);
  const isDraggingRef = useRef(false);

  const initialX = Math.max(12, width - DEFAULT_CHIP_WIDTH - EDGE_MARGIN);
  const initialY = 12;

  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const currentPos = useRef({ x: initialX, y: initialY });
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const listenerId = pan.addListener((value) => {
      currentPos.current = value;
    });
    return () => {
      pan.removeListener(listenerId);
    };
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.hypot(gesture.dx, gesture.dy) > 4;
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = false;
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
        if (!isDraggingRef.current && Math.hypot(gesture.dx, gesture.dy) > 4) {
          isDraggingRef.current = true;
        }
        pan.x.setValue(gesture.dx);
        pan.y.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();

        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start();

        const distance = Math.hypot(gesture.dx, gesture.dy);
        if (distance < 6 && !isDraggingRef.current) {
          onPress();
          return;
        }

        // Snap to nearest screen edge (left or right)
        const snapToRight = currentPos.current.x > (width - chipWidth) / 2;
        const targetX = snapToRight
          ? width - chipWidth - EDGE_MARGIN
          : EDGE_MARGIN;

        const minY = 8;
        const maxY = Math.max(minY, height - insets.bottom - 130);
        const clampedY = Math.max(minY, Math.min(maxY, currentPos.current.y));

        Animated.spring(pan, {
          toValue: { x: targetX, y: clampedY },
          useNativeDriver: false,
          friction: 7,
          tension: 45,
        }).start();
      },
    }),
  ).current;

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      accessibilityLabel={t("dashboard.walkthroughChip")}
      accessibilityRole="button"
      onLayout={(e) => {
        const layoutWidth = e.nativeEvent.layout.width;
        if (layoutWidth > 0 && Math.abs(layoutWidth - chipWidth) > 2) {
          setChipWidth(layoutWidth);
        }
      }}
      style={[
        styles.floatingContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <View style={styles.chipInner}>
        <Sparkles color={theme.colors.primary} size={14} />
        <Text numberOfLines={1} style={styles.chipText}>
          {t("dashboard.walkthroughChip")}
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
      borderColor: `${theme.colors.primary}45`,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1.5,
      flexDirection: "row",
      gap: 6,
      height: DEFAULT_CHIP_HEIGHT,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
    },
    chipText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.2,
    },
  });
}
