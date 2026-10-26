import { type } from "arktype";
import { describe, expect, it } from "vitest";
import {
  campaign,
  getCampaignInput,
  linkedItem,
  linkedItemInput,
  setCampaignNotesInput,
  storedCampaign,
  utmCodeInput,
  withLinkedItem,
  withUtmCode,
  withoutLinkedItem,
  withoutUtmCode,
} from "@common/campaigns.ts";

const stored = {
  name: "Spring launch",
  region: "US",
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

  it("requires one of the known regions", () => {
    const { region: _region, ...withoutRegion } = stored;
    expect(storedCampaign(withoutRegion)).toBeInstanceOf(type.errors);
    for (const region of ["UK", "", null]) {
      expect(storedCampaign({ ...stored, region })).toBeInstanceOf(type.errors);
    }
    expect(storedCampaign({ ...stored, region: "New Zealand" })).toMatchObject({
      region: "New Zealand",
    });
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

describe("campaign procedure inputs", () => {
  it("accept only the declared keys", () => {
    expect(getCampaignInput({ campaignId: "c-1" })).toEqual({
      campaignId: "c-1",
    });
    expect(setCampaignNotesInput({ campaignId: "c-1", notes: "" })).toEqual({
      campaignId: "c-1",
      notes: "",
    });
    const item = { type: "EMAIL", id: "email-1" };
    expect(linkedItemInput({ campaignId: "c-1", item })).toEqual({
      campaignId: "c-1",
      item,
    });
    expect(utmCodeInput({ campaignId: "c-1", utmCode: "spring" })).toEqual({
      campaignId: "c-1",
      utmCode: "spring",
    });
  });

  it("reject undeclared keys, including inside a linked item", () => {
    const item = { type: "EMAIL", id: "email-1" };
    for (const result of [
      getCampaignInput({ campaignId: "c-1", extra: 1 }),
      setCampaignNotesInput({
        campaignId: "c-1",
        notes: "x",
        updatedAt: stored.updatedAt,
      }),
      linkedItemInput({ campaignId: "c-1", item: { ...item, extra: 1 } }),
      utmCodeInput({ campaignId: "c-1", utmCode: "x", extra: 1 }),
    ]) {
      expect(result).toBeInstanceOf(type.errors);
    }
  });

  it("reject an empty id, an empty UTM code, and over-long notes", () => {
    expect(getCampaignInput({ campaignId: "" })).toBeInstanceOf(type.errors);
    expect(utmCodeInput({ campaignId: "c-1", utmCode: "" })).toBeInstanceOf(
      type.errors,
    );
    expect(
      setCampaignNotesInput({ campaignId: "c-1", notes: "x".repeat(10_001) }),
    ).toBeInstanceOf(type.errors);
  });
});

describe("campaign list edits", () => {
  const email1 = { type: "EMAIL", id: "email-1" } as const;
  const email2 = { type: "EMAIL", id: "email-2" } as const;
  const base = storedCampaign.assert(stored);

  it("adds a link, or returns the same object if it is already there", () => {
    expect(withLinkedItem(base, email2).linkedItems).toEqual([email1, email2]);
    expect(withLinkedItem(base, email1)).toBe(base);
  });

  it("removes a link, or returns the same object if it is not there", () => {
    expect(withoutLinkedItem(base, email1).linkedItems).toEqual([]);
    expect(withoutLinkedItem(base, email2)).toBe(base);
  });

  it("adds a UTM code, or returns the same object if it is already there", () => {
    expect(withUtmCode(base, "new").utmCodes).toEqual([
      ...base.utmCodes,
      "new",
    ]);
    expect(withUtmCode(base, "spring_launch")).toBe(base);
    expect(withUtmCode(base, "SPRING_LAUNCH").utmCodes).toHaveLength(3);
  });

  it("removes a UTM code, or returns the same object if it is not there", () => {
    expect(withoutUtmCode(base, "spring_launch").utmCodes).toEqual([
      "spring_launch_email",
    ]);
    expect(withoutUtmCode(base, "SPRING_LAUNCH")).toBe(base);
  });

  it("never changes the campaign it was given", () => {
    const before = JSON.parse(JSON.stringify(base));
    withLinkedItem(base, email2);
    withoutLinkedItem(base, email1);
    withUtmCode(base, "new");
    withoutUtmCode(base, "spring_launch");
    expect(base).toEqual(before);
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
