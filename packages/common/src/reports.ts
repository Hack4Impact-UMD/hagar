import { type } from "arktype";
import { utcDateString } from "@common/dates.ts";
import { chartDefinition } from "@common/views.ts";

/**
 * Report PDFs live in Cloud Storage at `reports/<viewId>/<reportId>.pdf`, and
 * the report document stores that path. The view folder keeps every report of
 * a view together.
 */
export const reportPath = type(/^reports\/[^/]{1,128}\/[^/]{1,128}\.pdf$/);

export function reportFolder(viewId: string): string {
  return `reports/${viewId}/`;
}

/**
 * A snapshot of a view saved as a PDF. It is not tied to the view's current
 * state: `charts` is the view's chart list when the report was taken, so later
 * edits to the view do not change it.
 *
 * The shape stored at `reports/{reportId}`. `reportId` is the document id.
 */
export const storedReport = type({
  viewId: "string >= 1",
  charts: chartDefinition.array(),
  takenAt: utcDateString,
  notes: "string <= 10000",
  path: reportPath,
});
export type StoredReport = typeof storedReport.infer;

export const report = type({ reportId: "string >= 1" }).and(storedReport);
export type Report = typeof report.infer;
