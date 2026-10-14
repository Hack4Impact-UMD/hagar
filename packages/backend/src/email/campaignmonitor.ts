import { type } from "arktype";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineSecret, defineString } from "firebase-functions/params";

const CampaignMonitorError = type({
  Code: "number",
  Message: "string",
});

const ClientLists = type({ ListID: "string" }).array();

const ListDetails = type({
  Title: "string",
});

const ListStats = type({
  TotalActiveSubscribers: "number.integer >= 0",
});

const CampaignListPage = type({
  Results: type({
    CampaignID: "string",
    SentDate: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
  }).array(),
  PageNumber: "number",
  NumberOfPages: "number",
});

const CampaignSummary = type({
  Name: "string",
  Recipients: "number.integer >= 0",
  UniqueOpened: "number.integer >= 0",
  Clicks: "number.integer >= 0",
  Unsubscribed: "number.integer >= 0",
  Bounced: "number.integer >= 0",
  SpamComplaints: "number.integer >= 0",
  WebVersionURL: "string.url",
});

const CampaignListsAndSegments = type({
  Lists: type({ ListID: "string" }).array(),
  Segments: type({ Title: "string" }).array(),
});

export const campaignMonitorApiKey = defineSecret("CAMPAIGN_MONITOR_API_KEY");
const campaignMonitorClientId = defineString("CAMPAIGN_MONITOR_CLIENT_ID");

const BASE_URL = "https://api.createsend.com/api/v3.3";
export async function getAllLists(): Promise<string[]> {
  const apiKey = campaignMonitorApiKey.value();
  const clientId = campaignMonitorClientId.value();
  if (!apiKey || !clientId) {
    throw new Error("Credentials not set");
  }

  const baseURL = new URL(`${BASE_URL}/clients/${clientId}/lists.json`);

  const res = await fetch(baseURL, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`,
    },
  });

  if (!res.ok) {
    const body = CampaignMonitorError.assert(await res.json());
    throw new Error(`${res.status}: ${body.Message}`);
  }

  const body = ClientLists.assert(await res.json());
  return body.map((list) => list.ListID);
}

export async function updateList(platformListID: string): Promise<void> {
  const apiKey = campaignMonitorApiKey.value();
  const clientId = campaignMonitorClientId.value();
  if (!apiKey || !clientId) {
    throw new Error("Credentials not set");
  }

  const detailsRes = await fetch(`${BASE_URL}/lists/${platformListID}.json`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`,
    },
  });

  if (!detailsRes.ok) {
    const body = CampaignMonitorError.assert(await detailsRes.json());
    throw new Error(`${detailsRes.status}: ${body.Message}`);
  }

  const details = ListDetails.assert(await detailsRes.json());

  const statsRes = await fetch(
    `${BASE_URL}/lists/${platformListID}/stats.json`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`,
      },
    },
  );

  if (!statsRes.ok) {
    const body = CampaignMonitorError.assert(await statsRes.json());
    throw new Error(`${statsRes.status}: ${body.Message}`);
  }

  const stats = ListStats.assert(await statsRes.json());

  const ref = getFirestore()
    .collection("email-lists")
    .doc(`Campaign_Monitor_${platformListID}`);
  const stored = await ref.get();
  const count = stats.TotalActiveSubscribers;
  const unchanged = stored.get("snapshots")?.at(-1)?.count === count;
  const fetchedAt = new Date();

  await ref.set(
    {
      platform: "Campaign_Monitor",
      platformListID,
      name: details.Title,
      lastFetchedAt: fetchedAt,
      ...(!unchanged && {
        snapshots: FieldValue.arrayUnion({ count, fetchedAt }),
      }),
    },
    { merge: true },
  );
}

export async function getAllCampaigns(): Promise<string[]> {
  const apiKey = campaignMonitorApiKey.value();
  const clientId = campaignMonitorClientId.value();
  if (!apiKey || !clientId) {
    throw new Error("Credentials not set");
  }

  let page = 1;
  let totalPages = 0;
  const listIds: string[] = [];

  const baseURL = new URL(`${BASE_URL}/clients/${clientId}/campaigns.json`);

  do {
    baseURL.searchParams.set("page", String(page));
    const res = await fetch(baseURL, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`,
      },
    });

    if (!res.ok) {
      const body = CampaignMonitorError.assert(await res.json());
      throw new Error(`${res.status}: ${body.Message}`);
    }

    const body = CampaignListPage.assert(await res.json());
    totalPages = body.NumberOfPages;
    listIds.push(...body.Results.map((campaign) => campaign.CampaignID));
    page += 1;
  } while (page <= totalPages);

  return listIds;
}

