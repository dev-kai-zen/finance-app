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

type SetWalkthroughAction = (action: HeaderWalkthroughAction | null) => void;

const AppShellHeaderStateContext =
  createContext<HeaderWalkthroughAction | null>(null);

const AppShellHeaderDispatchContext = createContext<SetWalkthroughAction>(
  () => {},
);

export function AppShellHeaderProvider({ children }: PropsWithChildren) {
  const [walkthroughAction, setWalkthroughActionState] =
    useState<HeaderWalkthroughAction | null>(null);

  const setWalkthroughAction = useCallback<SetWalkthroughAction>((next) => {
    setWalkthroughActionState((prev) => {
      if (prev === next) return prev;
      if (
        prev &&
        next &&
        prev.onStart === next.onStart &&
        prev.isActive === next.isActive
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  return (
    <AppShellHeaderDispatchContext.Provider value={setWalkthroughAction}>
      <AppShellHeaderStateContext.Provider value={walkthroughAction}>
        {children}
      </AppShellHeaderStateContext.Provider>
    </AppShellHeaderDispatchContext.Provider>
  );
}

export function useAppShellHeaderContext() {
  const walkthroughAction = useContext(AppShellHeaderStateContext);
  const setWalkthroughAction = useContext(AppShellHeaderDispatchContext);
  return { walkthroughAction, setWalkthroughAction };
}

export function useHeaderWalkthroughAction(
  action: HeaderWalkthroughAction | null,
) {
  const setWalkthroughAction = useContext(AppShellHeaderDispatchContext);

  useFocusEffect(
    useCallback(() => {
      setWalkthroughAction(action);
      return () => {
        setWalkthroughAction(null);
      };
    }, [action, setWalkthroughAction]),
  );
}

