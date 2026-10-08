import type { EmailCampaignRecord, EmailList } from "@repo/common";

export function getAllLists(): Promise<EmailList[]> {
  return Promise.reject(new Error("not implemented"));
}

export function updateList(_platformListID: string): Promise<void> {
  return Promise.reject(new Error("not implemented"));
}

export function getAllCampaigns(): Promise<EmailCampaignRecord[]> {
  return Promise.reject(new Error("not implemented"));
}

export function updateCampaign(_platformCampaignID: string): Promise<void> {
  return Promise.reject(new Error("not implemented"));
}
