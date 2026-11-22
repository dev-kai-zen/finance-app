/** Cooperative work shared by preview preparation and candidate reads. */
export class ImportWorkCancelled extends Error {}

export interface ImportWorkOptions {
  isCancelled?: () => boolean;
  yieldControl?: () => Promise<void>;
}

export async function runImportWork<T>(work: Generator<void, T>, options?: ImportWorkOptions): Promise<T> {
  const yieldControl = options?.yieldControl ?? (() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
  try {
    while (true) {
      if (options?.isCancelled?.()) throw new ImportWorkCancelled();
      const started = performance.now();
      let result = work.next();
      let steps = 1;
      // Leave headroom for React and input handlers in an 8.3ms frame.
      while (!result.done && steps++ < 1024 && performance.now() - started < 4) result = work.next();
      if (result.done) return result.value;
      await yieldControl();
    }
  } finally {
    work.return(undefined as T);
  }
}

/** Counts plus index sums let us select a unique candidate without scanning a bucket. */
export class ImportCandidateIndex {
  private groups = new Map<string, { count: number; sum: number }>();

  add(key: string, index: number, direction = 1): void {
    const group = this.groups.get(key) ?? { count: 0, sum: 0 };
    group.count += direction;
    group.sum += (index + 1) * direction;
    this.groups.set(key, group);
  }

  get(key: string): { count: number; sum: number } {
    return this.groups.get(key) ?? { count: 0, sum: 0 };
  }
}
