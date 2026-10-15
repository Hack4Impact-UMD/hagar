import type {
  EmailCampaignRecord,
  EmailList,
  EmailCampaignSnapshot,
  EmailListCountSnapshot,
} from "@repo/common";
import { getFirestore} from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";


const API_KEY = process.env.MAILCHIMP_API!;
const BASE = "https://api.mailchimp.com/3.0";

async function get(path: string): Promise<any> {
  const res = await fetch(BASE + path, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  if (!res.ok) {
    throw new Error(`Mailchimp ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

async function saveCampaignHtml(campaignID: string): Promise<string>{
    const {html} = await get(`/campaigns/${campaignID}/content?fields=html`);
    if (!html){
      throw new Error(`Campaign ${campaignID} has no HTML content`);
    }

    const path = `email-integrations/mail-chil/${randomUUID()}.html`
    await getStorage().bucket().file(path).save(html, {
      contentType:"text/html; charset=utf-8"
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
    );
    total = data.total_items;
    for (const list of data.lists) ids.push(list.id);
    offset += data.lists.length;
  }

  return ids;
}

export async function updateList(_platformListID: string): Promise<void> {
  const list = await get(`/lists/${_platformListID}`);
  const now = new Date();

  const snapshot: EmailListCountSnapshot = {
    count: list.stats.member_count,
    fetchedAt: now,
  };

  const ref = getFirestore().collection("email-lists").doc(_platformListID);
  const doc = await ref.get();

  const snapshots: EmailListCountSnapshot[] = doc.exists ? doc.data()!.snapshots : [];
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
    );
    total = data.total_items;
    for (const campaign of data.campaigns) {
      ids.push(campaign.id);
    }
    offset += data.campaigns.length;
  }

  return ids;
}

export async function updateCampaign(_platformCampaignID: string,): Promise<void> {
  const campaign = await get(`/campaigns/${_platformCampaignID}`);

  if (campaign.status !== "sent") return;

  const report = await get(`/reports/${_platformCampaignID}`);
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

  const snapshots: EmailCampaignSnapshot[] = doc.exists ? doc.data()!.snapshots : [];
  const latest = snapshots[snapshots.length - 1];

  const changed =
    !latest ||
    latest.bounced !== snapshot.bounced ||
    latest.uniqOpens !== snapshot.uniqOpens ||
    latest.uniqClicks !== snapshot.uniqClicks ||
    latest.unsubscribers !== snapshot.unsubscribers ||
    latest.complaints !== snapshot.complaints;

  const existingContent: string | undefined = doc.exists ? doc.data()!.content : undefined; 

  const record:EmailCampaignRecord = {
    platform:"MailChimp", 
    platformCampaignID: _platformCampaignID,
    listIDs: [campaign.recipients.list_id], 
    name:campaign.settings.title, 
    content: existingContent || await saveCampaignHtml(_platformCampaignID),
    sentAt: new Date(campaign.send_time), 
    sent: report.emails_sent, 
    lastFetchedAt:now,
    notes: doc.exists ? doc.data()!.notes : "", 
    snapshots:changed? [...snapshots,snapshot] : snapshots,

  };

  await ref.set(record);
}
