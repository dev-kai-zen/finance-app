/**
 * Collects result column names from SQLite row objects.
 * Keys are merged across all rows so columns that are null/missing on the
 * first row still appear (some native bridges omit null keys per row).
 */
export function collectQueryResultColumns(
  rows: ReadonlyArray<Record<string, unknown>>,
): string[] {
  if (rows.length === 0) {
    return [];
  }

  const columns: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }

  return columns;
}
