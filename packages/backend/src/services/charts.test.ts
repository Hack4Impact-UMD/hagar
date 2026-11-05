import type {
  ActiveUserProfile,
  ChartDefinition,
  EmailCampaignMetric,
  PointInTime,
} from "@repo/common";
import { describe, expect, it } from "vitest";
import { fakeFirestore } from "@backend/testing/fakeFirestore.ts";
import { getChartData } from "@backend/services/charts.ts";

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
  it.fails("gives the earlier snapshot for a time between two snapshots", async () => {
    const { db } = seeded();

    await expect(
      getChartData(db, viewer, { chart: listSizeAt(at(JAN_15)) }, NOW),
    ).resolves.toEqual({ type: "VALUE", value: 100 });
  });

  it.fails("counts a snapshot taken at exactly the time", async () => {
    const { db } = seeded();

    await expect(
      getChartData(db, viewer, { chart: listSizeAt(at(JAN_31)) }, NOW),
    ).resolves.toEqual({ type: "VALUE", value: 200 });
  });

  it.fails("gives null for a time before the first snapshot", async () => {
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

  it.fails("gives a series of the start, the snapshots in between and the end", async () => {
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

  it.fails("has no start point when the series starts before the first snapshot", async () => {
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

  it.fails("resolves relative dates from the now passed in", async () => {
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

  it.fails("reads the snapshot field named by the metric", async () => {
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

  it.fails("throws NOT_FOUND for a missing email or list", async () => {
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

  it.fails("throws BAD_REQUEST when the start is after the end", async () => {
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
