import { type } from "arktype";
import { describe, expect, it } from "vitest";
import type { PointInTime } from "@common/dates.ts";
import { nowUtc, resolvePointInTime, utcDateString } from "@common/dates.ts";

describe("utcDateString", () => {
  it("accepts the format Date#toISOString writes", () => {
    const value = "2024-05-01T12:30:00.000Z";
    expect(utcDateString(value)).toBe(value);
  });

  it("rejects other date formats and impossible dates", () => {
    for (const value of [
      "2024-05-01",
      "2024-05-01T12:30:00Z",
      "2024-05-01T12:30:00.000+02:00",
      "2024-02-30T00:00:00.000Z",
      "May 1, 2024",
      "",
    ]) {
      expect(utcDateString(value)).toBeInstanceOf(type.errors);
    }
  });
});

describe("nowUtc", () => {
  it("returns a valid UTC date string", () => {
    expect(utcDateString(nowUtc())).not.toBeInstanceOf(type.errors);
  });
});

describe("resolvePointInTime", () => {
  const now = new Date("2024-03-15T10:30:00.000Z");

  function ago(
    anchor: "NOW" | "TODAY",
    amount: number,
    unit: "DAY" | "WEEK" | "MONTH" | "YEAR",
  ): PointInTime {
    return { type: "RELATIVE", anchor, ago: { amount, unit } };
  }

  it("returns a fixed point's date, whatever now is", () => {
    const date = "2023-07-04T12:00:00.000Z";
    expect(resolvePointInTime({ type: "STATIC", date }, now)).toBe(date);
  });

  it("resolves NOW to the moment passed in", () => {
    expect(resolvePointInTime({ type: "RELATIVE", anchor: "NOW" }, now)).toBe(
      "2024-03-15T10:30:00.000Z",
    );
  });

  it("resolves TODAY to midnight UTC on now's date", () => {
    expect(resolvePointInTime({ type: "RELATIVE", anchor: "TODAY" }, now)).toBe(
      "2024-03-15T00:00:00.000Z",
    );
  });

  it("goes back each unit from NOW", () => {
    expect(resolvePointInTime(ago("NOW", 1, "DAY"), now)).toBe(
      "2024-03-14T10:30:00.000Z",
    );
    expect(resolvePointInTime(ago("NOW", 2, "WEEK"), now)).toBe(
      "2024-03-01T10:30:00.000Z",
    );
    expect(resolvePointInTime(ago("NOW", 1, "MONTH"), now)).toBe(
      "2024-02-15T10:30:00.000Z",
    );
    expect(resolvePointInTime(ago("NOW", 1, "YEAR"), now)).toBe(
      "2023-03-15T10:30:00.000Z",
    );
  });

  it("goes back from midnight for TODAY", () => {
    expect(resolvePointInTime(ago("TODAY", 1, "DAY"), now)).toBe(
      "2024-03-14T00:00:00.000Z",
    );
  });
});
