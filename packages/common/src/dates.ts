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
