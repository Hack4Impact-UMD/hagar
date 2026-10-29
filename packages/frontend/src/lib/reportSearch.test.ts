import { describe, expect, it } from "vitest";
import {
  filterReports,
  UNKNOWN_VIEW_NAME,
  viewNameFor,
} from "@frontend/lib/reportSearch.ts";

const viewNames = new Map([
  ["v1", "Q3 Sales"],
  ["v2", "Executive Overview"],
  ["v3", "Staff Overview"],
]);

// Newest first, as the backend returns them.
const reports = [
  { reportId: "r1", viewId: "v2" },
  { reportId: "r2", viewId: "v1" },
  { reportId: "r3", viewId: "v3" },
  { reportId: "r4", viewId: "v2" },
  { reportId: "r5", viewId: "missing" },
];

function ids(query: string) {
  return filterReports(reports, viewNames, query).map((r) => r.reportId);
}

describe("filterReports", () => {
  it("keeps every report for an empty or blank query", () => {
    expect(ids("")).toEqual(["r1", "r2", "r3", "r4", "r5"]);
    expect(ids("   ")).toEqual(["r1", "r2", "r3", "r4", "r5"]);
  });

  it("matches anywhere in the view name, ignoring case and spaces around it", () => {
    expect(ids("overview")).toEqual(["r1", "r3", "r4"]);
    expect(ids("  EXEC ")).toEqual(["r1", "r4"]);
    expect(ids("sales")).toEqual(["r2"]);
  });

  it("keeps the original order", () => {
    expect(ids("view")).toEqual(["r1", "r3", "r4", "r5"]);
  });

  it("matches a report whose view is missing by the name it shows", () => {
    expect(ids("unknown")).toEqual(["r5"]);
  });

  it("returns nothing when no name matches", () => {
    expect(ids("budget")).toEqual([]);
  });
});

describe("viewNameFor", () => {
  it("falls back when the view isn't in the list", () => {
    expect(viewNameFor(viewNames, "v1")).toBe("Q3 Sales");
    expect(viewNameFor(viewNames, "missing")).toBe(UNKNOWN_VIEW_NAME);
  });
});
