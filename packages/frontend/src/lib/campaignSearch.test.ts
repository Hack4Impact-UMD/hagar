import { describe, expect, it } from "vitest";
import { NO_FILTERS } from "@frontend/components/campaigns-list/campaign-list.ts";
import {
  parseCampaignSearch,
  toFilters,
  toSortDirection,
} from "@frontend/lib/campaignSearch.ts";

describe("parseCampaignSearch", () => {
  it("returns all defaults for an empty URL", () => {
    expect(parseCampaignSearch({})).toEqual({});
  });

  it("keeps every valid value", () => {
    const search = {
      q: "appeal",
      date: "LAST_90_DAYS",
      status: ["Active", "Ended"],
      region: ["US"],
      channel: ["EMAIL"],
      sort: "asc",
    };
    expect(parseCampaignSearch(search)).toEqual(search);
  });

  it("drops unknown values instead of throwing", () => {
    expect(
      parseCampaignSearch({
        date: "forever",
        status: "Active",
        region: ["Mars"],
        sort: "newest",
      }),
    ).toEqual({});
  });

  it("drops ALL_TIME, since it is the default", () => {
    expect(parseCampaignSearch({ date: "ALL_TIME" })).toEqual({});
  });

  it("keeps the valid entries of a list and drops the rest", () => {
    expect(parseCampaignSearch({ status: ["Ended", "Bogus"] })).toEqual({
      status: ["Ended"],
    });
  });

  it("removes duplicates and puts list entries in a fixed order", () => {
    expect(
      parseCampaignSearch({ status: ["Draft", "Ended", "Draft"] }),
    ).toEqual({ status: ["Ended", "Draft"] });
  });

  it("reads a numeric search as text", () => {
    expect(parseCampaignSearch({ q: 2026 })).toEqual({ q: "2026" });
  });

  it("treats an empty search as no search", () => {
    expect(parseCampaignSearch({ q: "" })).toEqual({});
  });
});

describe("toFilters", () => {
  it("turns an empty URL into no filters", () => {
    expect(toFilters({})).toEqual(NO_FILTERS);
  });

  it("carries every URL value into the filters", () => {
    expect(
      toFilters({
        q: "appeal",
        date: "THIS_YEAR",
        status: ["Active"],
        region: ["Canada"],
        channel: ["EMAIL"],
      }),
    ).toEqual({
      search: "appeal",
      date: "THIS_YEAR",
      statuses: ["Active"],
      regions: ["Canada"],
      channels: ["EMAIL"],
    });
  });
});

describe("toSortDirection", () => {
  it("sorts newest first unless the URL asks otherwise", () => {
    expect(toSortDirection({})).toBe("desc");
    expect(toSortDirection({ sort: "asc" })).toBe("asc");
  });
});
