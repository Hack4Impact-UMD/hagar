import type {
  ActiveUserProfile,
  ChartDefinition,
  EmailCampaignMetric,
  PointInTime,
} from "@repo/common";
import type { SnapshotPoint } from "@backend/services/charts.ts";
import { describe, expect, it } from "vitest";
import { fakeFirestore } from "@backend/testing/fakeFirestore.ts";
import {
  getChartData,
  seriesBetween,
  valueAt,
} from "@backend/services/charts.ts";

const JAN_1 = "2024-01-01T00:00:00.000Z";
const JAN_15 = "2024-01-15T00:00:00.000Z";
const JAN_31 = "2024-01-31T00:00:00.000Z";
const FEB_15 = "2024-02-15T00:00:00.000Z";
const MAR_1 = "2024-03-01T00:00:00.000Z";
const NOW = new Date(MAR_1);

// A snapshot is only stored when the numbers change, so the value at any time
// is the latest snapshot at or before it.
const LIST = {
  platform: "Klaviyo",
  platformListID: "k-donors",
  name: "Donors",
  lastFetchedAt: MAR_1,
  snapshots: [
    { count: 100, fetchedAt: JAN_1 },
    { count: 200, fetchedAt: JAN_31 },
  ],
};

// Each metric has its own value, so a test can tell which field was read.
const EMAIL = {
  platform: "Klaviyo",
  region: "US",
  platformCampaignID: "k-spring",
  listIDs: ["list-1"],
  name: "Spring launch",
  content: "https://example.com/campaign",
  sentAt: JAN_1,
  lastFetchedAt: MAR_1,
  notes: "",
  snapshots: [
    {
      fetchedAt: JAN_1,
      bounced: 1,
      uniqOpens: 2,
      uniqClicks: 3,
      unsubscribers: 4,
      complaints: 5,
    },
  ],
};

function seeded() {
  return fakeFirestore({
    "email-lists": { "list-1": LIST },
    "email-campaigns": { "email-1": EMAIL },
  });
}

/** The profile the middleware would hand the service. */
function actor(role: ActiveUserProfile["role"]): ActiveUserProfile {
  return {
    uid: `${role}-1`,
    email: "ada@example.com",
    role,
    createdAt: "2024-01-01T00:00:00.000Z",
    stage: "ACTIVE",
    photoPath: "profile-photos/user-1/avatar",
    phoneNumber: "+15555550100",
    firstName: "Ada",
    lastName: "Lovelace",
    region: "US",
  };
}

const viewer = actor("Viewer");

function at(date: string): PointInTime {
  return { type: "STATIC", date };
}

function listSizeAt(
  pointInTime: PointInTime,
  emailListId = "list-1",
): ChartDefinition {
  return {
    name: "Donors",
    chartId: "EMAIL_LIST_SIZE",
    params: { emailListId, pointInTime },
  };
}

function listSizeBetween(
  start: PointInTime,
  end: PointInTime,
): ChartDefinition {
  return {
    name: "Donors over time",
    chartId: "EMAIL_LIST_SIZE_OVER_TIME",
    params: { emailListId: "list-1", start, end },
  };
}

function metricAt(
  metric: EmailCampaignMetric,
  emailCampaignId = "email-1",
): ChartDefinition {
  return {
    name: "Spring launch",
    chartId: "EMAIL_CAMPAIGN_METRIC",
    params: { emailCampaignId, metric, pointInTime: at(FEB_15) },
  };
}

