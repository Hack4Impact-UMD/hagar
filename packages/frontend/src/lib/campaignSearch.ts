import { userRegions } from "@repo/common";
import type { LinkedItem, UserRegion } from "@repo/common";

// Typed against `LinkedItem` so a new kind of linked item fails to compile
// until it is given a label here.
export const CHANNEL_LABELS: Record<LinkedItem["type"], string> = {
  EMAIL: "Email",
};
export type CampaignChannel = LinkedItem["type"];
export const campaignChannels = Object.keys(
  CHANNEL_LABELS,
) as CampaignChannel[];

export const campaignStatuses = ["Draft", "Active", "Ended"] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];

// "All time" is the default, so it has no key and keeps the URL clean.
export const DATE_PRESET_LABELS = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  year: "This year",
} as const;
export type DatePreset = keyof typeof DATE_PRESET_LABELS;
const datePresets = Object.keys(DATE_PRESET_LABELS) as DatePreset[];

/**
 * The campaign list's search, filters and sort, kept in the URL so a filtered
 * view survives a reload and can be shared. A missing key means its default.
 */
export type CampaignSearch = {
  q?: string;
  date?: DatePreset;
  status?: CampaignStatus[];
  region?: UserRegion[];
  channel?: CampaignChannel[];
  // Newest first is the default.
  sort?: "oldest";
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
    date: oneOf(datePresets, raw.date),
    status: someOf(campaignStatuses, raw.status),
    region: someOf(userRegions, raw.region),
    channel: someOf(campaignChannels, raw.channel),
    sort: raw.sort === "oldest" ? "oldest" : undefined,
  };
}
