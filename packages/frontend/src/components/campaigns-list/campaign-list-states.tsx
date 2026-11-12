import type { ReactNode } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@frontend/components/ui/button.tsx";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@frontend/components/ui/table.tsx";

// Widths only take effect because the skeleton's table uses `table-fixed`.
// `bar` is the placeholder's own width; the actions bar sits at the right.
const SKELETON_COLUMNS = [
  { label: "Name", width: "w-[21%]", bar: "w-[9.375rem]" },
  { label: "Date", width: "w-[15.5%]", bar: "w-[8.875rem]" },
  { label: "Region", width: "w-[14%]", bar: "w-[7.5rem]" },
  { label: "Channel", width: "w-[15.5%]", bar: "w-[6.875rem]" },
  { label: "Status", width: "w-[25%]", bar: "w-[4.75rem]" },
] as const;

export function CampaignTableSkeleton() {
  return (
    <div
      data-testid="campaign-list-loading"
      aria-busy="true"
      className="overflow-hidden rounded-[0.625rem] border border-[#ECE8E3] bg-white pb-14"
    >
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="border-0 bg-[#F9F7F4] hover:bg-[#F9F7F4]">
            {SKELETON_COLUMNS.map(({ label, width }) => (
              <TableHead
                key={label}
                className={`${width} h-13 px-5.5 text-[0.875rem] font-semibold text-[#6B6B6B]`}
              >
                {label === "Date" ? (
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <CaretDownIcon className="size-3" />
                  </span>
                ) : (
                  label
                )}
              </TableHead>
            ))}
            <TableHead className="w-[9%]">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 4 }, (_, row) => (
            <TableRow
              key={row}
              className="h-13.5 border-[#ECE8E3] hover:bg-transparent"
            >
              {SKELETON_COLUMNS.map(({ label, bar }) => (
                <TableCell key={label} className="px-5.5">
                  <Skeleton
                    className={`${bar} h-3 max-w-full rounded-[0.375rem] bg-[#EEEAE5]`}
                  />
                </TableCell>
              ))}
              <TableCell className="px-5.5">
                <Skeleton className="ml-auto h-3 w-22 max-w-full rounded-[0.375rem] bg-[#EEEAE5]" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

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
