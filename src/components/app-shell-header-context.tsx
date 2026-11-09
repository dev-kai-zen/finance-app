import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

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

  useEffect(() => {
    setWalkthroughAction(action);
    return () => {
      setWalkthroughAction(null);
    };
  }, [action, setWalkthroughAction]);
}

