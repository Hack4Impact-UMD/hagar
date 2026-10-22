import { type } from "arktype";
import { utcDateString } from "@common/dates.ts";
import { chartDefinition } from "@common/views.ts";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * Report PDFs live in Cloud Storage at `reports/<viewId>/<reportId>.pdf`, and
 * the report document stores that path. The client picks the `reportId` (a
 * UUID) and uploads the PDF there first, then asks the backend to record it, so
 * the file name is also the id of the report document. The view folder keeps
 * every report of a view together.
 */
export const reportPath = type(
  new RegExp(`^reports/[^/]{1,128}/${UUID}\\.pdf$`),
);

/** What the client generates for a new report. */
export const reportUuid = type(new RegExp(`^${UUID}$`));

/** Keep in step with the size limit in `storage.rules`. */
export const MAX_REPORT_BYTES = 200 * 1024 * 1024;

export function reportFolder(viewId: string): string {
  return `reports/${viewId}/`;
}

export function reportFilePath(viewId: string, reportId: string): string {
  return `${reportFolder(viewId)}${reportId}.pdf`;
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

// Every procedure input rejects undeclared keys. ArkType passes them through
// by default, which would let a caller send fields like `charts` or `takenAt`
// along. Both come from the backend, so a report can't be forged.
export const getReportInput = type({ reportId: "string >= 1" }).onUndeclaredKey(
  "reject",
);
export type GetReportInput = typeof getReportInput.infer;

/** With a `viewId`, lists that view's reports. Without one, lists them all. */
export const listReportsInput = type({ "viewId?": "string >= 1" })
  .onUndeclaredKey("reject")
  .or("undefined");
export type ListReportsInput = typeof listReportsInput.infer;

/**
 * Records a report whose PDF the caller has already uploaded to
 * `reportFilePath(viewId, reportId)`.
 */
export const createReportInput = type({
  viewId: "string >= 1",
  reportId: reportUuid,
  "notes?": "string <= 10000",
}).onUndeclaredKey("reject");
export type CreateReportInput = typeof createReportInput.infer;
