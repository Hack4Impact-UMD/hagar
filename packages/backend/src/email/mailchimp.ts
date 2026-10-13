import type { EmailCampaignRecord, EmailList, EmailCampaignSnapshot, EmailListCountSnapshot } from "@repo/common";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const API_KEY = process.env.MAILCHIMP_API!; 
const BASE = "https://api.mailchimp.com/3.0";

async function get(path:string): Promise<any>{
  const res = await fetch(BASE+path, {
    headers:{ Authorization: `Bearer ${API_KEY}`}
  });

  if(!res.ok){
    throw new Error(`Mailchimp ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

export async function getAllLists(): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0; 
  let total = 1;

  while (offset < total){
    const data = await get(`/lists?count=1000&offset=${offset}&fields=lists.id,total_items`);
    total = data.total_items; 
    for (const list of data.lists) ids.push(list.id);
    offset += data.lists.length;
  }
  
  return ids;
}

export async function updateList(_platformListID: string): Promise<void> {
  const list = await get(`/lists/${_platformListID}`);
  const now = new Date();

  const snapshot:EmailListCountSnapshot = {
    count: list.stats.member_count, 
    fetchedAt: now
  }

  const ref = getFirestore().collection("email-lists").doc(_platformListID);
  const doc = await ref.get();

  const snapshots: any[] = doc.exists ? doc.data()!.snapshots : [];
  const latest = snapshots[snapshots.length-1];

  const changed=!latest || latest.count !== snapshot.count;

  const record:EmailList = {
    platform: "MailChimp", 
    platformListID: _platformListID, 
    name: list.name, 
    lastFetchedAt: now, 
    snapshots:changed ? [...snapshots, snapshot] : snapshots, 
  };

  await ref.set(record);
}

export async function getAllCampaigns(): Promise<string[]> {
  const ids:string[] = []; 
  let offset = 0;
  let total = 1;

  while (offset < total){
    const data = await get(`/campaigns?count=1000&offset=${offset}&fields=campaigns.id,total_items`);
    total = data.total_items;
    for (const campaign of data.campaigns){
      ids.push(campaign.id);
    }
    offset += data.campaigns.length;
  }
  
  return ids;
}

export async function updateCampaign(_platformCampaignID: string): Promise<void> {
  const campaign = await get(`/campaigns/${_platformCampaignID}`);


  
  
  return Promise.reject(new Error("not implemented"));
}
