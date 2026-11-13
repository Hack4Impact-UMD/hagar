import type { Campaign, EmailCampaignSummary } from "@repo/common";

/**
 * The emails a campaign links to, oldest first. A link can outlive its email,
 * so links with no matching email are skipped rather than treated as errors.
 */
export function linkedEmails(
  campaign: Pick<Campaign, "linkedItems">,
  emails: readonly EmailCampaignSummary[],
): EmailCampaignSummary[] {
  const ids = new Set(
    campaign.linkedItems
      .filter((item) => item.type === "EMAIL")
      .map((item) => item.id),
  );
  // `sentAt` has a fixed width and a `Z` offset, so string order is time order.
  return emails
    .filter((email) => ids.has(email.emailCampaignId))
    .toSorted((a, b) =>
      a.sentAt < b.sentAt ? -1 : a.sentAt > b.sentAt ? 1 : 0,
    );
}

/**
 * The entries in the last `days` days of `data`, counted back from its latest
 * date rather than from today, so fixed sample data never ages out of view.
 * Dates are `YYYY-MM-DD`.
 */
export function lastDays<T extends { date: string }>(
  data: readonly T[],
  days: number,
): T[] {
  if (data.length === 0) return [];
  const latest = data
    .map((entry) => entry.date)
    .reduce((max, date) => (date > max ? date : max));
  const start = new Date(`${latest}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startDate = start.toISOString().slice(0, 10);
  return data.filter((entry) => entry.date >= startDate);
}
