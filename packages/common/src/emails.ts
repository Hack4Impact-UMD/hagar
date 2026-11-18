import { type } from "arktype";
import type { UtcDateString } from "@common/dates.ts";
import { utcDateString } from "@common/dates.ts";
import { userRegion } from "@common/user.ts";

export const EmailPlatform = type(
  "'MailChimp' | 'Campaign_Monitor' | 'Klaviyo'",
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
/** The counts a snapshot reports for a campaign, by name. */
export const EmailCampaignMetric =
  EmailCampaignSnapshot.omit("fetchedAt").keyof();
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
  snapshots: EmailCampaignSnapshot.array().atLeastLength(1),
});
/** Our own id for the campaign, which other records such as campaigns link to. */
export const EmailCampaignRecord = type({ emailCampaignId: "string >= 1" }).and(
  StoredEmailCampaignRecord,
);

export type EmailPlatform = typeof EmailPlatform.infer;
export type EmailListCountSnapshot = typeof EmailListCountSnapshot.infer;
export type EmailList = typeof EmailList.infer;
export type EmailCampaignSnapshot = typeof EmailCampaignSnapshot.infer;
export type EmailCampaignMetric = typeof EmailCampaignMetric.infer;
export type StoredEmailCampaignRecord = typeof StoredEmailCampaignRecord.infer;
export type EmailCampaignRecord = typeof EmailCampaignRecord.infer;

// Procedure inputs reject undeclared keys, as in `campaigns.ts`.
export const listEmailCampaignsInput = type({
  "sentFrom?": utcDateString,
  sentTo: utcDateString,
}).onUndeclaredKey("reject");
export type ListEmailCampaignsInput = typeof listEmailCampaignsInput.infer;

/** What `emails.campaigns` returns for each email: only emails with a `sentAt`. */
export type EmailCampaignSummary = Pick<
  EmailCampaignRecord,
  "emailCampaignId" | "name" | "region" | "platform"
> & { sentAt: UtcDateString };

/** What `emails.lists` returns for each list. */
export type EmailListSummary = { emailListId: string } & Pick<
  EmailList,
  "name" | "platform"
>;
