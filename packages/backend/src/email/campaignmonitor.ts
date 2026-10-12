import type { EmailCampaignRecord, EmailList } from "@repo/common";
import { type } from "arktype";
import { getDownloadURL, getStorage } from "firebase-admin/storage";

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
  Results: type({ CampaignID: "string" }).array(),
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

const BASE_URL = "https://api.createsend.com/api/v3.3";
export async function getAllLists(): Promise<string[]> {
  const apiKey = process.env.CAMPAIGN_MONITOR_API_KEY;
  const clientId = process.env.CAMPAIGN_MONITOR_CLIENT_ID;
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

export async function updateList(platformListID: string): Promise<EmailList> {
  const apiKey = process.env.CAMPAIGN_MONITOR_API_KEY;
  const clientId = process.env.CAMPAIGN_MONITOR_CLIENT_ID;
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

  const fetchedAt = new Date();

  return {
    platform: "Campaign_Monitor",
    platformListID,
    name: details.Title,
    lastFetchedAt: fetchedAt,
    snapshots: [
      {
        count: stats.TotalActiveSubscribers,
        fetchedAt,
      },
    ],
  };
}

export async function getAllCampaigns(): Promise<string[]> {
  const apiKey = process.env.CAMPAIGN_MONITOR_API_KEY;
  const clientId = process.env.CAMPAIGN_MONITOR_CLIENT_ID;
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

export async function updateCampaign(
  platformCampaignID: string,
): Promise<Omit<EmailCampaignRecord, "sentAt">> {
  const apiKey = process.env.CAMPAIGN_MONITOR_API_KEY;
  const clientId = process.env.CAMPAIGN_MONITOR_CLIENT_ID;
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

  const contentFile = getStorage()
    .bucket()
    .file(`email-campaigns/Campaign_Monitor/${platformCampaignID}.html`);
  await contentFile.save(await contentRes.text(), {
    contentType: "text/html",
    metadata: {
      metadata: { firebaseStorageDownloadTokens: crypto.randomUUID() },
    },
  });
  const content = new URL(await getDownloadURL(contentFile));

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

  const fetchedAt = new Date();

  return {
    platform: "Campaign_Monitor",
    platformCampaignID,
    listIDs: listsAndSegments.Lists.map((list) => list.ListID),
    name: summary.Name,
    content,
    sent: summary.Recipients,
    lastFetchedAt: fetchedAt,
    notes,
    snapshots: [
      {
        fetchedAt,
        bounced: summary.Bounced,
        uniqOpens: summary.UniqueOpened,
        uniqClicks: summary.Clicks,
        unsubscribers: summary.Unsubscribed,
        complaints: summary.SpamComplaints,
      },
    ],
  };
}
