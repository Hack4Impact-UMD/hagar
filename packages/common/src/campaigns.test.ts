import { type } from "arktype";
import { describe, expect, it } from "vitest";
import type { Campaign } from "@common/campaigns.ts";
import {
  campaignDateRanges,
  createCampaignInput,
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
      createCampaignInput({ name: "x", region: "US", linkedItems: [] }),
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

describe("campaignDateRanges", () => {
  function campaignWith(campaignId: string, emailIds: string[]): Campaign {
    return {
      ...storedCampaign.assert(stored),
      campaignId,
      linkedItems: emailIds.map((id) => ({ type: "EMAIL", id })),
    };
  }

  const emails = [
    { emailCampaignId: "march", sentAt: "2024-03-01T09:00:00.000Z" },
    { emailCampaignId: "april", sentAt: "2024-04-01T09:00:00.000Z" },
    { emailCampaignId: "may", sentAt: "2024-05-01T09:00:00.000Z" },
  ];

  it.fails("returns nothing when there are no campaigns", () => {
    expect(campaignDateRanges([], emails)).toEqual([]);
  });

  it.fails("leaves out a campaign with no dated emails", () => {
    expect(campaignDateRanges([campaignWith("c-1", [])], emails)).toEqual([]);
  });

  it.fails("skips a linked email that is not in the list", () => {
    expect(
      campaignDateRanges([campaignWith("c-1", ["deleted", "april"])], emails),
    ).toEqual([
      {
        campaignId: "c-1",
        startDate: "2024-04-01T09:00:00.000Z",
        endDate: "2024-04-01T09:00:00.000Z",
      },
    ]);
  });

  it.fails("starts and ends on the same date for one email", () => {
    expect(campaignDateRanges([campaignWith("c-1", ["may"])], emails)).toEqual([
      {
        campaignId: "c-1",
        startDate: "2024-05-01T09:00:00.000Z",
        endDate: "2024-05-01T09:00:00.000Z",
      },
    ]);
  });

  it.fails("runs from the earliest email to the latest, whatever the link order", () => {
    expect(
      campaignDateRanges(
        [campaignWith("c-1", ["april", "may", "march"])],
        emails,
      ),
    ).toEqual([
      {
        campaignId: "c-1",
        startDate: "2024-03-01T09:00:00.000Z",
        endDate: "2024-05-01T09:00:00.000Z",
      },
    ]);
  });

  it.fails("counts an email linked by two campaigns in both", () => {
    expect(
      campaignDateRanges(
        [
          campaignWith("c-1", ["march", "april"]),
          campaignWith("c-2", ["april"]),
        ],
        emails,
      ),
    ).toEqual([
      {
        campaignId: "c-1",
        startDate: "2024-03-01T09:00:00.000Z",
        endDate: "2024-04-01T09:00:00.000Z",
      },
      {
        campaignId: "c-2",
        startDate: "2024-04-01T09:00:00.000Z",
        endDate: "2024-04-01T09:00:00.000Z",
      },
    ]);
  });
});
