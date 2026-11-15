import { getSafePerformance } from "./firebase-app";
import { isCrashReportsEnabled } from "./telemetry-privacy.service";

export interface ActiveTraceHandle {
  stop: () => void;
  putMetric: (name: string, value: number) => void;
  putAttribute: (name: string, value: string) => void;
}

const NOOP_TRACE: ActiveTraceHandle = {
  stop: () => {},
  putMetric: () => {},
  putAttribute: () => {},
};

/**
 * Starts a custom performance trace with safe no-op fallback.
 */
export function startPerformanceTrace(traceName: string): ActiveTraceHandle {
  if (!isCrashReportsEnabled()) {
    return NOOP_TRACE;
  }

  try {
    const perf = getSafePerformance();
    if (!perf) return NOOP_TRACE;

    const fbPerf = require("@react-native-firebase/perf");
    const t = fbPerf.trace?.(perf, traceName);
    if (!t) return NOOP_TRACE;
    t.start?.();

    return {
      stop: () => {
        try {
          t.stop?.();
        } catch {
          // Ignore trace stop errors
        }
      },
      putMetric: (name: string, value: number) => {
        try {
          t.putMetric?.(name, value);
        } catch {
          // Ignore
        }
      },
      putAttribute: (name: string, value: string) => {
        try {
          t.putAttribute?.(name, value.slice(0, 100));
        } catch {
          // Ignore
        }
      },
    };
  } catch {
    return NOOP_TRACE;
  }
}

/**
 * Executes an async action wrapped in a performance trace.
 */
export async function measureAsyncTrace<T>(
  traceName: string,
  action: () => Promise<T>,
): Promise<T> {
  const traceHandle = startPerformanceTrace(traceName);
  try {
    return await action();
  } finally {
    traceHandle.stop();
  }
}
