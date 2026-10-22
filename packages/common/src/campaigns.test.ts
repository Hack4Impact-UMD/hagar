import { type } from "arktype";
import { describe, expect, it } from "vitest";
import { campaign, linkedItem, storedCampaign } from "@common/campaigns.ts";

const stored = {
  name: "Spring launch",
  notes: "Targets returning donors",
  updatedAt: "2024-05-01T12:30:00.000Z",
  utmCodes: ["spring_launch", "spring_launch_email"],
  linkedItems: [{ type: "EMAIL", id: "email-1" }],
};

describe("linkedItem", () => {
  it("accepts an email link", () => {
    expect(linkedItem({ type: "EMAIL", id: "email-1" })).toEqual({
      type: "EMAIL",
      id: "email-1",
    });
  });

  it("rejects an unknown type or a missing id", () => {
    expect(linkedItem({ type: "SMS", id: "sms-1" })).toBeInstanceOf(
      type.errors,
    );
    expect(linkedItem({ type: "EMAIL", id: "" })).toBeInstanceOf(type.errors);
    expect(linkedItem({ type: "EMAIL" })).toBeInstanceOf(type.errors);
  });
});

describe("storedCampaign", () => {
  it("accepts a campaign, including one with no codes or links yet", () => {
    expect(storedCampaign(stored)).toEqual(stored);
    expect(
      storedCampaign({ ...stored, utmCodes: [], linkedItems: [] }),
    ).toEqual({ ...stored, utmCodes: [], linkedItems: [] });
  });

  it("requires a UTC date string for the update time", () => {
    for (const updatedAt of [1714566600000, "2024-05-01", "yesterday"]) {
      expect(storedCampaign({ ...stored, updatedAt })).toBeInstanceOf(
        type.errors,
      );
    }
  });

  it("rejects an empty name, an empty UTM code, or a bad link", () => {
    expect(storedCampaign({ ...stored, name: "" })).toBeInstanceOf(type.errors);
    expect(storedCampaign({ ...stored, utmCodes: [""] })).toBeInstanceOf(
      type.errors,
    );
    expect(
      storedCampaign({ ...stored, linkedItems: [{ type: "SMS", id: "x" }] }),
    ).toBeInstanceOf(type.errors);
  });
});

describe("campaign", () => {
  it("adds the document id to the stored shape", () => {
    expect(campaign({ campaignId: "campaign-1", ...stored })).toEqual({
      campaignId: "campaign-1",
      ...stored,
    });
    expect(campaign(stored)).toBeInstanceOf(type.errors);
  });
});
