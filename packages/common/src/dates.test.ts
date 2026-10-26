import { type } from "arktype";
import { describe, expect, it } from "vitest";
import { nowUtc, utcDateString } from "@common/dates.ts";

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

  it("rejects values that are not strings", () => {
    expect(utcDateString(0)).toBeInstanceOf(type.errors);
    expect(utcDateString(new Date())).toBeInstanceOf(type.errors);
  });

  it("orders chronologically when compared as strings", () => {
    const earlier = "2024-05-01T12:30:00.000Z";
    const later = "2024-05-01T12:30:00.001Z";
    expect(earlier < later).toBe(true);
  });
});

describe("nowUtc", () => {
  it("returns a valid UTC date string", () => {
    expect(utcDateString(nowUtc())).not.toBeInstanceOf(type.errors);
  });
});
