import { type } from "arktype";

export const EmailPlatform = type(
  "'MailChimp' | 'Campaign_Monitor' | 'Klaviyo'",
);
const count = type("number.integer >= 0");

export const EmailListCountSnapshot = type({
  count: count,
  fetchedAt: type("Date"),
});
export const EmailList = type({
  platform: EmailPlatform,
  platformListID: "string >= 1",
  name: "string",
  lastFetchedAt: type("Date"),
  snapshots: EmailListCountSnapshot.array().atLeastLength(1),
});
export const EmailCampaignSnapshot = type({
  fetchedAt: type("Date"),
  bounced: count,
  uniqOpens: count,
  uniqClicks: count,
  unsubscribers: count,
  complaints: count,
});
export const EmailCampaignRecord = type({
  platform: EmailPlatform,
  platformCampaignID: "string >= 1",
  listIDs: "string[] >= 1",
  name: "string",
  content: type("URL"),
  sentAt: type("Date"),
  sent: count,
  lastFetchedAt: type("Date"),
  snapshots: EmailCampaignSnapshot.array().atLeastLength(1),
});

export type EmailPlatform = typeof EmailPlatform.infer;
export type EmailListCountSnapshot = typeof EmailListCountSnapshot.infer;
export type EmailList = typeof EmailList.infer;
export type EmailCampaignSnapshot = typeof EmailCampaignSnapshot.infer;
export type EmailCampaignRecord = typeof EmailCampaignRecord.infer;
