const RESULT_LIMIT = 8;

/**
 * Filters views the caller can already see. The backend has no search option,
 * so the preview page does this itself and keeps the list's order.
 */
export function filterViewsByName<T extends { name: string }>(
  views: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLocaleLowerCase();
  const matched = needle
    ? views.filter((view) => view.name.toLocaleLowerCase().includes(needle))
    : [...views];
  return matched.slice(0, RESULT_LIMIT);
}
