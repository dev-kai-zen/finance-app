import { useCallback, useEffect, useState } from "react";
import {
  getUserNickname,
  setUserNickname as setUserNicknameService,
  subscribeToUserNickname,
} from "../services/user-profile.service";

export function useUserNickname() {
  const [nickname, setNicknameState] = useState<string | null>(() =>
    getUserNickname(),
  );

  const refresh = useCallback(() => {
    setNicknameState(getUserNickname());
  }, []);

  useEffect(() => {
    return subscribeToUserNickname(refresh);
  }, [refresh]);

  const setNickname = useCallback((name: string | null) => {
    setUserNicknameService(name);
  }, []);

  return {
    nickname,
    setNickname,
    refresh,
  };
}
