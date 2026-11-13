import type { ReactNode } from "react";
import { Button } from "@frontend/components/ui/button.tsx";

/** A centred title, optional explanation and optional button filling the table body. */
function StateMessage({
  testId,
  title,
  description,
  alert = false,
  children,
}: {
  testId: string;
  title: string;
  description?: string;
  alert?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      role={alert ? "alert" : "status"}
      data-testid={testId}
      className="flex flex-col items-center px-6 pt-16 pb-24 text-center"
    >
      <p className="text-xl leading-normal font-semibold text-[#1F1F1F]">
        {title}
      </p>
      {description ? (
        <p className="mt-2 text-[0.9375rem] text-[#6B6B6B]">{description}</p>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

function OutlineButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="h-9 cursor-pointer rounded-lg border-[#D9D4CE] bg-white px-4 text-[0.8125rem] font-normal text-[#1F1F1F]"
    >
      {children}
    </Button>
  );
}

export function CampaignListError({ onRetry }: { onRetry: () => void }) {
  return (
    <StateMessage
      testId="campaign-list-error"
      title="Couldn't load campaigns"
      description="Something went wrong. Please try again."
      alert
    >
      <OutlineButton onClick={onRetry}>Try again</OutlineButton>
    </StateMessage>
  );
}

/** `action` is the Add Campaign button, left out for Viewers. */
export function CampaignListEmpty({ action }: { action?: ReactNode }) {
  return (
    <StateMessage
      testId="campaign-list-empty"
      title="No campaigns yet"
      description="Campaigns you add will show up here."
    >
      {action}
    </StateMessage>
  );
}

export function CampaignListNoMatches({ onClear }: { onClear: () => void }) {
  return (
    <StateMessage
      testId="campaign-list-no-matches"
      title="No campaigns match these filters"
      description="Try removing a filter or widening the date range."
    >
      <OutlineButton onClick={onClear}>Clear all filters</OutlineButton>
    </StateMessage>
  );
}
