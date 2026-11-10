import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export interface HorizontalScrollViewProps extends ScrollViewProps {
  /**
   * Whether to show the bidirectional arrows when content is scrollable.
   * Default: true
   */
  showArrows?: boolean;
  /**
   * Whether to allow showing the left arrow when scrolled past start.
   * Default: true
   */
  showLeftArrow?: boolean;
  /**
   * Whether to allow showing the right arrow when more content is hidden on right.
   * Default: true
   */
  showRightArrow?: boolean;
  /**
   * Number of pixels to scroll when an arrow is clicked.
   * Default: 160
   */
  scrollStep?: number;
  /**
   * Diameter of the circular arrow indicator button.
   * Default: 26
   */
  arrowSize?: number;
  /**
   * Size of the chevron icon inside the arrow button.
   * Default: 14
   */
  arrowIconSize?: number;
  /**
   * Distance from the left or right edge.
   * Default: 2
   */
  arrowOffset?: number;
  /**
   * Pixel threshold to determine whether content is hidden.
   * Default: 15
   */
  threshold?: number;
  /**
   * Optional custom style applied to the outer container.
   */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Optional custom style applied to the indicator button.
   */
  indicatorButtonStyle?: StyleProp<ViewStyle>;
  /**
   * Optional custom accessibility label for the left arrow.
   */
  leftAccessibilityLabel?: string;
  /**
   * Optional custom accessibility label for the right arrow.
   */
  rightAccessibilityLabel?: string;
}

export const HorizontalScrollView = memo(
  forwardRef<ScrollView, HorizontalScrollViewProps>(function HorizontalScrollView(
    {
      showArrows = true,
      showLeftArrow = true,
      showRightArrow = true,
      scrollStep = 160,
      arrowSize = 26,
      arrowIconSize = 14,
      arrowOffset = 2,
      threshold = 15,
      containerStyle,
      indicatorButtonStyle,
      leftAccessibilityLabel,
      rightAccessibilityLabel,
      showsHorizontalScrollIndicator = false,
      scrollEventThrottle = 16,
      onScroll,
      onLayout,
      onContentSizeChange,
      children,
      ...restProps
    },
    forwardedRef,
  ) {
    const theme = useAppTheme();
    const styles = useThemeStyles(createStyles);
    const { t } = useLocalization();

    const scrollViewRef = useRef<ScrollView>(null);
    useImperativeHandle(forwardedRef, () => scrollViewRef.current as ScrollView, []);

    const scrollLayoutRef = useRef({
      visibleWidth: 0,
      contentWidth: 0,
      scrollX: 0,
    });

    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkCanScroll = useCallback(
      (scrollX: number, visibleWidth: number, contentWidth: number) => {
        if (!showArrows || visibleWidth <= 0 || contentWidth <= 0) {
          setCanScrollLeft(false);
          setCanScrollRight(false);
          return;
        }

        const hasLeft = showLeftArrow && scrollX > threshold;
        const hasRight =
          showRightArrow && contentWidth - visibleWidth - scrollX > threshold;

        setCanScrollLeft((prev) => (prev !== hasLeft ? hasLeft : prev));
        setCanScrollRight((prev) => (prev !== hasRight ? hasRight : prev));
      },
      [showArrows, showLeftArrow, showRightArrow, threshold],
    );

    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollX = event.nativeEvent.contentOffset.x;
        scrollLayoutRef.current.scrollX = scrollX;
        const { visibleWidth, contentWidth } = scrollLayoutRef.current;
        checkCanScroll(scrollX, visibleWidth, contentWidth);
        onScroll?.(event);
      },
      [checkCanScroll, onScroll],
    );

    const handleLayout = useCallback(
      (event: LayoutChangeEvent) => {
        const visibleWidth = event.nativeEvent.layout.width;
        scrollLayoutRef.current.visibleWidth = visibleWidth;
        const { scrollX, contentWidth } = scrollLayoutRef.current;
        checkCanScroll(scrollX, visibleWidth, contentWidth);
        onLayout?.(event);
      },
      [checkCanScroll, onLayout],
    );

    const handleContentSizeChange = useCallback(
      (w: number, h: number) => {
        scrollLayoutRef.current.contentWidth = w;
        const { scrollX, visibleWidth } = scrollLayoutRef.current;
        checkCanScroll(scrollX, visibleWidth, w);
        onContentSizeChange?.(w, h);
      },
      [checkCanScroll, onContentSizeChange],
    );

    const handleScrollLeft = useCallback(() => {
      const { scrollX } = scrollLayoutRef.current;
      const targetX = Math.max(0, scrollX - scrollStep);
      scrollViewRef.current?.scrollTo({
        x: targetX,
        animated: true,
      });
    }, [scrollStep]);

    const handleScrollRight = useCallback(() => {
      const { scrollX, visibleWidth, contentWidth } = scrollLayoutRef.current;
      const targetX = Math.min(
        scrollX + scrollStep,
        Math.max(0, contentWidth - visibleWidth),
      );
      scrollViewRef.current?.scrollTo({
        x: targetX,
        animated: true,
      });
    }, [scrollStep]);

    return (
      <View style={[styles.container, containerStyle]}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleLayout}
          onScroll={handleScroll}
          scrollEventThrottle={scrollEventThrottle}
          showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
          {...restProps}
        >
          {children}
        </ScrollView>

        {showArrows && canScrollLeft ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.indicatorContainer,
              styles.leftIndicatorContainer,
              { left: arrowOffset },
            ]}
          >
            <Pressable
              accessibilityLabel={
                leftAccessibilityLabel ?? t("navigation.scrollLeft")
              }
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={handleScrollLeft}
              style={({ pressed }) => [
                styles.indicatorButton,
                {
                  height: arrowSize,
                  width: arrowSize,
                  borderRadius: arrowSize / 2,
                },
                indicatorButtonStyle,
                pressed && styles.indicatorButtonPressed,
              ]}
            >
              <ChevronLeft
                color={theme.colors.textSecondary}
                size={arrowIconSize}
              />
            </Pressable>
          </View>
        ) : null}

        {showArrows && canScrollRight ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.indicatorContainer,
              styles.rightIndicatorContainer,
              { right: arrowOffset },
            ]}
          >
            <Pressable
              accessibilityLabel={
                rightAccessibilityLabel ?? t("navigation.scrollRight")
              }
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={handleScrollRight}
              style={({ pressed }) => [
                styles.indicatorButton,
                {
                  height: arrowSize,
                  width: arrowSize,
                  borderRadius: arrowSize / 2,
                },
                indicatorButtonStyle,
                pressed && styles.indicatorButtonPressed,
              ]}
            >
              <ChevronRight
                color={theme.colors.textSecondary}
                size={arrowIconSize}
              />
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }),
);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      position: "relative",
    },
    indicatorContainer: {
      alignItems: "center",
      bottom: 0,
      justifyContent: "center",
      pointerEvents: "box-none",
      position: "absolute",
      top: 0,
      zIndex: 10,
    },
    leftIndicatorContainer: {
      left: 2,
    },
    rightIndicatorContainer: {
      right: 2,
    },
    indicatorButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      justifyContent: "center",
      ...theme.shadows.card,
    },
    indicatorButtonPressed: {
      backgroundColor: theme.colors.surfaceMuted,
      transform: [{ scale: 0.92 }],
    },
  });
}

