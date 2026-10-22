import { storedCampaign } from "@repo/common";
import type {
  ActiveUserProfile,
  Campaign,
  GetCampaignInput,
  LinkedItem,
  LinkedItemInput,
  SetCampaignNotesInput,
  UtmCodeInput,
} from "@repo/common";
import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";

export const COLLECTION = "campaigns";
/**
 * The collection each kind of linked item points into, by the item's `type`.
 * Typed against `LinkedItem` so adding a new kind of item fails to compile
 * until it is given a collection here.
 */
export const LINKED_ITEM_COLLECTIONS: Record<LinkedItem["type"], string> = {
  // Documents are `EmailCampaignRecord`s, keyed by `emailCampaignId`.
  EMAIL: "email-campaigns",
};

// Drops any stray fields in the document so they never reach the client.
export const parseStoredCampaign = storedCampaign.onUndeclaredKey("delete");

/** Turns a `campaigns/{id}` document into the shape procedures return. */
export function toCampaign(id: string, data: unknown): Campaign {
  return { campaignId: id, ...parseStoredCampaign.assert(data) };
}

export function campaignNotFound(): TRPCError {
  return new TRPCError({
    code: "NOT_FOUND",
    message: "That campaign does not exist.",
  });
}

/** Lists every campaign, most recently updated first. */
export function listCampaigns(
  _db: Firestore,
  _actor: ActiveUserProfile,
): Promise<Campaign[]> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "campaigns.list is not implemented yet.",
  });
}

/** Returns one campaign, or throws `NOT_FOUND`. */
export function getCampaign(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: GetCampaignInput,
): Promise<Campaign> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "campaigns.get is not implemented yet.",
  });
}

/** Replaces a campaign's notes and bumps `updatedAt`. */
export function setCampaignNotes(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: SetCampaignNotesInput,
): Promise<Campaign> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "campaigns.setNotes is not implemented yet.",
  });
}

/**
 * Links an item, such as an email campaign, to a campaign. Adding a link the
 * campaign already has changes nothing. Throws `NOT_FOUND` if the item does
 * not exist.
 */
export function addLinkedItem(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: LinkedItemInput,
): Promise<Campaign> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "campaigns.addLinkedItem is not implemented yet.",
  });
}

/** Removes a link. Removing one the campaign does not have changes nothing. */
export function removeLinkedItem(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: LinkedItemInput,
): Promise<Campaign> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "campaigns.removeLinkedItem is not implemented yet.",
  });
}

/**
 * Adds a UTM code. Adding one the campaign already has changes nothing. Codes
 * are compared exactly, so differing only in case makes a different code.
 */
export function addUtmCode(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: UtmCodeInput,
): Promise<Campaign> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "campaigns.addUtmCode is not implemented yet.",
  });
}

/** Removes a UTM code. Removing one the campaign does not have changes nothing. */
export function removeUtmCode(
  _db: Firestore,
  _actor: ActiveUserProfile,
  _input: UtmCodeInput,
): Promise<Campaign> {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "campaigns.removeUtmCode is not implemented yet.",
  });
}
