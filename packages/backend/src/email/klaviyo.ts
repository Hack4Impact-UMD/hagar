import { type } from "arktype";
import { EmailList } from "@repo/common";
import type { EmailPlatform } from "@repo/common";
import { Timestamp } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { klaviyoGet, klaviyoGetAllPages } from "@backend/email/klaviyoApi.ts";

const LISTS_COLLECTION = "email-lists";
const PLATFORM: EmailPlatform = "Klaviyo";

const listsPage = type({ data: type({ id: "string >= 1" }).array() });
const listResponse = type({
  data: {
    attributes: { name: "string", profile_count: "number.integer >= 0" },
  },
});

/**
 * Document IDs embed the platform so a list ID from another platform can never
 * collide, and a list can be found without a query.
 */
function listRef(db: Firestore, listID: string) {
  return db.collection(LISTS_COLLECTION).doc(`${PLATFORM}_${listID}`);
}

/**
 * The Admin SDK stores a `Date` as a Firestore `Timestamp` but returns a
 * `Timestamp` when reading, while the shared schemas expect `Date`. Writes
 * need no conversion; reads go through this first.
 */
function timestampsToDates(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate();
  if (Array.isArray(value)) return value.map(timestampsToDates);
  if (value !== null && typeof value === "object" && isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        timestampsToDates(item),
      ]),
    );
  }
  return value;
}

function isPlainObject(value: object): boolean {
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Returns the ID of every Klaviyo list. */
export async function getAllLists(): Promise<string[]> {
  // Sparse fields keep pages small. Pages are capped at 10 lists, so the
  // size is left alone and `links.next` is followed instead.
  const pages = await klaviyoGetAllPages(
    "/api/lists",
    new URLSearchParams({ "fields[list]": "name" }),
    listsPage,
  );
  return pages.flatMap((page) => page.data.map((list) => list.id));
}

/**
 * Syncs one list into Firestore, recording a new subscriber-count snapshot
 * only when the count changed. Requesting `profile_count` limits Klaviyo to
 * 1 request per second and 15 per minute, so do not call this in a tight loop.
 */
export async function updateList(db: Firestore, listID: string): Promise<void> {
  // Fetched before the transaction because Firestore may rerun its callback.
  const {
    data: { attributes },
  } = await klaviyoGet(
    `/api/lists/${encodeURIComponent(listID)}`,
    new URLSearchParams({
      "additional-fields[list]": "profile_count",
      "fields[list]": "name,profile_count",
    }),
    listResponse,
  );
  const now = new Date();
  const snapshot = { count: attributes.profile_count, fetchedAt: now };
  const ref = listRef(db, listID);

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (!existing.exists) {
      tx.create(
        ref,
        EmailList.assert({
          platform: PLATFORM,
          platformListID: listID,
          name: attributes.name,
          lastFetchedAt: now,
          snapshots: [snapshot],
        }),
      );
      return;
    }

    const current = EmailList.assert(timestampsToDates(existing.data()));
    const unchanged = current.snapshots.at(-1)?.count === snapshot.count;
    tx.set(
      ref,
      EmailList.assert({
        ...current,
        name: attributes.name,
        lastFetchedAt: now,
        snapshots: unchanged
          ? current.snapshots
          : [...current.snapshots, snapshot],
      }),
    );
  });
}

export function getAllCampaigns(): Promise<string[]> {
  return Promise.reject(new Error("not implemented"));
}

export function updateCampaigns(
  _db: Firestore,
  _campaignIDs: string[],
): Promise<void> {
  return Promise.reject(new Error("not implemented"));
}
