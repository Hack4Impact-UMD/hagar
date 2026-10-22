import { type } from "arktype";
import { describe, expect, it } from "vitest";
import {
  report,
  reportFolder,
  reportPath,
  storedReport,
} from "@common/reports.ts";

const stored = {
  viewId: "view-1",
  charts: [{ name: "Open rate" }],
  takenAt: "2024-05-01T12:30:00.000Z",
  notes: "Sent to the board",
  path: "reports/view-1/report-1.pdf",
};

describe("reportPath", () => {
  it("accepts a PDF in a view's folder", () => {
    expect(reportPath("reports/view-1/report-1.pdf")).toBe(
      "reports/view-1/report-1.pdf",
    );
  });

  it("rejects anything outside the report layout", () => {
    for (const path of [
      "https://example.com/report.pdf",
      "reports/report-1.pdf",
      "reports/view-1/nested/report-1.pdf",
      "reports/view-1/report-1.png",
      "reports/view-1/.pdf",
      "other/view-1/report-1.pdf",
    ]) {
      expect(reportPath(path)).toBeInstanceOf(type.errors);
    }
  });
});

describe("reportFolder", () => {
  it("holds the paths of that view's reports", () => {
    expect(stored.path.startsWith(reportFolder("view-1"))).toBe(true);
    // A view id that is a prefix of another must not match its folder.
    expect(stored.path.startsWith(reportFolder("view"))).toBe(false);
  });
});

describe("storedReport", () => {
  it("accepts a report with the charts the view had at the time", () => {
    expect(storedReport(stored)).toEqual(stored);
    expect(storedReport({ ...stored, charts: [], notes: "" })).toEqual({
      ...stored,
      charts: [],
      notes: "",
    });
  });

  it("requires a UTC date string for when it was taken", () => {
    for (const takenAt of [1714566600000, "2024-05-01", "yesterday"]) {
      expect(storedReport({ ...stored, takenAt })).toBeInstanceOf(type.errors);
    }
  });

  it("rejects a missing view, a bad path, or a bad chart", () => {
    expect(storedReport({ ...stored, viewId: "" })).toBeInstanceOf(type.errors);
    expect(storedReport({ ...stored, path: "report.pdf" })).toBeInstanceOf(
      type.errors,
    );
    expect(storedReport({ ...stored, charts: [{}] })).toBeInstanceOf(
      type.errors,
    );
  });
});

describe("report", () => {
  it("adds the document id to the stored shape", () => {
    expect(report({ reportId: "report-1", ...stored })).toEqual({
      reportId: "report-1",
      ...stored,
    });
    expect(report(stored)).toBeInstanceOf(type.errors);
  });
});
