import {
  storedCampaign,
  nowUtc,
  withLinkedItem,
  withoutLinkedItem,
  withUtmCode,
  withoutUtmCode,
} from "@repo/common";
import type {
  ActiveUserProfile,
  Campaign,
  GetCampaignInput,
  LinkedItem,
  LinkedItemInput,
  SetCampaignNotesInput,
  StoredCampaign,
  UtmCodeInput,
} from "@repo/common";
import { TRPCError } from "@trpc/server";
import type { Firestore, Transaction } from "firebase-admin/firestore";

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
export async function listCampaigns(
  db: Firestore,
  _actor: ActiveUserProfile,
): Promise<Campaign[]> {
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("updatedAt", "desc")
    .get();
  return snapshot.docs.map((doc) => toCampaign(doc.id, doc.data()));
}

/** Returns one campaign, or throws `NOT_FOUND`. */
export async function getCampaign(
  db: Firestore,
  _actor: ActiveUserProfile,
  input: GetCampaignInput,
): Promise<Campaign> {
  const doc = await db.collection(COLLECTION).doc(input.campaignId).get();
  if (!doc.exists) throw campaignNotFound();
  return toCampaign(doc.id, doc.data());
}

/**
 * Runs `edit` on a campaign in one transaction and saves only `field`, plus a
 * fresh `updatedAt`. When `edit` returns the campaign it was given, nothing is
 * written. `edit` may read more documents through `tx`, since every write
 * happens after it returns.
 */
function editCampaign<K extends keyof StoredCampaign>(
  db: Firestore,
  campaignId: string,
  field: K,
  edit: (
    current: StoredCampaign,
    tx: Transaction,
  ) => StoredCampaign | Promise<StoredCampaign>,
): Promise<Campaign> {
  const ref = db.collection(COLLECTION).doc(campaignId);

  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw campaignNotFound();
    const current = parseStoredCampaign.assert(snapshot.data());

    const next = await edit(current, tx);
    if (next === current) return { campaignId, ...current };

    const updatedAt = nowUtc();
    tx.update(ref, { [field]: next[field], updatedAt });
    return { campaignId, ...next, updatedAt };
  });
}

/** Replaces a campaign's notes and bumps `updatedAt`. */
export function setCampaignNotes(
  db: Firestore,
  _actor: ActiveUserProfile,
  input: SetCampaignNotesInput,
): Promise<Campaign> {
  return editCampaign(db, input.campaignId, "notes", (current) => ({
    ...current,
    notes: input.notes,
  }));
}

/**
 * Links an item, such as an email campaign, to a campaign. Adding a link the
 * campaign already has changes nothing. Throws `NOT_FOUND` if the item does
 * not exist.
 */
export function addLinkedItem(
  db: Firestore,
  _actor: ActiveUserProfile,
  input: LinkedItemInput,
): Promise<Campaign> {
  const itemRef = db
    .collection(LINKED_ITEM_COLLECTIONS[input.item.type])
    .doc(input.item.id);

  return editCampaign(
    db,
    input.campaignId,
    "linkedItems",
    async (current, tx) => {
      const item = await tx.get(itemRef);
      if (!item.exists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "That linked item does not exist.",
        });
      }
      return withLinkedItem(current, input.item);
    },
  );
}

/** Removes a link. Removing one the campaign does not have changes nothing. */
export function removeLinkedItem(
  db: Firestore,
  _actor: ActiveUserProfile,
  input: LinkedItemInput,
): Promise<Campaign> {
  return editCampaign(db, input.campaignId, "linkedItems", (current) =>
    withoutLinkedItem(current, input.item),
  );
}

/**
 * Adds a UTM code. Adding one the campaign already has changes nothing. Codes
 * are compared exactly, so differing only in case makes a different code.
 */
export function addUtmCode(
  db: Firestore,
  _actor: ActiveUserProfile,
  input: UtmCodeInput,
): Promise<Campaign> {
  return editCampaign(db, input.campaignId, "utmCodes", (current) =>
    withUtmCode(current, input.utmCode),
  );
}

/** Removes a UTM code. Removing one the campaign does not have changes nothing. */
export function removeUtmCode(
  db: Firestore,
  _actor: ActiveUserProfile,
  input: UtmCodeInput,
): Promise<Campaign> {
  return editCampaign(db, input.campaignId, "utmCodes", (current) =>
    withoutUtmCode(current, input.utmCode),
  );
}
