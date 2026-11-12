import type {
  Campaign,
  CampaignDateRange,
  LinkedItem,
  UserRegion,
} from "@repo/common";

export const campaignStatuses = ["Active", "Ended", "Draft"] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];

/** The dot drawn beside a status in the table and in the Status filter. */
export const STATUS_DOT_CLASS: Record<CampaignStatus, string> = {
  Active: "bg-[#4A9FD8]",
  Ended: "bg-[#4CA868]",
  Draft: "bg-[#E0954B]",
};

export type Channel = LinkedItem["type"];

/** Typed against `LinkedItem` so a new kind of item fails to compile until it has a label. */
export const CHANNEL_LABELS: Record<Channel, string> = {
  EMAIL: "Email",
};
export const channels = Object.keys(CHANNEL_LABELS) as Channel[];

export const datePresets = [
  "LAST_30_DAYS",
  "LAST_90_DAYS",
  "THIS_YEAR",
  "ALL_TIME",
] as const;
export type DatePreset = (typeof datePresets)[number];

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  LAST_30_DAYS: "Last 30 days",
  LAST_90_DAYS: "Last 90 days",
  THIS_YEAR: "This year",
  ALL_TIME: "All time",
};

const DAY_MS = 24 * 60 * 60 * 1000;
// A campaign counts as running while its latest email is at most this old.
const ACTIVE_WINDOW_DAYS = 14;

/**
 * Draft: no dated emails yet. Active: the latest email went out within the
 * last 14 days. Ended: the latest email is older than that.
 */
export function campaignStatus(
  range: CampaignDateRange | undefined,
  now: Date,
): CampaignStatus {
  if (!range) return "Draft";
  const sinceLast = now.getTime() - new Date(range.endDate).getTime();
  return sinceLast <= ACTIVE_WINDOW_DAYS * DAY_MS ? "Active" : "Ended";
}

/**
 * "Oct 2 – Dec 15, 2026". The year is written once when both ends share it,
 * and a range within one day collapses to a single date. `timeZone` defaults
 * to the viewer's own, so dates match the day the email arrived for them.
 */
export function formatDateRange(
  range: CampaignDateRange,
  timeZone?: string,
): string {
  const monthDay = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone,
  });
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone });
  const start = new Date(range.startDate);
  const end = new Date(range.endDate);
  const startYear = year.format(start);
  const endYear = year.format(end);

  if (startYear === endYear) {
    const from = monthDay.format(start);
    const to = monthDay.format(end);
    return from === to ? `${to}, ${endYear}` : `${from} – ${to}, ${endYear}`;
  }
  return `${monthDay.format(start)}, ${startYear} – ${monthDay.format(end)}, ${endYear}`;
}

/** One entry per kind of linked item, in the order each first appears. */
export function campaignChannels(campaign: Campaign): Channel[] {
  return [...new Set(campaign.linkedItems.map((item) => item.type))];
}

export type CampaignRow = {
  campaign: Campaign;
  range: CampaignDateRange | undefined;
  status: CampaignStatus;
  channels: Channel[];
};

/** Joins each campaign to its date range and works out what the table shows. */
export function toCampaignRows(
  campaigns: readonly Campaign[],
  ranges: readonly CampaignDateRange[],
  now: Date,
): CampaignRow[] {
  const rangeById = new Map(ranges.map((range) => [range.campaignId, range]));
  return campaigns.map((campaign) => {
    const range = rangeById.get(campaign.campaignId);
    return {
      campaign,
      range,
      status: campaignStatus(range, now),
      channels: campaignChannels(campaign),
    };
  });
}

export type CampaignFilters = {
  search: string;
  date: DatePreset;
  // An empty list means that filter is off, not that nothing matches.
  statuses: readonly CampaignStatus[];
  regions: readonly UserRegion[];
  channels: readonly Channel[];
};

export const NO_FILTERS: CampaignFilters = {
  search: "",
  date: "ALL_TIME",
  statuses: [],
  regions: [],
  channels: [],
};

/** The window a preset covers, ending now. `ALL_TIME` has none. */
export function presetWindow(
  preset: DatePreset,
  now: Date,
): { start: Date; end: Date } | null {
  switch (preset) {
    case "ALL_TIME":
      return null;
    case "LAST_30_DAYS":
      return { start: new Date(now.getTime() - 30 * DAY_MS), end: now };
    case "LAST_90_DAYS":
      return { start: new Date(now.getTime() - 90 * DAY_MS), end: now };
    case "THIS_YEAR":
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
  }
}

function matchesDate(row: CampaignRow, preset: DatePreset, now: Date): boolean {
  const window = presetWindow(preset, now);
  if (!window) return true;
  // Drafts have no dates, so they can only match "All time".
  if (!row.range) return false;
  // A campaign matches if it ran at any point in the window.
  return (
    new Date(row.range.startDate) <= window.end &&
    new Date(row.range.endDate) >= window.start
  );
}

function matchesAny<T>(selected: readonly T[], values: readonly T[]): boolean {
  return selected.length === 0 || values.some((v) => selected.includes(v));
}

export function filterCampaigns(
  rows: readonly CampaignRow[],
  filters: CampaignFilters,
  now: Date,
): CampaignRow[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter(
    (row) =>
      row.campaign.name.toLowerCase().includes(search) &&
      matchesDate(row, filters.date, now) &&
      matchesAny(filters.statuses, [row.status]) &&
      matchesAny(filters.regions, [row.campaign.region]) &&
      matchesAny(filters.channels, row.channels),
  );
}

export type SortDirection = "desc" | "asc";

/**
 * Orders by when each campaign last sent, newest first by default. Drafts have
 * no date, so they go last in either direction. Ties fall back to name so the
 * order is stable.
 */
export function sortCampaigns(
  rows: readonly CampaignRow[],
  direction: SortDirection = "desc",
): CampaignRow[] {
  const sign = direction === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    if (!a.range || !b.range) {
      if (a.range) return -1;
      if (b.range) return 1;
    } else if (a.range.endDate !== b.range.endDate) {
      return a.range.endDate < b.range.endDate ? -sign : sign;
    }
    return a.campaign.name.localeCompare(b.campaign.name);
  });
}
