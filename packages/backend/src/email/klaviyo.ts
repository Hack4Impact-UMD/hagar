import { type } from "arktype";
import { EmailCampaignRecord, EmailList } from "@repo/common";
import type { EmailPlatform } from "@repo/common";
import { Timestamp } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions/logger";
import {
  klaviyoGet,
  klaviyoGetAllPages,
  klaviyoPostAllPages,
  isKlaviyoNotFound,
} from "@backend/email/klaviyoApi.ts";

const LISTS_COLLECTION = "email-lists";
const CAMPAIGNS_COLLECTION = "email-campaigns";
const CAMPAIGN_CONTENT_FOLDER = "email-campaign-content";
const PLATFORM: EmailPlatform = "Klaviyo";

/**
 * The stats report accepts at most 100 campaign IDs in its filter, and it is
 * limited to 2 calls per minute and 225 per day, so batching is what keeps a
 * sync under the daily cap.
 */
const MAX_CAMPAIGNS_PER_UPDATE = 100;
/** Built into every Klaviyo account; only its per-account ID varies. */
const CONVERSION_METRIC_NAME = "Opened Email";
const SENT_STATUSES = new Set(["Sent", "Variations Sent"]);
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const SCREENSHOT_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

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

const campaignsPage = type({
  data: type({
    id: "string >= 1",
    attributes: {
      name: "string",
      status: "string",
      send_time: "string | null",
      audiences: { included: "string[]", excluded: "string[]" },
    },
    relationships: {
      "campaign-messages": { data: type({ id: "string >= 1" }).array() },
    },
  }).array(),
  "included?": type({
    type: "string",
    id: "string >= 1",
    attributes: { definition: { channel: "string" } },
  }).array(),
});
const campaignStatusPage = type({
  data: type({
    id: "string >= 1",
    attributes: { status: "string" },
  }).array(),
});
const metricsPage = type({
  data: type({ id: "string >= 1", attributes: { name: "string" } }).array(),
});
const reportPage = type({
  data: {
    attributes: {
      results: type({
        groupings: { campaign_id: "string" },
        statistics: {
          recipients: "number",
          bounced: "number",
          opens_unique: "number",
          clicks_unique: "number",
          unsubscribe_uniques: "number",
          spam_complaints: "number",
        },
      }).array(),
    },
  },
});
const segmentResponse = type({
  data: {
    attributes: {
      name: "string",
      "definition?": type({
        condition_groups: type({
          conditions: type({
            type: "string",
            "is_member?": "boolean",
            "group_ids?": "string[]",
          }).array(),
        }).array(),
      }).or("null"),
    },
  },
});
const templateResponse = type({
  data: { attributes: { "screenshot_url?": "string | null" } },
});

type CampaignStats = {
  sent: number;
  bounced: number;
  uniqOpens: number;
  uniqClicks: number;
  unsubscribers: number;
  complaints: number;
};

type CampaignDetails = {
  id: string;
  name: string;
  sendTime: Date;
  audiences: { included: string[]; excluded: string[] };
  emailMessageID: string | undefined;
};

/** Document IDs embed the platform, as with lists. */
function campaignRef(db: Firestore, campaignID: string) {
  return db.collection(CAMPAIGNS_COLLECTION).doc(`${PLATFORM}_${campaignID}`);
}

/**
 * Returns the ID of every email campaign that was sent. Drafts, scheduled and
 * cancelled campaigns are excluded because a record needs a send time.
 */
export async function getAllCampaigns(): Promise<string[]> {
  // Klaviyo requires a channel filter on this endpoint.
  const pages = await klaviyoGetAllPages(
    "/api/campaigns",
    new URLSearchParams({
      filter: "equals(messages.channel,'email')",
      "fields[campaign]": "status",
    }),
    campaignStatusPage,
  );
  // Filtered here rather than in the query: `any(status,[...])` silently
  // returns an empty list.
  return pages.flatMap((page) =>
    page.data
      .filter((campaign) => SENT_STATUSES.has(campaign.attributes.status))
      .map((campaign) => campaign.id),
  );
}

function validateCampaignIDs(campaignIDs: string[]): string[] {
  const unique = [...new Set(campaignIDs)];
  if (unique.length === 0 || unique.length > MAX_CAMPAIGNS_PER_UPDATE) {
    throw new Error(
      `Expected 1 to ${MAX_CAMPAIGNS_PER_UPDATE} campaign IDs, got ${unique.length}.`,
    );
  }
  // IDs are interpolated into Klaviyo filter strings, so anything beyond
  // plain alphanumerics could inject filter syntax.
  const invalid = unique.find((id) => !/^[A-Za-z0-9]+$/.test(id));
  if (invalid !== undefined) {
    throw new Error(`Invalid campaign ID: ${JSON.stringify(invalid)}.`);
  }
  return unique;
}