describe("getChartData", () => {
  it("gives the earlier snapshot for a time between two snapshots", async () => {
    const { db } = seeded();

    await expect(
      getChartData(db, viewer, { chart: listSizeAt(at(JAN_15)) }, NOW),
    ).resolves.toEqual({ type: "VALUE", value: 100 });
  });

  it("counts a snapshot taken at exactly the time", async () => {
    const { db } = seeded();

    await expect(
      getChartData(db, viewer, { chart: listSizeAt(at(JAN_31)) }, NOW),
    ).resolves.toEqual({ type: "VALUE", value: 200 });
  });

  it("gives null for a time before the first snapshot", async () => {
    const { db } = seeded();

    await expect(
      getChartData(
        db,
        viewer,
        { chart: listSizeAt(at("2023-12-01T00:00:00.000Z")) },
        NOW,
      ),
    ).resolves.toEqual({ type: "VALUE", value: null });
  });

  it("gives a series of the start, the snapshots in between and the end", async () => {
    const { db } = seeded();

    await expect(
      getChartData(
        db,
        viewer,
        { chart: listSizeBetween(at(JAN_15), at(FEB_15)) },
        NOW,
      ),
    ).resolves.toEqual({
      type: "SERIES",
      points: [
        { at: JAN_15, value: 100 },
        { at: JAN_31, value: 200 },
        { at: FEB_15, value: 200 },
      ],
    });
  });

  it("has no start point when the series starts before the first snapshot", async () => {
    const { db } = seeded();

    await expect(
      getChartData(
        db,
        viewer,
        {
          chart: listSizeBetween(at("2023-12-01T00:00:00.000Z"), at(JAN_15)),
        },
        NOW,
      ),
    ).resolves.toEqual({
      type: "SERIES",
      points: [
        { at: JAN_1, value: 100 },
        { at: JAN_15, value: 100 },
      ],
    });
  });

  it("resolves relative dates from the now passed in", async () => {
    const { db } = seeded();
    const oneMonthAgo: PointInTime = {
      type: "RELATIVE",
      anchor: "NOW",
      ago: { amount: 1, unit: "MONTH" },
    };

    // A month before Feb 15 is Jan 15, before the second snapshot.
    await expect(
      getChartData(
        db,
        viewer,
        { chart: listSizeAt(oneMonthAgo) },
        new Date(FEB_15),
      ),
    ).resolves.toEqual({ type: "VALUE", value: 100 });
  });

  it("reads the snapshot field named by the metric", async () => {
    const { db } = seeded();
    const expected: Record<EmailCampaignMetric, number> = {
      bounced: 1,
      uniqOpens: 2,
      uniqClicks: 3,
      unsubscribers: 4,
      complaints: 5,
    };

    for (const [metric, value] of Object.entries(expected)) {
      await expect(
        getChartData(
          db,
          viewer,
          { chart: metricAt(metric as EmailCampaignMetric) },
          NOW,
        ),
      ).resolves.toEqual({ type: "VALUE", value });
    }
  });

  it("throws NOT_FOUND for a missing email or list", async () => {
    const { db } = seeded();

    await expect(
      getChartData(
        db,
        viewer,
        { chart: listSizeAt(at(JAN_15), "missing") },
        NOW,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      getChartData(
        db,
        viewer,
        { chart: metricAt("uniqOpens", "missing") },
        NOW,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("reads a campaign metric across the range", async () => {
    const { db } = fakeFirestore({
      "email-campaigns": {
        "email-1": {
          ...EMAIL,
          snapshots: [
            { ...EMAIL.snapshots[0], fetchedAt: JAN_1, uniqOpens: 2 },
            { ...EMAIL.snapshots[0], fetchedAt: JAN_31, uniqOpens: 9 },
          ],
        },
      },
    });

    await expect(
      getChartData(
        db,
        viewer,
        {
          chart: {
            name: "Opens",
            chartId: "EMAIL_CAMPAIGN_METRIC_OVER_TIME",
            params: {
              emailCampaignId: "email-1",
              metric: "uniqOpens",
              start: at(JAN_15),
              end: at(FEB_15),
            },
          },
        },
        NOW,
      ),
    ).resolves.toEqual({
      type: "SERIES",
      points: [
        { at: JAN_15, value: 2 },
        { at: JAN_31, value: 9 },
        { at: FEB_15, value: 9 },
      ],
    });
  });

  it("sorts snapshots that were stored out of order", async () => {
    const { db } = fakeFirestore({
      "email-lists": {
        "list-1": {
          ...LIST,
          snapshots: [
            { count: 200, fetchedAt: JAN_31 },
            { count: 100, fetchedAt: JAN_1 },
          ],
        },
      },
    });

    await expect(
      getChartData(db, viewer, { chart: listSizeAt(at(JAN_15)) }, NOW),
    ).resolves.toEqual({ type: "VALUE", value: 100 });
  });

  it("throws BAD_REQUEST before reading when relative dates invert the range", async () => {
    const { db } = fakeFirestore({});

    await expect(
      getChartData(
        db,
        viewer,
        {
          chart: listSizeBetween(
            { type: "RELATIVE", anchor: "NOW" },
            {
              type: "RELATIVE",
              anchor: "NOW",
              ago: { amount: 1, unit: "DAY" },
            },
          ),
        },
        NOW,
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST when the start is after the end", async () => {
    const { db } = seeded();

    await expect(
      getChartData(
        db,
        viewer,
        { chart: listSizeBetween(at(FEB_15), at(JAN_15)) },
        NOW,
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

// The step function's edges are easier to see without the database in between.
describe("seriesBetween", () => {
  const points: SnapshotPoint[] = [
    { at: JAN_1, value: 100 },
    { at: JAN_15, value: 150 },
    { at: JAN_31, value: 200 },
  ];

  it("emits a snapshot that falls exactly on the start or the end only once", () => {
    expect(seriesBetween(points, JAN_1, JAN_31)).toEqual(points);
  });

  it("emits one point when the start and the end are the same instant", () => {
    expect(seriesBetween(points, JAN_15, JAN_15)).toEqual([
      { at: JAN_15, value: 150 },
    ]);
  });

  it("carries the same value to both ends when nothing changed inside the range", () => {
    const JAN_20 = "2024-01-20T00:00:00.000Z";
    const JAN_25 = "2024-01-25T00:00:00.000Z";

    // No snapshot falls inside the range, so both points are the value still
    // holding from the earlier snapshot, at two different instants.
    expect(seriesBetween(points, JAN_20, JAN_25)).toEqual([
      { at: JAN_20, value: 150 },
      { at: JAN_25, value: 150 },
    ]);
  });

  it("is empty when the range ends before the first snapshot", () => {
    expect(
      seriesBetween(
        points,
        "2023-11-01T00:00:00.000Z",
        "2023-12-01T00:00:00.000Z",
      ),
    ).toEqual([]);
  });

  it("keeps every snapshot that shares a timestamp, and reads the later one", () => {
    // The later value is the smaller one, so this is order, not the maximum.
    const tied: SnapshotPoint[] = [
      { at: JAN_15, value: 150 },
      { at: JAN_15, value: 50 },
    ];

    expect(valueAt(tied, FEB_15)).toBe(50);
    // The tie sits strictly inside the range, so both snapshots are kept.
    expect(seriesBetween(tied, JAN_1, JAN_15)).toEqual(tied);
  });
});
