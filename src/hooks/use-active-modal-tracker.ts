import { useEffect, useState } from "react";

type ModalCountListener = (count: number) => void;

let activeModalCount = 0;
const listeners = new Set<ModalCountListener>();

export function registerActiveModal(): () => void {
  activeModalCount += 1;
  listeners.forEach((listener) => listener(activeModalCount));
  let released = false;

  return () => {
    if (!released) {
      released = true;
      activeModalCount = Math.max(0, activeModalCount - 1);
      listeners.forEach((listener) => listener(activeModalCount));
    }
  };
}

export function getActiveModalCount(): number {
  return activeModalCount;
}

export function subscribeActiveModalCount(listener: ModalCountListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Registers a modal as actively open when `active` is true.
 * When `active` transitions to false or unmounts, automatically releases.
 */
export function useRegisterActiveModal(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const release = registerActiveModal();
    return release;
  }, [active]);
}

/**
 * Returns true if any registered modal is currently active on screen.
 */
export function useIsAnyModalActive(): boolean {
  const [isActive, setIsActive] = useState(() => activeModalCount > 0);

  useEffect(() => {
    return subscribeActiveModalCount((count) => {
      setIsActive(count > 0);
    });
  }, []);

  return isActive;
}

