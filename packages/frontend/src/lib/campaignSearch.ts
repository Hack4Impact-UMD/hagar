import { userRegions } from "@repo/common";
import type { UserRegion } from "@repo/common";
import {
  CHANNEL_LABELS,
  NO_FILTERS,
  campaignStatuses,
  datePresets,
} from "@frontend/components/campaigns-list/campaign-list.ts";
import type {
  CampaignFilters,
  CampaignStatus,
  Channel,
  DatePreset,
  SortDirection,
} from "@frontend/components/campaigns-list/campaign-list.ts";

type UrlDatePreset = Exclude<DatePreset, "ALL_TIME">;
const allChannels = Object.keys(CHANNEL_LABELS) as Channel[];
// "All time" is the default, so it never appears in the URL.
const urlDatePresets = datePresets.filter(
  (preset): preset is UrlDatePreset => preset !== "ALL_TIME",
);

/**
 * The campaign list's search, filters and sort, kept in the URL so a filtered
 * view survives a reload and can be shared. A missing key means its default.
 */
export type CampaignSearch = {
  q?: string;
  date?: UrlDatePreset;
  status?: CampaignStatus[];
  region?: UserRegion[];
  channel?: Channel[];
  // Newest first ("desc") is the default.
  sort?: "asc";
};

function oneOf<T extends string>(
  allowed: readonly T[],
  value: unknown,
): T | undefined {
  return (allowed as readonly unknown[]).includes(value)
    ? (value as T)
    : undefined;
}

// Filtering `allowed` rather than `value` drops unknown entries and
// duplicates, and keeps a stable order however the URL lists them.
function someOf<T extends string>(
  allowed: readonly T[],
  value: unknown,
): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const kept = allowed.filter((option) => value.includes(option));
  return kept.length > 0 ? kept : undefined;
}

/**
 * Reads the search params, dropping anything unrecognised instead of
 * throwing, so a stale or hand-edited link still opens the page.
 */
export function parseCampaignSearch(
  raw: Record<string, unknown>,
): CampaignSearch {
  // The router JSON-parses each param, so `?q=2026` arrives as a number.
  const q =
    typeof raw.q === "string" || typeof raw.q === "number" ? String(raw.q) : "";
  return {
    q: q === "" ? undefined : q,
    date: oneOf(urlDatePresets, raw.date),
    status: someOf(campaignStatuses, raw.status),
    region: someOf(userRegions, raw.region),
    channel: someOf(allChannels, raw.channel),
    sort: raw.sort === "asc" ? "asc" : undefined,
  };
}

export function toFilters(search: CampaignSearch): CampaignFilters {
  return {
    search: search.q ?? NO_FILTERS.search,
    date: search.date ?? NO_FILTERS.date,
    statuses: search.status ?? NO_FILTERS.statuses,
    regions: search.region ?? NO_FILTERS.regions,
    channels: search.channel ?? NO_FILTERS.channels,
  };
}

export function toSortDirection(search: CampaignSearch): SortDirection {
  return search.sort ?? "desc";
}
