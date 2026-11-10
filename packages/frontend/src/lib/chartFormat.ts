import type { UtcDateString } from "@repo/common";

const countFormat = new Intl.NumberFormat();

export function formatCount(value: number): string {
  return countFormat.format(value);
}

// UTC, not local time, because snapshots are stored as UTC instants and a
// local zone would show a snapshot taken just after midnight UTC on the
// previous day.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatChartDate(at: UtcDateString | number): string {
  return dateFormat.format(new Date(at));
}
