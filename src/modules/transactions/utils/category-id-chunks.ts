/** Deduplicate IDs before chunking so repeated filters never double-count totals. */
export function* categoryIdChunks(
  categoryIds?: string[],
): Generator<string[] | undefined> {
  if (!categoryIds) {
    yield undefined;
    return;
  }
  const uniqueIds = [...new Set(categoryIds)];
  for (let offset = 0; offset < uniqueIds.length; offset += 500) {
    yield uniqueIds.slice(offset, offset + 500);
  }
}
