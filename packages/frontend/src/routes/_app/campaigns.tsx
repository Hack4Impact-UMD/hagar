import { campaignDateRanges, nowUtc } from "@repo/common";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  CampaignListEmpty,
  CampaignListError,
  CampaignListNoMatches,
  CampaignTableSkeleton,
} from "@frontend/components/campaigns-list/campaign-list-states.tsx";
import type { CampaignRow } from "@frontend/components/campaigns-list/campaign-list.ts";
import {
  filterCampaigns,
  sortCampaigns,
  toCampaignRows,
} from "@frontend/components/campaigns-list/campaign-list.ts";
import {
  parseCampaignSearch,
  toFilters,
  toSortDirection,
} from "@frontend/lib/campaignSearch.ts";
import { trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/_app/campaigns")({
  validateSearch: parseCampaignSearch,
  component: Campaigns,
});

function Campaigns() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const now = useMemo(() => nowUtc(), []);
  const campaigns = useQuery(trpc.campaigns.list.queryOptions());
  const emails = useQuery(trpc.emails.campaigns.queryOptions({ sentTo: now }));
  const rows = useMemo((): CampaignRow[] | null | undefined => {
    if (!campaigns.data || !emails.data) return undefined;
    try {
      const ranges = campaignDateRanges(campaigns.data, emails.data);
      return toCampaignRows(campaigns.data, ranges, new Date(now));
    } catch (error) {
      console.error(error);
      return null;
    }
  }, [campaigns.data, emails.data, now]);

  const visible = useMemo(
    () =>
      rows &&
      sortCampaigns(
        filterCampaigns(rows, toFilters(search), new Date(now)),
        toSortDirection(search),
      ),
    [rows, search, now],
  );

  const retry = () => {
    void campaigns.refetch();
    void emails.refetch();
  };

  let body: ReactNode;
  if (campaigns.isError || emails.isError || rows === null) {
    body = <CampaignListError onRetry={retry} />;
  } else if (!rows || !visible) {
    body = <CampaignTableSkeleton />;
  } else if (rows.length === 0) {
    body = <CampaignListEmpty />;
  } else if (visible.length === 0) {
    body = <CampaignListNoMatches onClear={() => navigate({ search: {} })} />;
  } else {
    body = (
      <ul data-testid="campaign-list">
        {visible.map((row) => (
          <li key={row.campaign.campaignId}>{row.campaign.name}</li>
        ))}
      </ul>
    );
  }
  //body = <CampaignTableSkeleton />;
  //body = <CampaignListError onRetry={retry} />;              // error
  //body = <CampaignListEmpty />;                              // no campaigns
  body = <CampaignListNoMatches onClear={() => {}} />; // no matches
  return (
    <main className="flex flex-1 flex-col gap-6 px-6 pt-6 pb-10 md:px-10">
      <h1
        data-testid="campaigns"
        className="text-[2.1875rem] leading-[normal] font-bold text-black"
      >
        Campaign List
      </h1>
      {body}
    </main>
  );
}