async function fetchCampaignDetails(
  campaignIDs: string[],
): Promise<Map<string, CampaignDetails>> {
  const pages = await klaviyoGetAllPages(
    "/api/campaigns",
    new URLSearchParams({
      filter: `and(equals(messages.channel,'email'),any(id,[${campaignIDs.map((id) => `'${id}'`).join(",")}]))`,
      include: "campaign-messages",
      "fields[campaign]": "name,status,send_time,audiences",
      "fields[campaign-message]": "definition.channel",
    }),
    campaignsPage,
  );

  const channelByMessage = new Map<string, string>();
  for (const page of pages) {
    for (const message of page.included ?? []) {
      if (message.type === "campaign-message") {
        channelByMessage.set(message.id, message.attributes.definition.channel);
      }
    }
  }

  const details = new Map<string, CampaignDetails>();
  for (const page of pages) {
    for (const campaign of page.data) {
      const { send_time, name, audiences } = campaign.attributes;
      if (send_time === null) {
        logger.warn("Skipping Klaviyo campaign without a send time", {
          campaignID: campaign.id,
        });
        continue;
      }
      details.set(campaign.id, {
        id: campaign.id,
        name,
        sendTime: new Date(send_time),
        audiences,
        emailMessageID: campaign.relationships["campaign-messages"].data.find(
          (message) => channelByMessage.get(message.id) === "email",
        )?.id,
      });
    }
  }
  return details;
}

/**
 * The report requires a conversion metric even though none of the statistics
 * requested depend on it. A nonprofit account may have no purchase metric, so
 * a built-in one is used; its ID differs per account and must be looked up.
 */
async function fetchConversionMetricID(): Promise<string> {
  const pages = await klaviyoGetAllPages(
    "/api/metrics",
    new URLSearchParams({ "fields[metric]": "name" }),
    metricsPage,
  );
  const metric = pages
    .flatMap((page) => page.data)
    .find((m) => m.attributes.name === CONVERSION_METRIC_NAME);
  if (!metric) {
    throw new Error(
      `Klaviyo has no "${CONVERSION_METRIC_NAME}" metric, which the campaign stats report needs as its conversion metric.`,
    );
  }
  return metric.id;
}

/** One report covers the whole batch; campaigns without rows are omitted. */
async function fetchCampaignStats(
  campaignIDs: string[],
): Promise<Map<string, CampaignStats>> {
  const conversionMetricID = await fetchConversionMetricID();
  const pages = await klaviyoPostAllPages(
    "/api/campaign-values-reports",
    {
      data: {
        type: "campaign-values-report",
        attributes: {
          statistics: [
            "recipients",
            "bounced",
            "opens_unique",
            "clicks_unique",
            "unsubscribe_uniques",
            "spam_complaints",
          ],
          // The report's longest window is one year, and `last_12_months`
          // excludes the current month, hiding campaigns sent today.
          timeframe: { key: "last_365_days" },
          conversion_metric_id: conversionMetricID,
          filter: `and(contains-any(campaign_id,[${campaignIDs.map((id) => JSON.stringify(id)).join(",")}]),equals(send_channel,"email"))`,
        },
      },
    },
    reportPage,
  );

  // A campaign has one row per message or variation.
  const totals = new Map<string, CampaignStats>();
  for (const page of pages) {
    for (const row of page.data.attributes.results) {
      const previous = totals.get(row.groupings.campaign_id);
      const s = row.statistics;
      totals.set(row.groupings.campaign_id, {
        sent: (previous?.sent ?? 0) + s.recipients,
        bounced: (previous?.bounced ?? 0) + s.bounced,
        uniqOpens: (previous?.uniqOpens ?? 0) + s.opens_unique,
        uniqClicks: (previous?.uniqClicks ?? 0) + s.clicks_unique,
        unsubscribers: (previous?.unsubscribers ?? 0) + s.unsubscribe_uniques,
        complaints: (previous?.complaints ?? 0) + s.spam_complaints,
      });
    }
  }
  return totals;
}

/**
 * Lookups shared by every campaign in one `updateCampaigns` call, since
 * campaigns often share audiences. Promises are stored so concurrent and
 * repeated lookups of an ID make one request. It is created per call so a
 * reused function instance never serves stale data.
 */
type AudienceCache = {
  knownLists: Map<string, Promise<boolean>>;
  /** `null` when the ID is not a segment. */
  segments: Map<string, Promise<Segment | null>>;
};

type Segment = { name: string; memberOfListIDs: string[] };

