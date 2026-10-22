import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import type { LayoutRect, WalkthroughTargetId } from "../types/walkthrough.types";

interface WalkthroughRegistryContextValue {
  registerTarget: (
    id: WalkthroughTargetId,
    ref: React.RefObject<View | null> | null,
  ) => void;
  measureTarget: (id: WalkthroughTargetId) => Promise<LayoutRect | null>;
}

export const WalkthroughRegistryContext =
  createContext<WalkthroughRegistryContextValue | null>(null);

export function WalkthroughRegistryProvider({ children }: PropsWithChildren) {
  const targetsRef = useRef<
    Partial<Record<WalkthroughTargetId, React.RefObject<View | null>>>
  >({});

  const registerTarget = useCallback(
    (id: WalkthroughTargetId, ref: React.RefObject<View | null> | null) => {
      if (ref) {
        targetsRef.current[id] = ref;
      } else {
        delete targetsRef.current[id];
      }
    },
    [],
  );

  const measureTarget = useCallback(
    (id: WalkthroughTargetId): Promise<LayoutRect | null> => {
      return new Promise((resolve) => {
        const targetRef = targetsRef.current[id];
        if (!targetRef?.current) {
          resolve(null);
          return;
        }

        targetRef.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            resolve({ x, y, width, height });
          } else {
            // Re-attempt after short layout delay
            setTimeout(() => {
              targetRef.current?.measureInWindow((rx, ry, rwidth, rheight) => {
                if (rwidth > 0 && rheight > 0) {
                  resolve({ x: rx, y: ry, width: rwidth, height: rheight });
                } else {
                  resolve(null);
                }
              });
            }, 80);
          }
        });
      });
    },
    [],
  );

  return (
    <WalkthroughRegistryContext.Provider
      value={{ registerTarget, measureTarget }}
    >
      {children}
    </WalkthroughRegistryContext.Provider>
  );
}

export function useWalkthroughRegistry() {
  const ctx = useContext(WalkthroughRegistryContext);
  if (!ctx) {
    throw new Error(
      "useWalkthroughRegistry must be used within a WalkthroughRegistryProvider",
    );
  }
  return ctx;
}

/**
 * Hook to directly attach a ref to any component for precision walkthrough measurement.
 */
export function useWalkthroughTarget(id: WalkthroughTargetId) {
  const { registerTarget } = useWalkthroughRegistry();
  const ref = useRef<View>(null);

  useEffect(() => {
    registerTarget(id, ref);
    return () => registerTarget(id, null);
  }, [id, registerTarget]);

  return ref;
}

export interface WalkthroughTargetProps {
  id: WalkthroughTargetId;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function WalkthroughTarget({
  id,
  children,
  style,
}: WalkthroughTargetProps) {
  const internalRef = useWalkthroughTarget(id);

  return (
    <View ref={internalRef} collapsable={false} style={style}>
      {children}
    </View>
  );
}
