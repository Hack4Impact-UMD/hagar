import { MAX_REPORT_BYTES, storedReport } from "@repo/common";
import type {
  ActiveUserProfile,
  CreateReportInput,
  GetReportInput,
  ListReportsInput,
  Report,
} from "@repo/common";
import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

export const COLLECTION = "reports";

// Drops any stray fields in the document so they never reach the client.
export const parseStoredReport = storedReport.onUndeclaredKey("delete");

/** Turns a `reports/{id}` document into the shape procedures return. */
export function toReport(id: string, data: unknown): Report {
  return { reportId: id, ...parseStoredReport.assert(data) };
}

/**
 * Thrown for a report that does not exist and for one whose view the caller may
 * not see. The two look the same, so nobody can tell whether a report on a
 * private view exists.
 */
export function reportNotFound(): TRPCError {
  return new TRPCError({
    code: "NOT_FOUND",
    message: "That report does not exist.",
  });
}

/**
 * Refuses a report whose PDF isn't in Cloud Storage yet, isn't a PDF, or is over
 * the size limit. Clients upload the file themselves, so this is the only place
 * the backend learns what was actually uploaded.
 */
export async function assertUploadedReport(path: string): Promise<void> {
  const file = getStorage().bucket().file(path);

  const [exists] = await file.exists();
  if (!exists) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Upload the report PDF before recording it.",
    });
  }

  const [metadata] = await file.getMetadata();
  if (
    metadata.contentType !== "application/pdf" ||
    Number(metadata.size) > MAX_REPORT_BYTES
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A report must be a PDF no larger than 20 MB.",
    });
  }
}

/**
 * Lists the reports on views `actor` can see, most recently taken first. With a
 * `viewId` it lists only that view's reports, and throws `NOT_FOUND` if the view
 * is missing or not visible. No pagination.
 */
export function listReports(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input?: ListReportsInput,
): Promise<Report[]> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "reports.list is not implemented yet.",
  });
}

/**
 * Returns one report, or throws `NOT_FOUND` if it is missing or its view is not
 * visible to the caller.
 */
export function getReport(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: GetReportInput,
): Promise<Report> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "reports.get is not implemented yet.",
  });
}

/**
 * Records a report of a view the actor can see, after they have uploaded its
 * PDF. The charts and the time come from the backend, not the caller. Anyone
 * who can see the view may, Viewers included.
 */
export function createReport(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: CreateReportInput,
): Promise<Report> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "reports.create is not implemented yet.",
  });
}
