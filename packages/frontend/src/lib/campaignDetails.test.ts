import type { EmailCampaignSummary, LinkedItem } from "@repo/common";
import { describe, expect, it } from "vitest";
import { lastDays, linkedEmails } from "@frontend/lib/campaignDetails.ts";

function email(id: string, sentAt: string): EmailCampaignSummary {
  return {
    emailCampaignId: id,
    name: `Email ${id}`,
    region: "US",
    platform: "MailChimp",
    sentAt,
  };
}

function links(...ids: string[]): { linkedItems: LinkedItem[] } {
  return { linkedItems: ids.map((id) => ({ type: "EMAIL", id })) };
}

describe("linkedEmails", () => {
  const emails = [
    email("b", "2026-10-05T09:00:00.000Z"),
    email("unlinked", "2026-09-01T09:00:00.000Z"),
    email("a", "2026-09-20T15:30:00.000Z"),
    email("c", "2026-10-05T08:59:59.999Z"),
  ];

  it("keeps only linked emails, oldest first", () => {
    const ids = linkedEmails(links("b", "a", "c"), emails).map(
      (e) => e.emailCampaignId,
    );
    expect(ids).toEqual(["a", "c", "b"]);
  });

  it("skips links whose email no longer exists", () => {
    const ids = linkedEmails(links("gone", "a"), emails).map(
      (e) => e.emailCampaignId,
    );
    expect(ids).toEqual(["a"]);
  });

  it("returns nothing for a campaign with no links", () => {
    expect(linkedEmails(links(), emails)).toEqual([]);
  });
});

describe("lastDays", () => {
  // 2026-08-01 through 2026-10-29, deliberately out of order.
  const data = Array.from({ length: 90 }, (_, i) => {
    const date = new Date(Date.UTC(2026, 7, 1 + i));
    return { date: date.toISOString().slice(0, 10) };
  }).reverse();

  it.each([90, 30, 7])("keeps %i days ending at the latest date", (days) => {
    const kept = lastDays(data, days).map((entry) => entry.date);
    expect(kept).toHaveLength(days);
    expect(kept).toContain("2026-10-29");
  });

  it("crosses month boundaries", () => {
    const kept = lastDays(data, 30).map((entry) => entry.date);
    expect(kept.toSorted()[0]).toBe("2026-09-30");
  });

  it("ignores today, so old data stays visible", () => {
    const old = [{ date: "2001-01-01" }, { date: "2001-01-02" }];
    expect(lastDays(old, 7)).toEqual(old);
  });

  it("handles empty data", () => {
    expect(lastDays([], 7)).toEqual([]);
  });
});
