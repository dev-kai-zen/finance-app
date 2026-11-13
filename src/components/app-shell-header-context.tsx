import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import { useFocusEffect } from "expo-router";

export interface HeaderWalkthroughAction {
  onStart: () => void;
  isActive?: boolean;
}

interface AppShellHeaderContextValue {
  walkthroughAction: HeaderWalkthroughAction | null;
  setWalkthroughAction: (action: HeaderWalkthroughAction | null) => void;
}

const AppShellHeaderContext = createContext<AppShellHeaderContextValue>({
  walkthroughAction: null,
  setWalkthroughAction: () => {},
});

export function AppShellHeaderProvider({ children }: PropsWithChildren) {
  const [walkthroughAction, setWalkthroughAction] =
    useState<HeaderWalkthroughAction | null>(null);

  return (
    <AppShellHeaderContext.Provider
      value={{ walkthroughAction, setWalkthroughAction }}
    >
      {children}
    </AppShellHeaderContext.Provider>
  );
}

export function useAppShellHeaderContext() {
  return useContext(AppShellHeaderContext);
}

export function useHeaderWalkthroughAction(
  action: HeaderWalkthroughAction | null,
) {
  const { setWalkthroughAction } = useAppShellHeaderContext();

  useFocusEffect(
    useCallback(() => {
      setWalkthroughAction(action);
      return () => {
        setWalkthroughAction(null);
      };
    }, [action, setWalkthroughAction]),
  );
}

