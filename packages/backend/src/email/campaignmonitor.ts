import type { EmailList } from "@repo/common";
import { type } from "arktype";

const CampaignMonitorError = type({
  Code: "number",
  Message: "string",
});

const CampaignListPage = type({
  Results: type({ CampaignID: "string" }).array(),
  PageNumber: "number",
  NumberOfPages: "number",
});

const BASE_URL = "https://api.createsend.com/api/v3.3";
export function getAllLists(): Promise<EmailList[]> {
  return Promise.reject(new Error("not implemented"));
}

export function updateList(_platformListID: string): Promise<void> {
  return Promise.reject(new Error("not implemented"));
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

export function updateCampaign(_platformCampaignID: string): Promise<void> {
  return Promise.reject(new Error("not implemented"));
}
