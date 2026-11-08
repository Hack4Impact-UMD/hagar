import { type } from "arktype";
import { describe, expect, it } from "vitest";
import {
  createReportInput,
  getReportInput,
  listReportsInput,
  reportFilePath,
  reportFolder,
  reportPath,
  reportUuid,
} from "@common/reports.ts";

const uuid = "123e4567-e89b-42d3-a456-426614174000";
const path = `reports/view-1/${uuid}.pdf`;

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

describe("report procedure inputs", () => {
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

  it("reject a report id that is not a UUID", () => {
    expect(
      createReportInput({ viewId: "view-1", reportId: "report-1" }),
    ).toBeInstanceOf(type.errors);
  });
});
