import { nowUtc } from "@repo/common";
import type { StoredEmailCampaignRecord } from "@repo/common";
import { type } from "arktype";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { setTimeout as sleep } from "node:timers/promises";

const BASE_URL = "https://api.virtuoussoftware.com";
const MAX_ATTEMPTS = 3; // "few" times, change accordingly
const PAGE_SIZE = 1000;

const searchPage = type({ list: "unknown[]", total: "string | number" });
const emailIds = type({ id: "number" }).array();
const listIds = type({ emailListId: "number" }).array();
const emails = type({ id: "number", name: "string", html: "string" }).array();

/**
 * Runs one page of a Virtuous search and returns the parsed JSON. Every call to
 * Virtuous goes through here. The search endpoints are POSTs but only read.
 */
async function virtuousSearch(
  path: string,
  skip: number,
  take: number,
): Promise<unknown> {
  const key = process.env.VIRTUOUS_API_KEY;
  if (!key) throw new Error("VIRTUOUS_API_KEY is not set.");

  const url = new URL(path, BASE_URL);
  url.searchParams.set("skip", String(skip));
  url.searchParams.set("take", String(take));

  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      // An empty search matches everything.
      body: JSON.stringify({ search: "" }),
    });
    if (response.ok) return response.json();

    if (response.status !== 429 || attempt === MAX_ATTEMPTS) {
      let reason = "";
      if (response.status === 401) reason = " (bad API key)";
      if (response.status === 403) {
        reason = " (the API key's permission group is missing access)";
      }
      throw new Error(
        `Virtuous request to ${path} failed with ${response.status}${reason}.`,
      );
    }

    const reset = Number(response.headers.get("X-RateLimit-Reset")) || 0;
    await sleep(Math.max(reset * 1000 - Date.now(), 1000));
  }
}

/**
 * Returns every result of a Virtuous search. Stops on an empty page as well as
 * at `total`, so a wrong `total` can't make it loop forever.
 */
async function searchAll(path: string): Promise<unknown[]> {
  const items: unknown[] = [];
  for (;;) {
    const page = searchPage.assert(
      await virtuousSearch(path, items.length, PAGE_SIZE),
    );
    items.push(...page.list);
    if (page.list.length === 0 || items.length >= Number(page.total)) {
      return items;
    }
  }
}

export async function getAllLists(): Promise<string[]> {
  const lists = listIds.assert(await searchAll("/api/EmailList/Search"));
  return lists.map((list) => String(list.emailListId));
}

export function updateList(_platformListID: string): Promise<void> {
  return Promise.reject(new Error("not implemented"));
}

export async function getAllCampaigns(): Promise<string[]> {
  const emails = emailIds.assert(await searchAll("/api/Email/Search"));
  return emails.map((email) => String(email.id));
}

export async function updateCampaign(
  platformCampaignID: string,
): Promise<void> {
  const email = emails
    .assert(await searchAll("/api/Email/Search"))
    .find((candidate) => String(candidate.id) === platformCampaignID);
  if (!email) {
    throw new Error(`Virtuous has no email with id ${platformCampaignID}.`);
  }

  const bucket = getStorage().bucket();
  const path = `email-content/virtuous/${platformCampaignID}.html`;
  await bucket
    .file(path)
    .save(email.html, { contentType: "text/html; charset=utf-8" });
  const content = new URL(`gs://${bucket.name}/${path}`);
  const lastFetchedAt = nowUtc();

  const campaigns = getFirestore().collection("email-campaigns");
  const existing = await campaigns
    .where("platform", "==", "Virtuous")
    .where("platformCampaignID", "==", platformCampaignID)
    .limit(1)
    .get();
  const [doc] = existing.docs;

  // Firestore cannot store a `URL` object, so documents hold its text.
  if (doc) {
    await doc.ref.update({
      name: email.name,
      content: content.href,
      lastFetchedAt,
    });
    return;
  }
  const record: StoredEmailCampaignRecord = {
    platform: "Virtuous",
    platformCampaignID,
    region: "US",
    listIDs: [],
    name: email.name,
    content,
    lastFetchedAt,
    notes: "",
    snapshots: [],
  };
  await campaigns.doc().set({ ...record, content: content.href });
}
