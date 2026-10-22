import { type } from "arktype";
import { utcDateString } from "@common/dates.ts";

/**
 * Something a campaign is tied to. Add a variant per kind of linked item, each
 * with its own `type`, so the union stays discriminated.
 */
export const linkedItem = type({
  type: "'EMAIL'",
  // The id of the item in our own database. For an email campaign that is its
  // `emailCampaignId`, not the platform's own campaign id.
  id: "string >= 1",
});
export type LinkedItem = typeof linkedItem.infer;

const campaignId = type("string >= 1");
// Length caps exist only to bound abuse. They sit far above any real value.
const campaignNotes = type("string <= 10000");
const utmCode = type("1 <= string <= 500");

/** The shape stored at `campaigns/{campaignId}`. `campaignId` is the document id. */
export const storedCampaign = type({
  name: "1 <= string <= 500",
  notes: campaignNotes,
  updatedAt: utcDateString,
  utmCodes: utmCode.array(),
  linkedItems: linkedItem.array(),
});
export type StoredCampaign = typeof storedCampaign.infer;

export const campaign = type({ campaignId }).and(storedCampaign);
export type Campaign = typeof campaign.infer;

export function isSameLinkedItem(a: LinkedItem, b: LinkedItem): boolean {
  return a.type === b.type && a.id === b.id;
}

/*
 * Pure edits to a campaign's lists. Each returns the very same object when
 * there is nothing to change, so a caller can compare references to skip the
 * write and leave `updatedAt` alone. UTM codes are compared exactly, so codes
 * that differ only in case are different codes.
 */

export function withLinkedItem(
  stored: StoredCampaign,
  item: LinkedItem,
): StoredCampaign {
  if (stored.linkedItems.some((existing) => isSameLinkedItem(existing, item))) {
    return stored;
  }
  return { ...stored, linkedItems: [...stored.linkedItems, item] };
}

export function withoutLinkedItem(
  stored: StoredCampaign,
  item: LinkedItem,
): StoredCampaign {
  const linkedItems = stored.linkedItems.filter(
    (existing) => !isSameLinkedItem(existing, item),
  );
  return linkedItems.length === stored.linkedItems.length
    ? stored
    : { ...stored, linkedItems };
}

export function withUtmCode(
  stored: StoredCampaign,
  code: string,
): StoredCampaign {
  if (stored.utmCodes.includes(code)) return stored;
  return { ...stored, utmCodes: [...stored.utmCodes, code] };
}

export function withoutUtmCode(
  stored: StoredCampaign,
  code: string,
): StoredCampaign {
  const utmCodes = stored.utmCodes.filter((existing) => existing !== code);
  return utmCodes.length === stored.utmCodes.length
    ? stored
    : { ...stored, utmCodes };
}

// Every procedure input rejects undeclared keys. ArkType passes them through
// by default, which would let a caller send fields like `updatedAt` along.
export const getCampaignInput = type({ campaignId }).onUndeclaredKey("reject");
export type GetCampaignInput = typeof getCampaignInput.infer;

export const setCampaignNotesInput = type({
  campaignId,
  notes: campaignNotes,
}).onUndeclaredKey("reject");
export type SetCampaignNotesInput = typeof setCampaignNotesInput.infer;

export const linkedItemInput = type({
  campaignId,
  item: linkedItem.onUndeclaredKey("reject"),
}).onUndeclaredKey("reject");
export type LinkedItemInput = typeof linkedItemInput.infer;

export const utmCodeInput = type({ campaignId, utmCode }).onUndeclaredKey(
  "reject",
);
export type UtmCodeInput = typeof utmCodeInput.infer;
