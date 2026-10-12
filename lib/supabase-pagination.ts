import type { PostgrestError } from "@supabase/supabase-js";

// Supabase's API returns at most 1000 rows per request by default and
// silently truncates anything larger, including explicit .limit() values.
const PAGE_SIZE = 1000;

type PageResult = { data: unknown[] | null; error: PostgrestError | null };

/**
 * Reads every row of a query by paging with .range(). The query must have a
 * deterministic order (end with a unique column) so pages do not overlap.
 * T is the caller's row shape; the untyped client cannot check it.
 */
export async function selectAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult>,
  pageSize = PAGE_SIZE
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data || []) as T[]));
    if (!data || data.length < pageSize) return rows;
  }
}

export function groupBy<T, K>(rows: T[], key: (row: T) => K) {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const value = key(row);
    const group = groups.get(value);
    if (group) group.push(row);
    else groups.set(value, [row]);
  }
  return groups;
}
