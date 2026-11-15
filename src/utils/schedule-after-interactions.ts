import { InteractionManager } from "react-native";

/**
 * Defers work until after navigation transitions and gestures finish.
 */
export function scheduleAfterInteractions(callback: () => void): () => void {
  const handle = InteractionManager.runAfterInteractions(callback);
  return () => handle.cancel();
}
