import type { Firestore } from "firebase-admin/firestore";

export function getAllLists(): Promise<string[]> {
  return Promise.reject(new Error("not implemented"));
}

export function updateList(_db: Firestore, _listID: string): Promise<void> {
  return Promise.reject(new Error("not implemented"));
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
