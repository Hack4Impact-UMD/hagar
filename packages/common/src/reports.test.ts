import { type } from "arktype";
import { describe, expect, it } from "vitest";
import {
  createReportInput,
  getReportInput,
  listReportsInput,
  report,
  reportFilePath,
  reportFolder,
  reportPath,
  reportUuid,
  storedReport,
} from "@common/reports.ts";

const uuid = "123e4567-e89b-42d3-a456-426614174000";
const path = `reports/view-1/${uuid}.pdf`;

const stored = {
  viewId: "view-1",
  charts: [{ name: "Open rate" }],
  takenAt: "2024-05-01T12:30:00.000Z",
  notes: "Sent to the board",
  path,
};

describe("reportPath", () => {
  it("accepts a PDF named by a UUID in a view's folder", () => {
    expect(reportPath(path)).toBe(path);
  });

  it("rejects anything outside the report layout", () => {
    for (const bad of [
      "https://example.com/report.pdf",
      `reports/${uuid}.pdf`,
      `reports/view-1/nested/${uuid}.pdf`,
      `reports/view-1/${uuid}.png`,
      "reports/view-1/report-1.pdf",
      "reports/view-1/.pdf",
      `other/view-1/${uuid}.pdf`,
    ]) {
      expect(reportPath(bad)).toBeInstanceOf(type.errors);
    }
  });
});

describe("reportUuid", () => {
  it("accepts a lowercase UUID only", () => {
    expect(reportUuid(uuid)).toBe(uuid);
    for (const bad of ["", "report-1", uuid.toUpperCase(), `${uuid}.pdf`]) {
      expect(reportUuid(bad)).toBeInstanceOf(type.errors);
    }
  });
});

describe("reportFolder and reportFilePath", () => {
  it("put a report in its view's folder", () => {
    expect(reportFilePath("view-1", uuid)).toBe(path);
    expect(
      reportFilePath("view-1", uuid).startsWith(reportFolder("view-1")),
    ).toBe(true);
    // A view id that is a prefix of another must not match its folder.
    expect(
      reportFilePath("view-1", uuid).startsWith(reportFolder("view")),
    ).toBe(false);
  });

  it("make a path that reportPath accepts", () => {
    expect(reportPath(reportFilePath("view-1", uuid))).toBe(path);
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
    expect(report({ reportId: uuid, ...stored })).toEqual({
      reportId: uuid,
      ...stored,
    });
    expect(report(stored)).toBeInstanceOf(type.errors);
  });
});

describe("report procedure inputs", () => {
  it("accept a get, a list with or without a view, and a create", () => {
    expect(getReportInput({ reportId: uuid })).toEqual({ reportId: uuid });
    expect(listReportsInput({})).toEqual({});
    expect(listReportsInput({ viewId: "view-1" })).toEqual({
      viewId: "view-1",
    });
    expect(createReportInput({ viewId: "view-1", reportId: uuid })).toEqual({
      viewId: "view-1",
      reportId: uuid,
    });
    expect(
      createReportInput({ viewId: "view-1", reportId: uuid, notes: "Hi" }),
    ).toMatchObject({ notes: "Hi" });
  });

  it("reject undeclared keys, so a caller cannot forge a report", () => {
    for (const result of [
      getReportInput({ reportId: uuid, extra: 1 }),
      listReportsInput({ viewId: "view-1", extra: 1 }),
      createReportInput({ viewId: "view-1", reportId: uuid, charts: [] }),
      createReportInput({
        viewId: "view-1",
        reportId: uuid,
        takenAt: "2024-05-01T12:30:00.000Z",
      }),
      createReportInput({ viewId: "view-1", reportId: uuid, path }),
    ]) {
      expect(result).toBeInstanceOf(type.errors);
    }
  });

  it("reject an empty id, a report id that is not a UUID, and long notes", () => {
    expect(getReportInput({ reportId: "" })).toBeInstanceOf(type.errors);
    expect(listReportsInput({ viewId: "" })).toBeInstanceOf(type.errors);
    expect(createReportInput({ viewId: "", reportId: uuid })).toBeInstanceOf(
      type.errors,
    );
    expect(
      createReportInput({ viewId: "view-1", reportId: "report-1" }),
    ).toBeInstanceOf(type.errors);
    expect(
      createReportInput({
        viewId: "view-1",
        reportId: uuid,
        notes: "x".repeat(10_001),
      }),
    ).toBeInstanceOf(type.errors);
  });
});