async function findSentAt(
  apiKey: string,
  clientId: string,
  platformCampaignID: string,
): Promise<Date> {
  let page = 1;
  let totalPages = 0;

  const baseURL = new URL(`${BASE_URL}/clients/${clientId}/campaigns.json`);
  baseURL.searchParams.set("pagesize", "1000");

  do {
    baseURL.searchParams.set("page", String(page));
    const res = await fetch(baseURL, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`,
      },
    });

    if (!res.ok) {
      const body = CampaignMonitorError.assert(await res.json());
      throw new Error(`${res.status}: ${body.Message}`);
    }

    const body = CampaignListPage.assert(await res.json());
    const campaign = body.Results.find(
      (result) => result.CampaignID === platformCampaignID,
    );
    if (campaign) {
      return new Date(`${campaign.SentDate.replace(" ", "T")}Z`);
    }
    totalPages = body.NumberOfPages;
    page += 1;
  } while (page <= totalPages);

  throw new Error(`campaign ${platformCampaignID} is not a sent campaign`);
}

export async function updateCampaign(
  platformCampaignID: string,
): Promise<void> {
  const apiKey = campaignMonitorApiKey.value();
  const clientId = campaignMonitorClientId.value();
  if (!apiKey || !clientId) {
    throw new Error("Credentials not set");
  }

  const summaryRes = await fetch(
    `${BASE_URL}/campaigns/${platformCampaignID}/summary.json`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`,
      },
    },
  );

  if (!summaryRes.ok) {
    const body = CampaignMonitorError.assert(await summaryRes.json());
    throw new Error(`${summaryRes.status}: ${body.Message}`);
  }

  const summary = CampaignSummary.assert(await summaryRes.json());

  const contentRes = await fetch(summary.WebVersionURL);

  if (!contentRes.ok) {
    throw new Error(`${contentRes.status}: could not fetch campaign content`);
  }

  const ref = getFirestore()
    .collection("email-campaigns")
    .doc(`Campaign_Monitor_${platformCampaignID}`);
  const stored = await ref.get();
  const content: string =
    stored.get("content") ??
    `email-integrations/campaign-monitor/${crypto.randomUUID()}.html`;
  await getStorage()
    .bucket()
    .file(content)
    .save(await contentRes.text(), { contentType: "text/html" });

  const listsRes = await fetch(
    `${BASE_URL}/campaigns/${platformCampaignID}/listsandsegments.json`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`,
      },
    },
  );

  if (!listsRes.ok) {
    const body = CampaignMonitorError.assert(await listsRes.json());
    throw new Error(`${listsRes.status}: ${body.Message}`);
  }

  const listsAndSegments = CampaignListsAndSegments.assert(
    await listsRes.json(),
  );

  const notes =
    listsAndSegments.Segments.length > 0
      ? `Sent to recipients in the following audience segments:\n\n${listsAndSegments.Segments.map((segment) => segment.Title).join("\n")}`
      : "";

  const counts = {
    bounced: summary.Bounced,
    uniqOpens: summary.UniqueOpened,
    uniqClicks: summary.Clicks,
    unsubscribers: summary.Unsubscribed,
    complaints: summary.SpamComplaints,
  };
  const latest = stored.get("snapshots")?.at(-1);
  const unchanged =
    latest && Object.entries(counts).every(([key, n]) => latest[key] === n);
  const fetchedAt = new Date();

  await ref.set(
    {
      platform: "Campaign_Monitor",
      platformCampaignID,
      listIDs: listsAndSegments.Lists.map((list) => list.ListID),
      name: summary.Name,
      content,
      sentAt:
        stored.get("sentAt") ??
        (await findSentAt(apiKey, clientId, platformCampaignID)),
      sent: summary.Recipients,
      lastFetchedAt: fetchedAt,
      notes,
      ...(!unchanged && {
        snapshots: FieldValue.arrayUnion({ fetchedAt, ...counts }),
      }),
    },
    { merge: true },
  );
}
