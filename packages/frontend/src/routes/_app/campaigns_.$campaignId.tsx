import { CaretLeftIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
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

function CampaignDetails() {
  const { campaignId } = Route.useParams();
  const campaign = useQuery(trpc.campaigns.get.queryOptions({ campaignId }));

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
    </main>
  );
}
