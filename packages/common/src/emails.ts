import { type } from "arktype";
import { utcDateString } from "@common/dates.ts";

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
export const EmailCampaignRecord = type({
  platform: EmailPlatform,
  platformCampaignID: "string >= 1",
  listIDs: "string[]",
  name: "string",
  content: type("URL"),
  sentAt: utcDateString,
  sent: count,
  lastFetchedAt: utcDateString,
  notes: "string",
  snapshots: EmailCampaignSnapshot.array().atLeastLength(1),
});

export type EmailPlatform = typeof EmailPlatform.infer;
export type EmailListCountSnapshot = typeof EmailListCountSnapshot.infer;
export type EmailList = typeof EmailList.infer;
export type EmailCampaignSnapshot = typeof EmailCampaignSnapshot.infer;
export type EmailCampaignRecord = typeof EmailCampaignRecord.infer;
