import type { Report } from "@repo/common";

export const UNKNOWN_VIEW_NAME = "Unknown view";

/**
 * The name to show for a report. A report stores only its view's id, so the
 * name comes from the views list and is the view's current name. Every listed
 * report's view should be in that list, but a missing one must not leave the
 * row blank.
 */
export function viewNameFor(
  viewNames: ReadonlyMap<string, string>,
  viewId: string,
): string {
  return viewNames.get(viewId) ?? UNKNOWN_VIEW_NAME;
}

/**
 * The reports whose view name contains `query`, ignoring case and surrounding
 * spaces. Keeps the order of `reports`, and a blank query keeps them all.
 */
export function filterReports<T extends Pick<Report, "viewId">>(
  reports: readonly T[],
  viewNames: ReadonlyMap<string, string>,
  query: string,
): T[] {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "") return [...reports];
  return reports.filter((report) =>
    viewNameFor(viewNames, report.viewId).toLocaleLowerCase().includes(needle),
  );
}
