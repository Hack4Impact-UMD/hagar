import { describe, expect, it } from "vitest";
import { formatChartDate } from "@frontend/lib/chartFormat.ts";

describe("formatChartDate", () => {
  it("shows the UTC calendar day, even just after midnight UTC", () => {
    expect(formatChartDate("2024-05-01T00:30:00.000Z")).toBe("May 1, 2024");
  });

  it("accepts epoch milliseconds, as chart axes supply", () => {
    expect(formatChartDate(Date.UTC(2024, 11, 31, 23, 59))).toBe(
      "Dec 31, 2024",
    );
  });
});
