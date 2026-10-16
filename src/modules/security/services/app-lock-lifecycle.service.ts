import { AppState, type AppStateStatus } from "react-native";
import { getSecurityConfig } from "./security-state.service";

type LockStateListener = (isLocked: boolean) => void;

class AppLockLifecycleService {
  private isLocked = true;
  private lastBackgroundTime: number | null = null;
  private listeners = new Set<LockStateListener>();
  private appStateSubscription: { remove: () => void } | null = null;
  private initialized = false;

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
        if (nextAppState === "background" || nextAppState === "inactive") {
          this.lastBackgroundTime = Date.now();
        } else if (nextAppState === "active") {
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
