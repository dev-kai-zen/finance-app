import { AppState, Platform, type AppStateStatus } from "react-native";
import { getSecurityConfig } from "./security-state.service";

type LockStateListener = (isLocked: boolean) => void;

class AppLockLifecycleService {
  private isLocked = true;
  private lastBackgroundTime: number | null = null;
  private listeners = new Set<LockStateListener>();
  private appStateSubscription: { remove: () => void } | null = null;
  private initialized = false;

  private suspensionCount = 0;
  private suspendedUntilTimestamp = 0;
  private suspensionTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly MAX_SUSPENSION_MS = 3 * 60 * 1000; // 3 min fallback if intent crashes
  private static readonly POST_SUSPENSION_GRACE_MS = 2500; // 2.5s post-dialog grace window

  public async initialize(): Promise<boolean> {
    if (this.initialized) return this.isLocked;

    const config = await getSecurityConfig();
    this.isLocked = config.isPasswordSet;
    this.initialized = true;

    this.setupAppStateListener();
    this.notify();
    return this.isLocked;
  }

  public getIsLocked(): boolean {
    return this.isLocked;
  }

  public unlock(): void {
    if (this.isLocked) {
      this.isLocked = false;
      this.notify();
    }
  }

  public lock(): void {
    if (!this.isLocked) {
      this.isLocked = true;
      this.notify();
    }
  }

  public subscribe(listener: LockStateListener): () => void {
    this.listeners.add(listener);
    listener(this.isLocked);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Suspends auto-lock checks while executing an external OS action
   * (e.g. system Share sheet, photo picker, camera, or document picker).
   */
  public async withLockSuspended<T>(action: () => Promise<T>): Promise<T> {
    this.pauseAutoLock();
    try {
      return await action();
    } finally {
      this.resumeAutoLock();
    }
  }

  public pauseAutoLock(): void {
    this.suspensionCount += 1;

    if (!this.suspensionTimer) {
      this.suspensionTimer = setTimeout(() => {
        this.resetSuspension();
      }, AppLockLifecycleService.MAX_SUSPENSION_MS);
    }
  }

  public resumeAutoLock(): void {
    if (this.suspensionCount > 0) {
      this.suspensionCount -= 1;
    }

    if (this.suspensionCount === 0) {
      if (this.suspensionTimer) {
        clearTimeout(this.suspensionTimer);
        this.suspensionTimer = null;
      }
      this.suspendedUntilTimestamp =
        Date.now() + AppLockLifecycleService.POST_SUSPENSION_GRACE_MS;
    }
  }

  public resetSuspension(): void {
    this.suspensionCount = 0;
    this.suspendedUntilTimestamp = 0;
    if (this.suspensionTimer) {
      clearTimeout(this.suspensionTimer);
      this.suspensionTimer = null;
    }
  }

  public isSuspended(): boolean {
    return (
      this.suspensionCount > 0 || Date.now() < this.suspendedUntilTimestamp
    );
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.isLocked);
    }
  }

  private setupAppStateListener(): void {
    if (this.appStateSubscription) return;

    this.appStateSubscription = AppState.addEventListener(
      "change",
      async (nextAppState: AppStateStatus) => {
        if (nextAppState === "background") {
          this.lastBackgroundTime = Date.now();
          // If the app is genuinely backgrounded after a system modal has finished,
          // cancel the grace window so leaving the app locks as expected.
          if (this.suspensionCount === 0) {
            this.suspendedUntilTimestamp = 0;
          }
        } else if (nextAppState === "inactive") {
          // On Android, backgrounding / multi-window transitions through inactive first.
          // On iOS, inactive represents temporary interruptions (share sheets, alerts,
          // notification center, biometric prompts) that shouldn't initiate lock unless
          // followed by a real background transition.
          if (Platform.OS === "android" && this.lastBackgroundTime === null) {
            this.lastBackgroundTime = Date.now();
          }
        } else if (nextAppState === "active") {
          // If returning from an authorized system picker / share sheet, suppress locking
          if (this.isSuspended()) {
            this.lastBackgroundTime = null;
            return;
          }

          const config = await getSecurityConfig();
          if (!config.isPasswordSet) {
            this.isLocked = false;
            this.notify();
            return;
          }

          if (this.lastBackgroundTime !== null) {
            const elapsed = Date.now() - this.lastBackgroundTime;
            // If autoLockTimeout is 0 (immediate) or elapsed exceeds timeout, lock
            if (elapsed >= config.autoLockTimeoutMs) {
              this.lock();
            }
            this.lastBackgroundTime = null;
          }
        }
      },
    );
  }
}

export const appLockLifecycle = new AppLockLifecycleService();
