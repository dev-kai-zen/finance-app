import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";

import { triggerTransactionAttachmentSync } from "../services/transaction-attachments.service";

const SYNC_INTERVAL_MS = 60_000;

export function TransactionAttachmentsSyncProcessor() {
  useEffect(() => {
    const runWhenOnline = () => {
      void NetInfo.fetch().then((state) => {
        if (state.isConnected) triggerTransactionAttachmentSync();
      });
    };

    runWhenOnline();
    const interval = setInterval(runWhenOnline, SYNC_INTERVAL_MS);
    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected) triggerTransactionAttachmentSync();
    });
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") runWhenOnline();
      },
    );

    return () => {
      clearInterval(interval);
      networkSubscription();
      appStateSubscription.remove();
    };
  }, []);

  return null;
}
