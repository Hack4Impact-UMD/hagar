import { queryClient, trpc } from "@frontend/lib/trpc.ts";

// Adding and deleting both change which rows the list shows, so they refresh
// it the same way. Returns the refetch so callers can wait on it if needed.
export function refreshCampaigns() {
  return queryClient.invalidateQueries(trpc.campaigns.list.queryFilter());
}
