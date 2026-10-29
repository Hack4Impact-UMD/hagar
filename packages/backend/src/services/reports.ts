import {
  canSeeView,
  MAX_REPORT_BYTES,
  nowUtc,
  reportFilePath,
  storedReport,
} from "@repo/common";
import type {
  ActiveUserProfile,
  CreateReportInput,
  GetReportInput,
  ListReportsInput,
  Report,
  StoredReport,
} from "@repo/common";
import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import {
  COLLECTION as VIEWS_COLLECTION,
  toView,
} from "@backend/services/views.ts";

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
      message: `A report must be a PDF no larger than ${MAX_REPORT_BYTES / (1024 * 1024)} MB.`,
    });
  }
}

/**
 * Lists the reports on views `actor` can see, most recently taken first. With a
 * `viewId` it lists only that view's reports, and throws `NOT_FOUND` if the view
 * is missing or not visible. No pagination.
 */
export async function listReports(
  db: Firestore,
  actor: ActiveUserProfile,
  input?: ListReportsInput,
): Promise<Report[]> {
  if (input?.viewId !== undefined) {
    const viewSnap = await db
      .collection(VIEWS_COLLECTION)
      .doc(input.viewId)
      .get();
    if (!viewSnap.exists) {
      throw reportNotFound();
    }

    const view = toView(viewSnap.id, viewSnap.data());
    if (!canSeeView(actor, view)) {
      throw reportNotFound();
    }

    const snap = await db
      .collection(COLLECTION)
      .where("viewId", "==", input.viewId)
      .orderBy("takenAt", "desc")
      .get();

    return snap.docs.map((doc) => toReport(doc.id, doc.data()));
  }

  const snap = await db.collection(COLLECTION).orderBy("takenAt", "desc").get();

  if (snap.empty) {
    return [];
  }

  const reports = snap.docs.map((doc) => toReport(doc.id, doc.data()));
  const distinctViewIds = [...new Set(reports.map((r) => r.viewId))];
  const viewRefs = distinctViewIds.map((id) =>
    db.collection(VIEWS_COLLECTION).doc(id),
  );

  const viewSnaps = await db.getAll(...viewRefs);
  const visibleViewIds = new Set<string>();

  for (const viewSnap of viewSnaps) {
    if (viewSnap.exists) {
      const view = toView(viewSnap.id, viewSnap.data());
      if (canSeeView(actor, view)) {
        visibleViewIds.add(view.viewId);
      }
    }
  }

  return reports.filter((r) => visibleViewIds.has(r.viewId));
}

/**
 * Returns one report, or throws `NOT_FOUND` if it is missing or its view is not
 * visible to the caller.
 */
export async function getReport(
  db: Firestore,
  actor: ActiveUserProfile,
  input: GetReportInput,
): Promise<Report> {
  const reportSnap = await db.collection(COLLECTION).doc(input.reportId).get();
  if (!reportSnap.exists) {
    throw reportNotFound();
  }

  const report = toReport(reportSnap.id, reportSnap.data());

  const viewSnap = await db
    .collection(VIEWS_COLLECTION)
    .doc(report.viewId)
    .get();
  if (!viewSnap.exists) {
    throw reportNotFound();
  }

  const view = toView(viewSnap.id, viewSnap.data());
  if (!canSeeView(actor, view)) {
    throw reportNotFound();
  }

  return report;
}

/**
 * Records a report of a view the actor can see, after they have uploaded its
 * PDF. The charts and the time come from the backend, not the caller. Anyone
 * who can see the view may, Viewers included.
 */
export async function createReport(
  db: Firestore,
  actor: ActiveUserProfile,
  input: CreateReportInput,
): Promise<Report> {
  const viewRef = db.collection(VIEWS_COLLECTION).doc(input.viewId);
  const initialViewSnap = await viewRef.get();
  if (!initialViewSnap.exists) {
    throw reportNotFound();
  }

  const initialView = toView(initialViewSnap.id, initialViewSnap.data());
  if (!canSeeView(actor, initialView)) {
    throw reportNotFound();
  }

  const path = reportFilePath(input.viewId, input.reportId);
  await assertUploadedReport(path);

  const reportRef = db.collection(COLLECTION).doc(input.reportId);

  return db.runTransaction(async (tx) => {
    const [viewSnap, reportSnap] = await Promise.all([
      tx.get(viewRef),
      tx.get(reportRef),
    ]);

    if (!viewSnap.exists) {
      throw reportNotFound();
    }

    const view = toView(viewSnap.id, viewSnap.data());
    if (!canSeeView(actor, view)) {
      throw reportNotFound();
    }

    if (reportSnap.exists) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A report with that id already exists.",
      });
    }

    const stored: StoredReport = {
      viewId: input.viewId,
      charts: view.charts,
      takenAt: nowUtc(),
      notes: input.notes ?? "",
      path,
    };

    tx.create(reportRef, stored);
    return toReport(input.reportId, stored);
  });
}
