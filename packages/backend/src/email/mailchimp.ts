import type {
  EmailCampaignRecord,
  EmailList,
  EmailCampaignSnapshot,
  EmailListCountSnapshot,
} from "@repo/common";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { type } from "arktype";
import type { Type } from "arktype";

function envCheck(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} isn't set`);
  }
  return value;
}

const API_KEY = envCheck("MAILCHIMP_API");
const BASE = "https://api.mailchimp.com/3.0";

const ListsPage = type({
  total_items: "number.integer >=0",
  lists: type({ id: "string" }).array(),
});

const CampaignsPage = type({
  total_items: type("number.integer >=0"),
  campaigns: type({ id: "string" }).array(),
});

const ListInf = type({
  name: "string >=1",
  stats: { member_count: "number.integer >=0" },
});

const CampaignInf = type({
  recipients: { list_id: "string" },
  settings: { title: "string" },
  "send_time?": "string | null",
  status: "string",
});

const CampaignReport = type({
  bounces: {
    hard_bounces: "number.integer >=0",
    soft_bounces: "number.integer >=0",
  },
  opens: { unique_opens: "number.integer >=0" },
  clicks: { unique_clicks: "number.integer >=0" },
  unsubscribed: "number.integer >=0",
  abuse_reports: "number.integer >= 0",
  emails_sent: "number.integer>=0",
});

const CampaignContent = type({
  "html?": "string",
  "plain_text?": "string",
});

async function get<T>(
  path: string,
  schema: Type<T>,
): Promise<Type<T>["infer"]> {
  const res = await fetch(BASE + path, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  if (!res.ok) {
    throw new Error(`Mailchimp ${res.status}: ${await res.text()}`);
  }

  const data = schema(await res.json());
  if (data instanceof type.errors) {
    throw new Error(`Mailchimp ${path}: ${data.summary}`);
  }

  return data;
}

async function saveCampaignHtml(campaignID: string): Promise<string> {
  const { html, plain_text } = await get(
    `/campaigns/${campaignID}/content?fields=html,plain_text`,
    CampaignContent,
  );
  const body =
    html ||
    (plain_text &&
      `<pre>${plain_text.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</pre>`);
  if (!body) {
    throw new Error(`Campaign ${campaignID} has no content`);
  }

  const path = `email-integrations/mail-chimp/${randomUUID()}.html`;
  await getStorage().bucket().file(path).save(body, {
    contentType: "text/html; charset=utf-8",
  });

  return path;
}

export async function getAllLists(): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0;
  let total = 1;

  while (offset < total) {
    const data = await get(
      `/lists?count=1000&offset=${offset}&fields=lists.id,total_items`,
      ListsPage,
    );
    total = data.total_items;
    if (data.lists.length === 0) break;
    for (const list of data.lists) ids.push(list.id);
    offset += data.lists.length;
  }

  return ids;
}

export async function updateList(_platformListID: string): Promise<void> {
  const list = await get(`/lists/${_platformListID}`, ListInf);
  const now = new Date();

  const snapshot: EmailListCountSnapshot = {
    count: list.stats.member_count,
    fetchedAt: now,
  };

  const ref = getFirestore().collection("email-lists").doc(_platformListID);
  const doc = await ref.get();

  const existing = doc.data() as EmailList | undefined;

  const snapshots: EmailListCountSnapshot[] = existing?.snapshots ?? [];
  const latest = snapshots[snapshots.length - 1];

  const changed = !latest || latest.count !== snapshot.count;

  const record: EmailList = {
    platform: "MailChimp",
    platformListID: _platformListID,
    name: list.name,
    lastFetchedAt: now,
    snapshots: changed ? [...snapshots, snapshot] : snapshots,
  };

  await ref.set(record);
}

export async function getAllCampaigns(): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0;
  let total = 1;

  while (offset < total) {
    const data = await get(
      `/campaigns?count=1000&offset=${offset}&fields=campaigns.id,total_items`,
      CampaignsPage,
    );
    total = data.total_items;
    for (const campaign of data.campaigns) {
      ids.push(campaign.id);
    }
    offset += data.campaigns.length;
  }

  return ids;
}

export async function updateCampaign(
  _platformCampaignID: string,
): Promise<void> {
  const campaign = await get(`/campaigns/${_platformCampaignID}`, CampaignInf);

  if (campaign.status !== "sent" || !campaign.send_time) return;

  const report = await get(`/reports/${_platformCampaignID}`, CampaignReport);
  const now = new Date();

  const snapshot: EmailCampaignSnapshot = {
    fetchedAt: now,
    bounced: report.bounces.hard_bounces + report.bounces.soft_bounces,
    uniqOpens: report.opens.unique_opens,
    uniqClicks: report.clicks.unique_clicks,
    unsubscribers: report.unsubscribed,
    complaints: report.abuse_reports,
  };

  const ref = getFirestore()
    .collection("email-campaigns")
    .doc(_platformCampaignID);
  const doc = await ref.get();

  const existing = doc.data() as EmailCampaignRecord | undefined;
  const snapshots: EmailCampaignSnapshot[] = existing?.snapshots ?? [];
  const latest = snapshots[snapshots.length - 1];

  const changed =
    !latest ||
    latest.bounced !== snapshot.bounced ||
    latest.uniqOpens !== snapshot.uniqOpens ||
    latest.uniqClicks !== snapshot.uniqClicks ||
    latest.unsubscribers !== snapshot.unsubscribers ||
    latest.complaints !== snapshot.complaints;

  const existingContent = existing?.content;

  const record: EmailCampaignRecord = {
    platform: "MailChimp",
    platformCampaignID: _platformCampaignID,
    listIDs: [campaign.recipients.list_id],
    name: campaign.settings.title,
    content: existingContent || (await saveCampaignHtml(_platformCampaignID)),
    sentAt: new Date(campaign.send_time),
    sent: report.emails_sent,
    lastFetchedAt: now,
    notes: existing?.notes ?? "",
    snapshots: changed ? [...snapshots, snapshot] : snapshots,
  };

  await ref.set(record);
}
