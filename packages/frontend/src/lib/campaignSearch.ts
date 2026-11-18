import { type } from "arktype";
import type { Type } from "arktype";
import { userRegion, userRegions } from "@repo/common";
import {
  NO_FILTERS,
  campaignStatuses,
  channels,
  datePresets,
} from "@frontend/lib/campaign-list.ts";
import type {
  CampaignFilters,
  DatePreset,
  SortDirection,
} from "@frontend/lib/campaign-list.ts";

// "All time" is the default, so it never appears in the URL.
const urlDatePresets = datePresets.filter(
  (preset): preset is Exclude<DatePreset, "ALL_TIME"> => preset !== "ALL_TIME",
);

const searchText = type("string >= 1");
const urlDatePreset = type.enumerated(...urlDatePresets);
const campaignStatus = type.enumerated(...campaignStatuses);
const channel = type.enumerated(...channels);
const sortParam = type("'asc'");

/**
 * The campaign list's search, filters and sort, kept in the URL so a filtered
 * view survives a reload and can be shared. A missing key means its default.
 */
export const campaignSearch = type({
  "q?": searchText,
  "date?": urlDatePreset,
  "status?": campaignStatus.array().atLeastLength(1),
  "region?": userRegion.array().atLeastLength(1),
  "channel?": channel.array().atLeastLength(1),
  // Newest first ("desc") is the default.
  "sort?": sortParam,
});
export type CampaignSearch = typeof campaignSearch.infer;

function valid<T extends string>(
  schema: Type<T>,
  value: unknown,
): T | undefined {
  // `allows` narrows to ArkType's distilled input type, which TypeScript
  // can't relate back to a generic `T`.
  return schema.allows(value) ? (value as T) : undefined;
}

// Filtering `allowed` rather than `value` drops unknown entries and
// duplicates, and keeps a stable order however the URL lists them.
function validEntries<T extends string>(
  allowed: readonly T[],
  value: unknown,
): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const kept = allowed.filter((option) => value.includes(option));
  return kept.length > 0 ? kept : undefined;
}

/**
 * Reads the search params against `campaignSearch` one key at a time,
 * dropping anything unrecognised instead of throwing, so a stale or
 * hand-edited link still opens the page. ArkType rejects a whole value, so
 * lists are cleaned entry by entry first to keep their valid entries.
 *
 * Kept as a function rather than passing `campaignSearch` to `validateSearch`
 * directly: the router types links and `navigate` from a schema's input, and
 * this keeps that input as `CampaignSearch` rather than `unknown`.
 */
export function parseCampaignSearch(
  raw: Record<string, unknown>,
): CampaignSearch {
  return {
    // The router JSON-parses each param, so `?q=2026` arrives as a number.
    q: valid(searchText, typeof raw.q === "number" ? String(raw.q) : raw.q),
    date: valid(urlDatePreset, raw.date),
    status: validEntries(campaignStatuses, raw.status),
    region: validEntries(userRegions, raw.region),
    channel: validEntries(channels, raw.channel),
    sort: valid(sortParam, raw.sort),
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
