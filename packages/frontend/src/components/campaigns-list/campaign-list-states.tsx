import type { ReactNode } from "react";
import { Button } from "@frontend/components/ui/button.tsx";

function StateMessage({
  testId,
  message,
  alert = false,
  children,
}: {
  testId: string;
  message: string;
  alert?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      role={alert ? "alert" : undefined}
      data-testid={testId}
      className="flex flex-col items-center gap-3 py-12 text-center"
    >
      <p className={alert ? "text-destructive" : "text-muted-foreground"}>
        {message}
      </p>
      {children}
    </div>
  );
}

export function CampaignListError({ onRetry }: { onRetry: () => void }) {
  return (
    <StateMessage
      testId="campaign-list-error"
      message="Couldn't load campaigns."
      alert
    >
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </StateMessage>
  );
}

/** `action` is the Add Campaign button, left out for Viewers. */
export function CampaignListEmpty({ action }: { action?: ReactNode }) {
  return (
    <StateMessage testId="campaign-list-empty" message="No campaigns yet">
      {action}
    </StateMessage>
  );
}

export function CampaignListNoMatches({ onClear }: { onClear: () => void }) {
  return (
    <div
      data-testid="campaign-list-no-matches"
      className="flex flex-col items-center px-6 pt-16 pb-24 text-center"
    >
      <p className="text-[1.25rem] leading-normal font-semibold text-[#1F1F1F]">
        No campaigns match these filters
      </p>
      <p className="mt-2 text-[0.9375rem] text-[#6B6B6B]">
        Try removing a filter or widening the date range.
      </p>
      <Button
        variant="outline"
        onClick={onClear}
        className="mt-5 h-9 cursor-pointer rounded-lg border-[#D9D4CE] bg-white px-4 text-[0.8125rem] font-normal text-[#1F1F1F]"
      >
        Clear all filters
      </Button>
    </div>
  );
}
