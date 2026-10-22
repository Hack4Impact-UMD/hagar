import { type } from "arktype";
import { describe, expect, it } from "vitest";
import {
  EmailCampaignRecord,
  StoredEmailCampaignRecord,
} from "@common/emails.ts";

// This package's TypeScript lib has no DOM or Node types, so `URL` is not
// declared here, although the runtime provides it.
const URL = (globalThis as unknown as { URL: new (href: string) => unknown })
  .URL;

const fetchedAt = "2024-05-01T12:30:00.000Z";
const stored = {
  platform: "Klaviyo",
  platformCampaignID: "k-1",
  listIDs: ["list-1"],
  name: "Spring launch",
  content: new URL("https://example.com/campaign"),
  sentAt: "2024-04-30T09:00:00.000Z",
  sent: 1200,
  lastFetchedAt: fetchedAt,
  notes: "",
  snapshots: [
    {
      fetchedAt,
      bounced: 1,
      uniqOpens: 2,
      uniqClicks: 3,
      unsubscribers: 4,
      complaints: 5,
    },
  ],
};

describe("StoredEmailCampaignRecord", () => {
  it("accepts a campaign with every field", () => {
    expect(StoredEmailCampaignRecord(stored)).toEqual(stored);
  });

  it("accepts a campaign whose platform reports no send time or count", () => {
    const { sentAt: _sentAt, sent: _sent, ...withoutSendInfo } = stored;
    expect(StoredEmailCampaignRecord(withoutSendInfo)).toEqual(withoutSendInfo);
  });

  it("still validates the send time and count when they are present", () => {
    expect(
      StoredEmailCampaignRecord({ ...stored, sentAt: "2024-04-30" }),
    ).toBeInstanceOf(type.errors);
    expect(StoredEmailCampaignRecord({ ...stored, sent: -1 })).toBeInstanceOf(
      type.errors,
    );
    expect(
      StoredEmailCampaignRecord({ ...stored, sentAt: undefined }),
    ).toBeInstanceOf(type.errors);
  });
});

describe("EmailCampaignRecord", () => {
  it("adds our own id to the stored shape", () => {
    const record = { emailCampaignId: "email-1", ...stored };
    expect(EmailCampaignRecord(record)).toEqual(record);
    expect(EmailCampaignRecord(stored)).toBeInstanceOf(type.errors);
    expect(
      EmailCampaignRecord({ ...stored, emailCampaignId: "" }),
    ).toBeInstanceOf(type.errors);
  });
});
