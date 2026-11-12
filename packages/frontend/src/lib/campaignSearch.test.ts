import { describe, expect, it } from "vitest";
import { parseCampaignSearch } from "@frontend/lib/campaignSearch.ts";

describe("parseCampaignSearch", () => {
  it("returns all defaults for an empty URL", () => {
    expect(parseCampaignSearch({})).toEqual({});
  });

  it("keeps every valid value", () => {
    const search = {
      q: "appeal",
      date: "90d",
      status: ["Active", "Ended"],
      region: ["US"],
      channel: ["EMAIL"],
      sort: "oldest",
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

  it("keeps the valid entries of a list and drops the rest", () => {
    expect(parseCampaignSearch({ status: ["Ended", "Bogus"] })).toEqual({
      status: ["Ended"],
    });
  });

  it("removes duplicates and puts list entries in a fixed order", () => {
    expect(
      parseCampaignSearch({ status: ["Ended", "Draft", "Ended"] }),
    ).toEqual({ status: ["Draft", "Ended"] });
  });

  it("reads a numeric search as text", () => {
    expect(parseCampaignSearch({ q: 2026 })).toEqual({ q: "2026" });
  });

  it("treats an empty search as no search", () => {
    expect(parseCampaignSearch({ q: "" })).toEqual({});
  });
});
