import type { Campaign, CampaignDateRange } from "@repo/common";
import { describe, expect, it } from "vitest";
import type {
  CampaignFilters,
  CampaignRow,
} from "@frontend/components/campaigns-list/campaign-list.ts";
import {
  NO_FILTERS,
  campaignChannels,
  campaignStatus,
  filterCampaigns,
  formatDateRange,
  sortCampaigns,
  toCampaignRows,
} from "@frontend/components/campaigns-list/campaign-list.ts";

const NOW = new Date("2026-06-15T12:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    campaignId: "c1",
    name: "Year-End Giving Appeal",
    region: "US",
    notes: "",
    updatedAt: NOW.toISOString(),
    utmCodes: [],
    linkedItems: [],
    ...overrides,
  };
}

function range(
  campaignId: string,
  startDaysAgo: number,
  endDaysAgo: number,
): CampaignDateRange {
  return {
    campaignId,
    startDate: daysAgo(startDaysAgo),
    endDate: daysAgo(endDaysAgo),
  };
}

describe("campaignStatus", () => {
  it("is Draft with no dated emails", () => {
    expect(campaignStatus(undefined, NOW)).toBe("Draft");
  });

  it("is Active up to and including 14 days after the last email", () => {
    expect(campaignStatus(range("c1", 30, 0), NOW)).toBe("Active");
    expect(campaignStatus(range("c1", 30, 14), NOW)).toBe("Active");
  });

  it("is Ended once the last email is more than 14 days old", () => {
    expect(campaignStatus(range("c1", 30, 15), NOW)).toBe("Ended");
  });
});

describe("formatDateRange", () => {
  const format = (startDate: string, endDate: string) =>
    formatDateRange({ campaignId: "c1", startDate, endDate }, "UTC");

  it("writes the year once when both ends share it", () => {
    expect(format("2026-10-02T09:00:00.000Z", "2026-12-15T09:00:00.000Z")).toBe(
      "Oct 2 – Dec 15, 2026",
    );
  });

  it("writes both years when the range crosses into a new year", () => {
    expect(format("2025-12-20T09:00:00.000Z", "2026-01-05T09:00:00.000Z")).toBe(
      "Dec 20, 2025 – Jan 5, 2026",
    );
  });

  it("writes a single date when every email went out the same day", () => {
    expect(format("2026-10-02T09:00:00.000Z", "2026-10-02T17:00:00.000Z")).toBe(
      "Oct 2, 2026",
    );
  });

  it("uses the given time zone to decide the day", () => {
    const lateEvening = {
      campaignId: "c1",
      startDate: "2026-10-03T02:00:00.000Z",
      endDate: "2026-10-03T02:00:00.000Z",
    };
    expect(formatDateRange(lateEvening, "America/New_York")).toBe(
      "Oct 2, 2026",
    );
  });
});

describe("campaignChannels", () => {
  it("lists each kind of linked item once", () => {
    const withEmails = campaign({
      linkedItems: [
        { type: "EMAIL", id: "e1" },
        { type: "EMAIL", id: "e2" },
      ],
    });
    expect(campaignChannels(withEmails)).toEqual(["EMAIL"]);
  });

  it("is empty for a campaign with no links", () => {
    expect(campaignChannels(campaign())).toEqual([]);
  });
});

describe("toCampaignRows", () => {
  it("joins each campaign to its own date range", () => {
    const rows = toCampaignRows(
      [campaign({ campaignId: "a" }), campaign({ campaignId: "b" })],
      [range("b", 40, 30)],
      NOW,
    );
    expect(rows.map((row) => [row.range?.campaignId, row.status])).toEqual([
      [undefined, "Draft"],
      ["b", "Ended"],
    ]);
  });
});

describe("filterCampaigns", () => {
  const rows = toCampaignRows(
    [
      campaign({
        campaignId: "active",
        name: "Year-End Giving Appeal",
        region: "US",
        linkedItems: [{ type: "EMAIL", id: "e1" }],
      }),
      campaign({ campaignId: "ended", name: "Spring Gala", region: "Canada" }),
      campaign({ campaignId: "old", name: "Last Year Drive", region: "US" }),
      campaign({ campaignId: "draft", name: "Giving Tuesday", region: "US" }),
    ],
    [range("active", 20, 2), range("ended", 60, 45), range("old", 400, 380)],
    NOW,
  );

  const ids = (filters: Partial<CampaignFilters>) =>
    filterCampaigns(rows, { ...NO_FILTERS, ...filters }, NOW).map(
      (row) => row.campaign.campaignId,
    );

  it("keeps everything with no filters", () => {
    expect(ids({})).toEqual(["active", "ended", "old", "draft"]);
  });

  it("matches names containing the search, ignoring case and outer spaces", () => {
    expect(ids({ search: "  GIVING " })).toEqual(["active", "draft"]);
  });

  it("matches campaigns that ran at any point in the date window", () => {
    expect(ids({ date: "LAST_30_DAYS" })).toEqual(["active"]);
    // "ended" started before the window but its last email is inside it.
    expect(ids({ date: "LAST_90_DAYS" })).toEqual(["active", "ended"]);
  });

  it("shows Drafts only under All time", () => {
    expect(ids({ date: "THIS_YEAR" })).not.toContain("draft");
    expect(ids({ date: "ALL_TIME" })).toContain("draft");
  });

  it("matches any of the chosen statuses", () => {
    expect(ids({ statuses: ["Active", "Draft"] })).toEqual(["active", "draft"]);
  });

  it("matches any of the chosen regions", () => {
    expect(ids({ regions: ["Canada"] })).toEqual(["ended"]);
  });

  it("matches campaigns with any of the chosen channels", () => {
    expect(ids({ channels: ["EMAIL"] })).toEqual(["active"]);
  });

  it("requires every filter to match at once", () => {
    expect(ids({ search: "giving", statuses: ["Ended"] })).toEqual([]);
  });
});

describe("sortCampaigns", () => {
  const rows: CampaignRow[] = toCampaignRows(
    [
      campaign({ campaignId: "draft-b", name: "B draft" }),
      campaign({ campaignId: "older", name: "Older" }),
      campaign({ campaignId: "draft-a", name: "A draft" }),
      campaign({ campaignId: "newer", name: "Newer" }),
    ],
    [range("older", 90, 60), range("newer", 30, 1)],
    NOW,
  );
  const ids = (sorted: CampaignRow[]) =>
    sorted.map((row) => row.campaign.campaignId);

  it("puts the most recent campaign first by default, Drafts last", () => {
    expect(ids(sortCampaigns(rows))).toEqual([
      "newer",
      "older",
      "draft-a",
      "draft-b",
    ]);
  });

  it("keeps Drafts last when sorting oldest first", () => {
    expect(ids(sortCampaigns(rows, "asc"))).toEqual([
      "older",
      "newer",
      "draft-a",
      "draft-b",
    ]);
  });

  it("breaks ties on the same end date by name", () => {
    const tied = toCampaignRows(
      [
        campaign({ campaignId: "z", name: "Zeta" }),
        campaign({ campaignId: "a", name: "Alpha" }),
      ],
      [range("z", 10, 5), range("a", 20, 5)],
      NOW,
    );
    expect(ids(sortCampaigns(tied))).toEqual(["a", "z"]);
  });

  it("does not reorder the list it was given", () => {
    sortCampaigns(rows);
    expect(ids(rows)).toEqual(["draft-b", "older", "draft-a", "newer"]);
  });
});