async function listExists(db: Firestore, id: string): Promise<boolean> {
  const snapshot = await listRef(db, id).get();
  return snapshot.exists;
}

function isKnownList(
  db: Firestore,
  cache: AudienceCache,
  id: string,
): Promise<boolean> {
  let known = cache.knownLists.get(id);
  if (!known) {
    known = listExists(db, id);
    cache.knownLists.set(id, known);
  }
  return known;
}

/** Resolves to `null` for a 404, which means the ID is a list, not a segment. */
async function fetchSegment(id: string): Promise<Segment | null> {
  try {
    const { data } = await klaviyoGet(
      `/api/segments/${encodeURIComponent(id)}`,
      new URLSearchParams({ "fields[segment]": "name,definition" }),
      segmentResponse,
    );
    const groups = data.attributes.definition?.condition_groups ?? [];
    return {
      name: data.attributes.name,
      memberOfListIDs: groups
        .flatMap((group) => group.conditions)
        .filter(
          (condition) =>
            condition.type === "profile-group-membership" &&
            condition.is_member === true,
        )
        .flatMap((condition) => condition.group_ids ?? []),
    };
  } catch (error) {
    if (isKlaviyoNotFound(error)) return null;
    throw error;
  }
}

function getSegment(cache: AudienceCache, id: string): Promise<Segment | null> {
  let segment = cache.segments.get(id);
  if (!segment) {
    segment = fetchSegment(id);
    cache.segments.set(id, segment);
  }
  return segment;
}

/**
 * Maps a campaign's Klaviyo audiences to the lists it was sent to, plus notes.
 * Hagar shows who an email went to without modelling segments, so a segment's
 * list-membership rules stand in as the closest lists and the segment names
 * are kept in the notes. Nested segments are not followed, and an ID that
 * Klaviyo does not know as a segment is taken to be a list not yet synced.
 */
async function resolveAudience(
  db: Firestore,
  cache: AudienceCache,
  details: CampaignDetails,
): Promise<{ listIDs: string[]; notes: string }> {
  const listIDs = new Set<string>();
  const segmentNames = new Set<string>();

  for (const id of details.audiences.included) {
    if (await isKnownList(db, cache, id)) {
      listIDs.add(id);
      continue;
    }
    const segment = await getSegment(cache, id);
    if (segment === null) {
      listIDs.add(id);
      continue;
    }
    segmentNames.add(segment.name);
    for (const groupID of segment.memberOfListIDs) {
      if (await isKnownList(db, cache, groupID)) listIDs.add(groupID);
    }
  }

  return {
    listIDs: [...listIDs],
    notes:
      segmentNames.size === 0
        ? ""
        : `Sent to recipients in the following audience segments:\n\n${[...segmentNames].join("\n")}`,
  };
}

/**
 * Downloads the rendered email and stores it in Cloud Storage, returning the
 * storage path. Resolves to `undefined` when Klaviyo has no screenshot yet.
 */
async function storeCampaignScreenshot(
  details: CampaignDetails,
): Promise<string | undefined> {
  if (details.emailMessageID === undefined) {
    logger.warn("Skipping Klaviyo campaign without an email message", {
      campaignID: details.id,
    });
    return undefined;
  }
  const { data } = await klaviyoGet(
    `/api/campaign-messages/${encodeURIComponent(details.emailMessageID)}/template`,
    new URLSearchParams({ "fields[template]": "screenshot_url" }),
    templateResponse,
  );
  const screenshotUrl = data.attributes.screenshot_url;
  if (!screenshotUrl) {
    logger.warn("Skipping Klaviyo campaign without a screenshot yet", {
      campaignID: details.id,
    });
    return undefined;
  }
  if (new URL(screenshotUrl).protocol !== "https:") {
    throw new Error(
      `Screenshot for campaign ${details.id} is not an https URL.`,
    );
  }

  // A presigned storage URL: the Klaviyo API key must never be sent to it.
  const response = await fetch(screenshotUrl);
  if (!response.ok) {
    throw new Error(
      `Downloading the screenshot for campaign ${details.id} failed with ${response.status}.`,
    );
  }
  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    ?.trim()
    .toLowerCase();
  const extension =
    contentType === undefined ? undefined : SCREENSHOT_EXTENSIONS[contentType];
  if (contentType === undefined || extension === undefined) {
    throw new Error(
      `Screenshot for campaign ${details.id} has unsupported content type ${JSON.stringify(contentType)}.`,
    );
  }
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_SCREENSHOT_BYTES) {
    throw new Error(`Screenshot for campaign ${details.id} is too large.`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_SCREENSHOT_BYTES) {
    throw new Error(`Screenshot for campaign ${details.id} is too large.`);
  }

  const path = `${CAMPAIGN_CONTENT_FOLDER}/${PLATFORM}_${details.id}.${extension}`;
  await getStorage()
    .bucket()
    .file(path)
    .save(buffer, { contentType, resumable: false });
  return path;
}

