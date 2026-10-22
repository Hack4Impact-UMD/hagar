import { type } from "arktype";
import { utcDateString } from "@common/dates.ts";

/**
 * Something a campaign is tied to. Add a variant per kind of linked item, each
 * with its own `type`, so the union stays discriminated.
 */
export const linkedItem = type({
  type: "'EMAIL'",
  // An `emailCampaignId`, not the platform's own campaign id.
  id: "string >= 1",
});
export type LinkedItem = typeof linkedItem.infer;

/** The shape stored at `campaigns/{campaignId}`. `campaignId` is the document id. */
export const storedCampaign = type({
  // Length caps exist only to bound abuse. They sit far above any real value.
  name: "1 <= string <= 500",
  notes: "string <= 10000",
  updatedAt: utcDateString,
  utmCodes: type("1 <= string <= 500").array(),
  linkedItems: linkedItem.array(),
});
export type StoredCampaign = typeof storedCampaign.infer;

export const campaign = type({ campaignId: "string >= 1" }).and(storedCampaign);
export type Campaign = typeof campaign.infer;
