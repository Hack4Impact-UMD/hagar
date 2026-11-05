import { type } from "arktype";

/**
 * An instant as `Date#toISOString` writes it, e.g. `2024-05-01T12:30:00.000Z`.
 *
 * Only this one format is accepted, not every ISO 8601 variant. It is plain
 * JSON, and because the width and the `Z` offset are fixed, comparing two
 * values as strings orders them chronologically. Firestore range queries and
 * `orderBy` on these fields rely on that.
 */
export const utcDateString = type("string").narrow((value, ctx) => {
  const parsed = new Date(value);
  // The round trip rejects other formats and impossible dates like Feb 30,
  // which `Date` would otherwise roll over into March.
  return (
    (!Number.isNaN(parsed.getTime()) && parsed.toISOString() === value) ||
    ctx.mustBe("a UTC date string like 2024-05-01T12:30:00.000Z")
  );
});
export type UtcDateString = typeof utcDateString.infer;

export function nowUtc(): UtcDateString {
  return new Date().toISOString();
}

/**
 * A moment that is either fixed or worked out from the current time when it is
 * used. A fixed one is a `STATIC` UTC date string. A moving one is `RELATIVE`: it
 * starts from `NOW` or from the start of `TODAY`, and optionally goes back
 * `ago`, so "one month ago" is `{ anchor: "NOW", ago: { amount: 1, unit:
 * "MONTH" } }`.
 */
export const pointInTime = type({
  type: "'STATIC'",
  date: utcDateString,
}).or({
  type: "'RELATIVE'",
  anchor: "'NOW' | 'TODAY'",
  "ago?": {
    // The cap only bounds abuse. It sits far above any real offset.
    amount: "1 <= number.integer <= 10000",
    unit: "'DAY' | 'WEEK' | 'MONTH' | 'YEAR'",
  },
});
export type PointInTime = typeof pointInTime.infer;

/**
 * The instant a point in time stands for. `now` is passed in, not read from
 * the clock, so callers and tests agree on what "now" is.
 */
export function resolvePointInTime(
  _point: PointInTime,
  _now: Date,
): UtcDateString {
  throw new Error("resolvePointInTime is not implemented yet.");
}
