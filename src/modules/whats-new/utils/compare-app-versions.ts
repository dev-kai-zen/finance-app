/**
 * Compare semver strings (major.minor.patch). Returns positive if `a` is newer than `b`.
 */
export function compareSemver(a: string, b: string): number {
  const partsA = parseSemver(a);
  const partsB = parseSemver(b);

  for (let index = 0; index < 3; index += 1) {
    const diff = partsA[index] - partsB[index];
    if (diff !== 0) return diff;
  }

  return 0;
}

function parseSemver(version: string): [number, number, number] {
  const [core] = version.split("-");
  const segments = core.split(".").map((part) => Number.parseInt(part, 10));
  return [
    Number.isFinite(segments[0]) ? segments[0] : 0,
    Number.isFinite(segments[1]) ? segments[1] : 0,
    Number.isFinite(segments[2]) ? segments[2] : 0,
  ];
}
