import { type } from "arktype";
import { describe, expect, it } from "vitest";
import {
  getCampaignInput,
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

describe("campaign procedure inputs", () => {
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
