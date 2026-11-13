import { useCallback, useRef, useState, type RefObject } from "react";
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

export interface ScrollableInstance {
  scrollTo?: (options: { y?: number; x?: number; animated?: boolean }) => void;
  scrollToOffset?: (options: { offset: number; animated?: boolean }) => void;
  scrollToPosition?: (x: number, y: number, animated?: boolean) => void;
}

export interface UseScrollDownIndicatorOptions<T extends ScrollableInstance = any> {
  ref?: RefObject<T | null>;
  threshold?: number;
  scrollStep?: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  onContentSizeChange?: (w: number, h: number) => void;
}

export function useScrollDownIndicator<T extends ScrollableInstance = any>(
  options: UseScrollDownIndicatorOptions<T> = {},
) {
  const {
    ref,
    threshold = 15,
    scrollStep = 140,
    onScroll,
    onLayout,
    onContentSizeChange,
  } = options;

  const internalRef = useRef<T>(null);
  const scrollRef = ref ?? internalRef;
  const scrollLayoutRef = useRef({
    visibleHeight: 0,
    contentHeight: 0,
    scrollY: 0,
  });
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkCanScrollDown = useCallback(
    (scrollY: number, visibleHeight: number, contentHeight: number) => {
      if (visibleHeight <= 0 || contentHeight <= 0) return;
      const hasMore = contentHeight - visibleHeight - scrollY > threshold;
      setCanScrollDown((prev) => (prev !== hasMore ? hasMore : prev));
    },
    [threshold],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      scrollLayoutRef.current.scrollY = scrollY;
      const { visibleHeight, contentHeight } = scrollLayoutRef.current;
      checkCanScrollDown(scrollY, visibleHeight, contentHeight);
      onScroll?.(event);
    },
    [checkCanScrollDown, onScroll],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const visibleHeight = event.nativeEvent.layout.height;
      scrollLayoutRef.current.visibleHeight = visibleHeight;
      const { contentHeight } = scrollLayoutRef.current;
      if (visibleHeight > 0 && contentHeight > 0) {
        scrollLayoutRef.current.scrollY = Math.min(
          scrollLayoutRef.current.scrollY,
          Math.max(0, contentHeight - visibleHeight),
        );
      }
      checkCanScrollDown(
        scrollLayoutRef.current.scrollY,
        visibleHeight,
        contentHeight,
      );
      onLayout?.(event);
    },
    [checkCanScrollDown, onLayout],
  );

  const handleContentSizeChange = useCallback(
    (w: number, contentHeight: number) => {
      scrollLayoutRef.current.contentHeight = contentHeight;
      const { visibleHeight } = scrollLayoutRef.current;
      if (visibleHeight > 0 && contentHeight > 0) {
        scrollLayoutRef.current.scrollY = Math.min(
          scrollLayoutRef.current.scrollY,
          Math.max(0, contentHeight - visibleHeight),
        );
      }
      checkCanScrollDown(
        scrollLayoutRef.current.scrollY,
        visibleHeight,
        contentHeight,
      );
      onContentSizeChange?.(w, contentHeight);
    },
    [checkCanScrollDown, onContentSizeChange],
  );

  const scrollToNext = useCallback(
    (step?: number) => {
      const { scrollY, visibleHeight, contentHeight } = scrollLayoutRef.current;
      const delta =
        typeof step === "number" && Number.isFinite(step) ? step : scrollStep;
      const targetY = Math.min(
        scrollY + delta,
        Math.max(0, contentHeight - visibleHeight),
      );
      const instance = scrollRef.current;
      if (!instance) return;
      scrollLayoutRef.current.scrollY = targetY;
      checkCanScrollDown(targetY, visibleHeight, contentHeight);
      if (typeof instance.scrollTo === "function") {
        instance.scrollTo({ y: targetY, animated: true });
      } else if (typeof instance.scrollToOffset === "function") {
        instance.scrollToOffset({ offset: targetY, animated: true });
      } else if (typeof instance.scrollToPosition === "function") {
        instance.scrollToPosition(0, targetY, true);
      }
    },
    [checkCanScrollDown, scrollRef, scrollStep],
  );

  return {
    scrollRef,
    canScrollDown,
    scrollToNext,
    checkCanScrollDown,
    scrollLayoutRef,
    handleScroll,
    handleLayout,
    handleContentSizeChange,
    scrollProps: {
      onScroll: handleScroll,
      onLayout: handleLayout,
      onContentSizeChange: handleContentSizeChange,
      scrollEventThrottle: 16 as const,
    },
  };
}

