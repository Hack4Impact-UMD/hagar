import { MAX_REPORT_BYTES, reportFilePath } from "@repo/common";
import type {
  ActiveUserProfile,
  StoredReport,
  StoredView,
  UserRole,
} from "@repo/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeFirestore } from "@backend/testing/fakeFirestore.ts";
import {
  assertUploadedReport,
  createReport,
  getReport,
  listReports,
  reportNotFound,
  toReport,
} from "@backend/services/reports.ts";

type FileMetadata = { contentType?: string; size?: string | number };
const bucket = vi.hoisted(() => {
  const file = {
    exists: vi.fn<() => Promise<[boolean]>>(),
    getMetadata: vi.fn<() => Promise<[FileMetadata]>>(),
  };
  return { file, fileAt: vi.fn<(path: string) => typeof file>(() => file) };
});
vi.mock("firebase-admin/storage", () => ({
  getStorage: () => ({ bucket: () => ({ file: bucket.fileAt }) }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // By default the client has uploaded a small PDF.
  bucket.file.exists.mockResolvedValue([true]);
  bucket.file.getMetadata.mockResolvedValue([
    { contentType: "application/pdf", size: "1234" },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

const NOW = "2024-06-01T00:00:00.000Z";

/** A report id the way a client would make one. */
function id(n: number) {
  return `00000000-0000-4000-8000-00000000000${n}`;
}

function view(
  authorUid: string,
  shareOption: StoredView["shareOption"],
  chartNames: string[],
): StoredView {
  return {
    name: `${authorUid}'s ${shareOption} view`,
    authorUid,
    shareOption,
    charts: chartNames.map((name) => ({ name })),
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

const VIEWS: Record<string, StoredView> = {
  ownerPrivate: view("owner", "PRIVATE", ["Open rate"]),
  ownerShared: view("owner", "ANYONE_VIEW", ["Open rate", "Clicks"]),
  otherPrivate: view("other", "PRIVATE", ["Bounces"]),
};

function report(n: number, viewId: string, takenAt: string): StoredReport {
  return {
    viewId,
    // What the view showed when the report was taken, which is not what it
    // shows now.
    charts: [{ name: "Snapshot chart" }],
    takenAt,
    notes: `Report ${n}`,
    path: reportFilePath(viewId, id(n)),
  };
}

// Listed oldest first, so `takenAt` follows this order. The last report's view
// has since been removed.
const REPORTS: Record<string, StoredReport> = {
  [id(1)]: report(1, "ownerPrivate", "2024-01-01T00:00:00.000Z"),
  [id(2)]: report(2, "ownerShared", "2024-02-01T00:00:00.000Z"),
  [id(3)]: report(3, "otherPrivate", "2024-03-01T00:00:00.000Z"),
  [id(4)]: report(4, "ownerShared", "2024-04-01T00:00:00.000Z"),
  [id(5)]: report(5, "gone", "2024-05-01T00:00:00.000Z"),
};

function seeded() {
  return fakeFirestore({ views: VIEWS, reports: REPORTS });
}

/** The profile the middleware would hand the service. */
function actor(uid: string, role: UserRole = "Local Admin"): ActiveUserProfile {
  return {
    uid,
    email: `${uid}@example.com`,
    role,
    createdAt: "2024-01-01T00:00:00.000Z",
    stage: "ACTIVE",
    photoPath: "profile-photos/user-1/123e4567-e89b-42d3-a456-426614174000.png",
    phoneNumber: "+15555550100",
    firstName: "Ada",
    lastName: "Lovelace",
    region: "US",
  };
}

const owner = actor("owner");
const other = actor("other");
const viewer = actor("viewer", "Viewer");
const globalAdmin = actor("global", "Global Admin");

function storedOf(reportId: string): StoredReport {
  return REPORTS[reportId] as StoredReport;
}

/** The report a procedure should return for report number `n`. */
function reportOf(n: number) {
  return { reportId: id(n), ...storedOf(id(n)) };
}

function ids(reports: { reportId: string }[]) {
  return reports.map((r) => r.reportId);
}

describe("toReport", () => {
  it("adds the id and drops stray fields", () => {
    expect(toReport(id(2), { ...storedOf(id(2)), legacy: "x" })).toEqual(
      reportOf(2),
    );
  });

  it("throws on a document that is not a report", () => {
    expect(() => toReport(id(2), { viewId: "ownerShared" })).toThrow(/charts/);
  });
});

describe("reportNotFound", () => {
  it("is a NOT_FOUND error", () => {
    expect(reportNotFound()).toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("assertUploadedReport", () => {
  const path = reportFilePath("ownerShared", id(9));

  it("accepts a PDF that has been uploaded, checking the right file", async () => {
    await expect(assertUploadedReport(path)).resolves.toBeUndefined();
    expect(bucket.fileAt).toHaveBeenCalledWith(path);
  });

  it("refuses a report that was never uploaded", async () => {
    bucket.file.exists.mockResolvedValue([false]);

    await expect(assertUploadedReport(path)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("refuses a file that is not a PDF", async () => {
    bucket.file.getMetadata.mockResolvedValue([
      { contentType: "text/html", size: "10" },
    ]);

    await expect(assertUploadedReport(path)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("refuses a PDF over the size limit but accepts one at it", async () => {
    bucket.file.getMetadata.mockResolvedValue([
      { contentType: "application/pdf", size: String(MAX_REPORT_BYTES) },
    ]);
    await expect(assertUploadedReport(path)).resolves.toBeUndefined();

    bucket.file.getMetadata.mockResolvedValue([
      { contentType: "application/pdf", size: String(MAX_REPORT_BYTES + 1) },
    ]);
    await expect(assertUploadedReport(path)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

describe("listReports", () => {
  it("lists the reports on every view the actor can see, newest first", async () => {
    const { db } = seeded();

    const reports = await listReports(db, owner);

    expect(reports).toEqual([reportOf(4), reportOf(2), reportOf(1)]);
  });

  it("leaves out reports on someone else's private view", async () => {
    const { db } = seeded();

    expect(ids(await listReports(db, owner))).not.toContain(id(3));
    expect(ids(await listReports(db, other))).toEqual([id(4), id(3), id(2)]);
  });

  it("lists reports on shared views for a Viewer", async () => {
    const { db } = seeded();

    const reports = await listReports(db, viewer);

    expect(ids(reports)).toEqual([id(4), id(2)]);
  });

  it("lists reports on every existing view for a Global Admin", async () => {
    const { db } = seeded();

    const reports = await listReports(db, globalAdmin);

    expect(ids(reports)).toEqual([id(4), id(3), id(2), id(1)]);
  });

  it("leaves out a report whose view no longer exists", async () => {
    const { db } = seeded();

    expect(ids(await listReports(db, globalAdmin))).not.toContain(id(5));
  });

  it("returns an empty list when there are no reports", async () => {
    const { db } = fakeFirestore({ views: VIEWS });

    await expect(listReports(db, owner)).resolves.toEqual([]);
  });

  it("lists only one view's reports when given its id", async () => {
    const { db } = seeded();

    const reports = await listReports(db, owner, { viewId: "ownerShared" });

    expect(reports).toEqual([reportOf(4), reportOf(2)]);
  });

  it("accepts an empty input as no filter", async () => {
    const { db } = seeded();

    const reports = await listReports(db, owner, {});

    expect(ids(reports)).toEqual([id(4), id(2), id(1)]);
  });

  it("throws NOT_FOUND for the reports of a view the actor can't see", async () => {
    const { db } = seeded();

    await expect(
      listReports(db, owner, { viewId: "otherPrivate" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws the same NOT_FOUND for an unknown view", async () => {
    const { db } = seeded();

    await expect(
      listReports(db, owner, { viewId: "missing" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("getReport", () => {
  it("returns a report on a view the actor can see", async () => {
    const { db } = seeded();

    await expect(getReport(db, owner, { reportId: id(2) })).resolves.toEqual(
      reportOf(2),
    );
    await expect(getReport(db, owner, { reportId: id(1) })).resolves.toEqual(
      reportOf(1),
    );
  });

  it("returns a report on a shared view to a Viewer", async () => {
    const { db } = seeded();

    await expect(getReport(db, viewer, { reportId: id(2) })).resolves.toEqual(
      reportOf(2),
    );
  });

  it("returns any report on an existing view to a Global Admin", async () => {
    const { db } = seeded();

    await expect(
      getReport(db, globalAdmin, { reportId: id(3) }),
    ).resolves.toEqual(reportOf(3));
  });

  it("throws NOT_FOUND for a report on a view the actor can't see", async () => {
    const { db } = seeded();

    await expect(
      getReport(db, owner, { reportId: id(3) }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      getReport(db, viewer, { reportId: id(1) }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws the same NOT_FOUND for an unknown report", async () => {
    const { db } = seeded();

    await expect(
      getReport(db, owner, { reportId: id(9) }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND for a report whose view no longer exists", async () => {
    const { db } = seeded();

    await expect(
      getReport(db, globalAdmin, { reportId: id(5) }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("createReport", () => {
  it("records a report of the view as it is now", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    const { db, doc } = seeded();

    const created = await createReport(db, owner, {
      viewId: "ownerShared",
      reportId: id(9),
      notes: "For the board",
    });

    const expected: StoredReport = {
      viewId: "ownerShared",
      charts: VIEWS.ownerShared?.charts ?? [],
      takenAt: NOW,
      notes: "For the board",
      path: reportFilePath("ownerShared", id(9)),
    };
    expect(created).toEqual({ reportId: id(9), ...expected });
    expect(doc("reports", id(9))).toEqual(expected);
  });

  it("checks the PDF at the path it records", async () => {
    const { db } = seeded();

    await createReport(db, owner, { viewId: "ownerShared", reportId: id(9) });

    expect(bucket.fileAt).toHaveBeenCalledWith(
      reportFilePath("ownerShared", id(9)),
    );
  });

  it("defaults the notes to an empty string", async () => {
    const { db } = seeded();

    const created = await createReport(db, owner, {
      viewId: "ownerShared",
      reportId: id(9),
    });

    expect(created.notes).toBe("");
  });

  it("leaves the view itself untouched", async () => {
    const { db, doc } = seeded();

    await createReport(db, owner, { viewId: "ownerShared", reportId: id(9) });

    expect(doc("views", "ownerShared")).toEqual(VIEWS.ownerShared);
  });

  it("lets a Viewer take a report of a view they can see", async () => {
    const { db, doc } = seeded();

    const created = await createReport(db, viewer, {
      viewId: "ownerShared",
      reportId: id(9),
    });

    expect(created.viewId).toBe("ownerShared");
    expect(doc("reports", id(9))).toBeDefined();
  });

  it("lets a Global Admin take a report of any existing view", async () => {
    const { db } = seeded();

    const created = await createReport(db, globalAdmin, {
      viewId: "otherPrivate",
      reportId: id(9),
    });

    expect(created.charts).toEqual(VIEWS.otherPrivate?.charts);
  });

  it("throws NOT_FOUND for a view the actor can't see, writing nothing", async () => {
    const { db, doc } = seeded();

    await expect(
      createReport(db, owner, { viewId: "otherPrivate", reportId: id(9) }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(doc("reports", id(9))).toBeUndefined();
  });

  it("throws the same NOT_FOUND for an unknown view", async () => {
    const { db, doc } = seeded();

    await expect(
      createReport(db, owner, { viewId: "missing", reportId: id(9) }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(doc("reports", id(9))).toBeUndefined();
  });

  it("throws BAD_REQUEST when the PDF was never uploaded, writing nothing", async () => {
    bucket.file.exists.mockResolvedValue([false]);
    const { db, doc } = seeded();

    await expect(
      createReport(db, owner, { viewId: "ownerShared", reportId: id(9) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(doc("reports", id(9))).toBeUndefined();
  });

  it("throws BAD_REQUEST when the upload is not a PDF", async () => {
    bucket.file.getMetadata.mockResolvedValue([
      { contentType: "image/png", size: "10" },
    ]);
    const { db, doc } = seeded();

    await expect(
      createReport(db, owner, { viewId: "ownerShared", reportId: id(9) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(doc("reports", id(9))).toBeUndefined();
  });

  it("throws CONFLICT for a report id that is already recorded", async () => {
    const { db, doc } = seeded();

    await expect(
      createReport(db, owner, { viewId: "ownerShared", reportId: id(2) }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(doc("reports", id(2))).toEqual(storedOf(id(2)));
  });
});
