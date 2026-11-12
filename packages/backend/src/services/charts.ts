import type {
  ActiveUserProfile,
  ChartData,
  ChartDataInput,
  EmailCampaignMetric,
  UtcDateString,
} from "@repo/common";
import {
  EmailList,
  StoredEmailCampaignRecord,
  resolvePointInTime,
} from "@repo/common";
import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";
import { LINKED_ITEM_COLLECTIONS } from "@backend/services/campaigns.ts";

const EMAIL_LISTS = "email-lists";
const EMAIL_CAMPAIGNS = LINKED_ITEM_COLLECTIONS.EMAIL;

// Only the snapshots are read, so only they are checked. Parsing the whole
// campaign would reject it: its `content` is a URL string in Firestore, while
// the schema expects a URL instance.
const parseListSnapshots =
  EmailList.pick("snapshots").onUndeclaredKey("delete");
const parseCampaignSnapshots =
  StoredEmailCampaignRecord.pick("snapshots").onUndeclaredKey("delete");

/**
 * One snapshot reduced to the single number the chart reads. `at` is a
 * `UtcDateString`, whose fixed width makes string order chronological, so
 * comparisons below need no parsing.
 */
export type SnapshotPoint = { at: UtcDateString; value: number };

/**
 * The value in force at `at`: the latest snapshot at or before it. A snapshot
 * is stored only when the numbers change, so nothing between two snapshots
 * differs from the earlier one. `null` when the first snapshot is later.
 */
export function valueAt(
  points: readonly SnapshotPoint[],
  at: UtcDateString,
): number | null {
  let value: number | null = null;
  for (const point of points) {
    if (point.at > at) break;
    value = point.value;
  }
  return value;
}

/**
 * The series from `start` to `end`, oldest first: the value holding at the
 * start, then each snapshot strictly after the start up to and including the
 * end, then the value holding at the end. The start point is left out when no
 * snapshot is at or before the start, and the end point is left out when a
 * snapshot already falls exactly on the end, so no instant appears twice.
 */
export function seriesBetween(
  points: readonly SnapshotPoint[],
  start: UtcDateString,
  end: UtcDateString,
): SnapshotPoint[] {
  const series: SnapshotPoint[] = [];
  const opening = valueAt(points, start);
  if (opening !== null) series.push({ at: start, value: opening });
  for (const point of points) {
    if (point.at > start && point.at <= end) series.push(point);
  }
  const closing = valueAt(points, end);
  const last = series.at(-1);
  if (closing !== null && last?.at !== end) {
    series.push({ at: end, value: closing });
  }
  return series;
}

function byFetchedAt(points: SnapshotPoint[]): SnapshotPoint[] {
  return points.toSorted((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

function notFound(what: string): TRPCError {
  return new TRPCError({
    code: "NOT_FOUND",
    message: `That ${what} does not exist.`,
  });
}

/** The list's subscriber counts, oldest first. */
async function listSizePoints(
  db: Firestore,
  emailListId: string,
): Promise<SnapshotPoint[]> {
  const snapshot = await db.collection(EMAIL_LISTS).doc(emailListId).get();
  if (!snapshot.exists) throw notFound("email list");
  const list = parseListSnapshots.assert(snapshot.data());
  return byFetchedAt(
    list.snapshots.map((s) => ({ at: s.fetchedAt, value: s.count })),
  );
}

/** One metric's counts for the campaign, oldest first. */
async function campaignMetricPoints(
  db: Firestore,
  emailCampaignId: string,
  metric: EmailCampaignMetric,
): Promise<SnapshotPoint[]> {
  const snapshot = await db
    .collection(EMAIL_CAMPAIGNS)
    .doc(emailCampaignId)
    .get();
  if (!snapshot.exists) throw notFound("email");
  const email = parseCampaignSnapshots.assert(snapshot.data());
  return byFetchedAt(
    email.snapshots.map((s) => ({ at: s.fetchedAt, value: s[metric] })),
  );
}

/**
 * Reads a chart's numbers from the snapshots of its email or list. Relative
 * dates resolve from `now`, which is passed in so tests can fix it.
 */
export async function getChartData(
  db: Firestore,
  _actor: ActiveUserProfile,
  input: ChartDataInput,
  now: Date,
): Promise<ChartData> {
  const { chart } = input;
  switch (chart.chartId) {
    case "EMAIL_LIST_SIZE":
      return {
        type: "VALUE",
        value: valueAt(
          await listSizePoints(db, chart.params.emailListId),
          resolvePointInTime(chart.params.pointInTime, now),
        ),
      };
    case "EMAIL_CAMPAIGN_METRIC":
      return {
        type: "VALUE",
        value: valueAt(
          await campaignMetricPoints(
            db,
            chart.params.emailCampaignId,
            chart.params.metric,
          ),
          resolvePointInTime(chart.params.pointInTime, now),
        ),
      };
    case "EMAIL_LIST_SIZE_OVER_TIME":
    case "EMAIL_CAMPAIGN_METRIC_OVER_TIME": {
      const start = resolvePointInTime(chart.params.start, now);
      const end = resolvePointInTime(chart.params.end, now);
      // Relative dates can put the start after the end, so this is checked on
      // the resolved instants, and before the read so a bad range fails fast.
      if (start > end) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The start is after the end.",
        });
      }
      const points =
        chart.chartId === "EMAIL_LIST_SIZE_OVER_TIME"
          ? await listSizePoints(db, chart.params.emailListId)
          : await campaignMetricPoints(
              db,
              chart.params.emailCampaignId,
              chart.params.metric,
            );
      return { type: "SERIES", points: seriesBetween(points, start, end) };
    }
    default: {
      const unexpected: never = chart;
      throw new Error(`Unknown chart kind ${unexpected}`);
    }
  }
}