function statsDiffer(
  a: Omit<CampaignStats, "sent">,
  b: Omit<CampaignStats, "sent">,
): boolean {
  return (
    a.bounced !== b.bounced ||
    a.uniqOpens !== b.uniqOpens ||
    a.uniqClicks !== b.uniqClicks ||
    a.unsubscribers !== b.unsubscribers ||
    a.complaints !== b.complaints
  );
}

async function syncCampaign(
  db: Firestore,
  details: CampaignDetails,
  stats: CampaignStats | undefined,
  now: Date,
  cache: AudienceCache,
): Promise<void> {
  const ref = campaignRef(db, details.id);
  const preRead = await ref.get();
  const isNew = !preRead.exists;

  // Network work happens before the transaction because Firestore may rerun
  // its callback.
  if (isNew && !stats) {
    logger.info("Skipping new Klaviyo campaign without stats yet", {
      campaignID: details.id,
    });
    return;
  }

  // Without stats only `lastFetchedAt` is written, so the lookups would be
  // wasted requests that could also fail the campaign needlessly. Resolved
  // before the upload so a failed lookup leaves no orphaned screenshot.
  const { listIDs, notes } = stats
    ? await resolveAudience(db, cache, details)
    : { listIDs: [], notes: "" };

  let contentPath: string | undefined;
  if (isNew) {
    contentPath = await storeCampaignScreenshot(details);
    if (contentPath === undefined) return;
  }
  const snapshot = stats && {
    fetchedAt: now,
    bounced: stats.bounced,
    uniqOpens: stats.uniqOpens,
    uniqClicks: stats.uniqClicks,
    unsubscribers: stats.unsubscribers,
    complaints: stats.complaints,
  };

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (!existing.exists) {
      if (contentPath === undefined || !stats || !snapshot) {
        logger.warn("Skipping Klaviyo campaign created since it was checked", {
          campaignID: details.id,
        });
        return;
      }
      tx.create(
        ref,
        EmailCampaignRecord.assert({
          platform: PLATFORM,
          platformCampaignID: details.id,
          listIDs,
          name: details.name,
          content: contentPath,
          sentAt: details.sendTime,
          sent: stats.sent,
          lastFetchedAt: now,
          notes,
          snapshots: [snapshot],
        }),
      );
      return;
    }

    const current = EmailCampaignRecord.assert(
      timestampsToDates(existing.data()),
    );
    if (!stats || !snapshot) {
      tx.set(
        ref,
        EmailCampaignRecord.assert({ ...current, lastFetchedAt: now }),
      );
      return;
    }
    const latest = current.snapshots.at(-1);
    const changed = !latest || statsDiffer(latest, snapshot);
    tx.set(
      ref,
      EmailCampaignRecord.assert({
        ...current,
        name: details.name,
        listIDs,
        notes,
        sentAt: details.sendTime,
        sent: stats.sent,
        lastFetchedAt: now,
        snapshots: changed
          ? [...current.snapshots, snapshot]
          : current.snapshots,
      }),
    );
  });
}

/**
 * Syncs up to 100 campaigns into Firestore. A campaign that fails does not
 * stop the others; the failures are reported together once all were tried.
 * The stats report is limited to 2 calls per minute and 225 per day, so pass
 * as many campaigns per call as possible rather than calling per campaign.
 */
export async function updateCampaigns(
  db: Firestore,
  campaignIDs: string[],
): Promise<void> {
  const ids = validateCampaignIDs(campaignIDs);

  const details = await fetchCampaignDetails(ids);
  const stats = await fetchCampaignStats(ids);
  const now = new Date();

  const cache: AudienceCache = { knownLists: new Map(), segments: new Map() };
  const failures: { id: string; error: unknown }[] = [];
  for (const id of ids) {
    const campaign = details.get(id);
    if (!campaign) {
      logger.warn("Skipping campaign missing from Klaviyo's response", {
        campaignID: id,
      });
      continue;
    }
    try {
      await syncCampaign(db, campaign, stats.get(id), now, cache);
    } catch (error) {
      logger.error("Failed to sync Klaviyo campaign", {
        campaignID: id,
        error,
      });
      failures.push({ id, error });
    }
  }

  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((failure) => failure.error),
      `Failed to sync Klaviyo campaigns: ${failures.map((failure) => failure.id).join(", ")}`,
    );
  }
}
