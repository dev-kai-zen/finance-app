import { useCallback, useEffect, useState } from "react";
import {
  getShakeActionSetting,
  setShakeActionSetting,
  subscribeToShakeActionSetting,
  type ShakeAction,
} from "../services/gesture-settings.service";

export function useShakeActionSetting(): {
  shakeAction: ShakeAction;
  setShakeAction: (action: ShakeAction) => void;
} {
  const [shakeAction, setShakeActionState] = useState<ShakeAction>(() =>
    getShakeActionSetting(),
  );

  const refresh = useCallback(() => {
    setShakeActionState(getShakeActionSetting());
  }, []);

  useEffect(() => {
    return subscribeToShakeActionSetting(refresh);
  }, [refresh]);

  const updateAction = useCallback((newAction: ShakeAction) => {
    setShakeActionSetting(newAction);
    setShakeActionState(newAction);
  }, []);

  return {
    shakeAction,
    setShakeAction: updateAction,
  };
}

