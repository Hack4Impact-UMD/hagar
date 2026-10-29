import { type } from "arktype";
import { utcDateString } from "@common/dates.ts";
import { userRegion } from "@common/user.ts";

export const EmailPlatform = type(
  "'MailChimp' | 'Campaign_Monitor' | 'Klaviyo' | 'Virtuous'",
);
const count = type("number.integer >= 0");

export const EmailListCountSnapshot = type({
  count: count,
  fetchedAt: utcDateString,
});
export const EmailList = type({
  platform: EmailPlatform,
  platformListID: "string >= 1",
  name: "string",
  lastFetchedAt: utcDateString,
  snapshots: EmailListCountSnapshot.array().atLeastLength(1),
});
export const EmailCampaignSnapshot = type({
  fetchedAt: utcDateString,
  bounced: count,
  uniqOpens: count,
  uniqClicks: count,
  unsubscribers: count,
  complaints: count,
});
/**
 * What we know about a campaign from its platform, and what is stored at
 * `email-campaigns/{emailCampaignId}`. Platforms do not know our id, so
 * fetching returns this shape.
 */
export const StoredEmailCampaignRecord = type({
  platform: EmailPlatform,
  // Platforms do not report this, so whatever syncs the campaign sets it. It
  // describes the campaign and does not limit who can see or change it.
  region: userRegion,
  platformCampaignID: "string >= 1",
  listIDs: "string[]",
  name: "string",
  content: type("URL"),
  // Some platforms report neither of these.
  "sentAt?": utcDateString,
  "sent?": count,
  lastFetchedAt: utcDateString,
  notes: "string",
  // Empty for platforms that report no stats, such as Virtuous.
  snapshots: EmailCampaignSnapshot.array(),
});
/** Our own id for the campaign, which other records such as campaigns link to. */
export const EmailCampaignRecord = type({ emailCampaignId: "string >= 1" }).and(
  StoredEmailCampaignRecord,
);

export type EmailPlatform = typeof EmailPlatform.infer;
export type EmailListCountSnapshot = typeof EmailListCountSnapshot.infer;
export type EmailList = typeof EmailList.infer;
export type EmailCampaignSnapshot = typeof EmailCampaignSnapshot.infer;
export type StoredEmailCampaignRecord = typeof StoredEmailCampaignRecord.infer;
export type EmailCampaignRecord = typeof EmailCampaignRecord.infer;
