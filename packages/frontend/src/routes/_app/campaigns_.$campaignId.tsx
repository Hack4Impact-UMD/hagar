import { nowUtc } from "@repo/common";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { CampaignTimeline } from "@frontend/components/campaigns/campaign-timeline.tsx";
import { EmailAnalytics } from "@frontend/components/campaigns/email-analytics.tsx";
import type { EmailAnalyticsDay } from "@frontend/components/campaigns/email-analytics.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
import { linkedEmails } from "@frontend/lib/campaignDetails.ts";
import { trpc } from "@frontend/lib/trpc.ts";

/**
 * One campaign. The trailing `_` on `campaigns_` keeps this page out of the
 * list page's layout, which has no `<Outlet />`, while the URL stays
 * `/campaigns/<id>`. The id always comes from the URL, so every campaign can
 * be linked to.
 */
export const Route = createFileRoute("/_app/campaigns_/$campaignId")({
  component: CampaignDetails,
});

/**
 * Sample engagement until the real figures are decided: 90 days with a weekly
 * rhythm. Its keys match `EmailCampaignMetric`, so daily totals built from
 * snapshots can replace it without changing the chart.
 */
const TEMPLATE_EMAIL_DATA: EmailAnalyticsDay[] = Array.from(
  { length: 90 },
  (_, day) => {
    const date = new Date(Date.UTC(2026, 7, 1 + day));
    const uniqOpens = Math.round(
      140 +
        60 * Math.sin(day / 3.5) +
        25 * Math.sin(day / 11) +
        ((day * 37) % 23),
    );
    return {
      date: date.toISOString().slice(0, 10),
      uniqOpens,
      uniqClicks: Math.round(uniqOpens * 0.22 + ((day * 13) % 9)),
    };
  },
);

function CampaignDetails() {
  const { campaignId } = Route.useParams();
  // Fixed per visit so the query key, and with it the cache entry, stays put.
  const sentTo = useMemo(() => nowUtc(), []);

  const campaign = useQuery(trpc.campaigns.get.queryOptions({ campaignId }));
  // Every email sent so far; the campaign's own are picked out below.
  const emails = useQuery(trpc.emails.campaigns.queryOptions({ sentTo }));

  if (campaign.isPending) return <CampaignDetailsSkeleton />;

  if (campaign.isError) {
    if (campaign.error.data?.code === "NOT_FOUND") {
      return (
        <PageMessage testId="campaign-not-found" title="Campaign not found">
          <p>It may have been deleted, or the link may be wrong.</p>
        </PageMessage>
      );
    }
    return (
      <PageMessage testId="campaign-error" title="Couldn't load this campaign">
        <p>Something went wrong. Check your connection and try again.</p>
        <Button
          data-testid="campaign-retry"
          variant="outline"
          onClick={() => void campaign.refetch()}
        >
          Try again
        </Button>
      </PageMessage>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-10 px-6 py-10 md:px-10 xl:px-16">
      <header className="flex items-start gap-2">
        <BackToCampaigns />
        <div>
          <h1
            data-testid="campaign-name"
            className="text-[2.1875rem] leading-[2.8125rem] font-bold break-words"
          >
            {campaign.data.name}
          </h1>
          <p
            data-testid="campaign-region"
            className="text-muted-foreground text-2xl leading-[1.9375rem]"
          >
            {campaign.data.region}
          </p>
        </div>
      </header>

      <section
        aria-labelledby="traffic-overview"
        className="flex flex-col gap-6 md:ml-8"
      >
        <h2 id="traffic-overview" className="text-2xl font-bold">
          Traffic Overview
        </h2>
        <EmailAnalytics data={TEMPLATE_EMAIL_DATA} />
      </section>

      <hr className="border-border" />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {emails.isPending ? (
          <TimelineSkeleton />
        ) : emails.isError ? (
          <div
            role="alert"
            data-testid="timeline-error"
            className="flex items-center gap-3 self-start"
          >
            <p className="text-muted-foreground">
              Couldn&apos;t load this campaign&apos;s emails.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void emails.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : (
          <CampaignTimeline emails={linkedEmails(campaign.data, emails.data)} />
        )}
      </div>
    </main>
  );
}

function BackToCampaigns() {
  return (
    <Link
      to="/campaigns"
      aria-label="Back to campaigns"
      data-testid="back-to-campaigns"
      className="text-muted-foreground hover:text-foreground mt-2 rounded-md"
    >
      <CaretLeftIcon aria-hidden className="size-6" />
    </Link>
  );
}

function PageMessage({
  testId,
  title,
  children,
}: {
  testId: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 data-testid={testId} className="text-2xl font-semibold">
        {title}
      </h1>
      <div className="text-muted-foreground flex flex-col items-center gap-4">
        {children}
      </div>
      <Link to="/campaigns" className="underline">
        Back to campaigns
      </Link>
    </main>
  );
}

function CampaignDetailsSkeleton() {
  return (
    <main
      aria-busy
      aria-label="Loading campaign"
      data-testid="campaign-loading"
      className="flex flex-1 flex-col gap-10 px-6 py-10 md:px-10 xl:px-16"
    >
      <div className="flex flex-col gap-3 md:ml-8">
        <Skeleton className="h-11 w-80 max-w-full" />
        <Skeleton className="h-7 w-40" />
      </div>
      <div className="flex flex-col gap-6 md:ml-8">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-[22rem] w-full rounded-[1.25rem]" />
      </div>
      <hr className="border-border" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <TimelineSkeleton />
      </div>
    </main>
  );
}

function TimelineSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-10 pt-14">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-6">
          <Skeleton className="h-11 w-16" />
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-[3.1875rem] flex-1" />
        </div>
      ))}
    </div>
  );
}
