import type { ReactNode } from "react";
import {
  CaretDownIcon,
  CaretUpIcon,
  ListIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@frontend/components/ui/table.tsx";
import type {
  CampaignRow,
  SortDirection,
} from "@frontend/components/campaigns-list/campaign-list.ts";
import {
  CHANNEL_LABELS,
  STATUS_DOT_CLASS,
  formatDateRange,
} from "@frontend/components/campaigns-list/campaign-list.ts";

// Widths only take effect because the table uses `table-fixed`.
// `bar` is the width of that column's loading placeholder.
const COLUMNS = [
  { label: "Name", width: "w-[22%]", bar: "w-[9.375rem]" },
  { label: "Date", width: "w-[21%]", bar: "w-[8.875rem]" },
  { label: "Region", width: "w-[13%]", bar: "w-[7.5rem]" },
  { label: "Channel", width: "w-[19%]", bar: "w-[6.875rem]" },
  { label: "Status", width: "w-[17%]", bar: "w-[4.75rem]" },
] as const;
// The last, unlabelled column holds each row's ⋮ menu.
const ACTIONS_WIDTH = "w-[8%]";
const CELL_PADDING = "px-5.5";
const BAR = "h-3 max-w-full rounded-[0.375rem] bg-[#EEEAE5]";

type SortProps = {
  sort?: SortDirection;
  /** Left out where the table can't be sorted, such as while loading. */
  onToggleSort?: () => void;
};

function CampaignTableFrame({
  sort = "desc",
  onToggleSort,
  testId,
  busy = false,
  className = "",
  children,
}: SortProps & {
  testId?: string;
  busy?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      aria-busy={busy || undefined}
      className={`overflow-hidden rounded-[0.625rem] border border-[#ECE8E3] bg-white ${className}`}
    >
      <Table className="table-fixed">
        <TableHeader className="[&_tr]:border-0">
          <TableRow className="bg-[#F9F7F4] hover:bg-[#F9F7F4]">
            {COLUMNS.map(({ label, width }) => (
              <TableHead
                key={label}
                aria-sort={
                  label === "Date"
                    ? sort === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
                className={`${width} h-13 ${CELL_PADDING} text-[0.875rem] font-semibold text-[#6B6B6B]`}
              >
                {label === "Date" ? (
                  <button
                    type="button"
                    onClick={onToggleSort}
                    disabled={!onToggleSort}
                    data-testid="campaign-sort-date"
                    className="inline-flex cursor-pointer items-center gap-1 disabled:cursor-default"
                  >
                    {label}
                    {sort === "asc" ? (
                      <CaretUpIcon className="size-3" />
                    ) : (
                      <CaretDownIcon className="size-3" />
                    )}
                  </button>
                ) : (
                  label
                )}
              </TableHead>
            ))}
            <TableHead className={ACTIONS_WIDTH}>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

function CampaignTableRow({ row }: { row: CampaignRow }) {
  const { campaign, range, status, channels } = row;
  return (
    <TableRow
      data-testid={`campaign-row-${campaign.campaignId}`}
      className="relative h-18.75 border-[#ECE8E3] hover:bg-[#FBFAF8]"
    >
      <TableCell className={`${CELL_PADDING} truncate`}>
        {/* A plain link rather than the router's `Link`, which only accepts
            routes that exist, and the campaign page has no route yet. */}
        <a
          href={`/campaigns/${encodeURIComponent(campaign.campaignId)}`}
          className="text-[0.9375rem] font-semibold text-[#1F1F1F] outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
        >
          {campaign.name}
        </a>
      </TableCell>
      <TableCell
        className={`${CELL_PADDING} truncate text-[0.9375rem] text-[#6B6B6B]`}
      >
        {range ? formatDateRange(range) : null}
      </TableCell>
      <TableCell
        className={`${CELL_PADDING} truncate text-[0.9375rem] text-[#6B6B6B]`}
      >
        {campaign.region}
      </TableCell>
      <TableCell className={CELL_PADDING}>
        <div className="flex flex-wrap gap-1.5">
          {channels.map((channel) => (
            <span
              key={channel}
              className="rounded-full border border-[#D9D4CE] bg-white px-2 py-0.5 text-[0.8125rem] text-[#1F1F1F]"
            >
              {CHANNEL_LABELS[channel]}
            </span>
          ))}
        </div>
      </TableCell>
      <TableCell className={CELL_PADDING}>
        <span className="inline-flex items-center gap-2 text-[0.9375rem] text-[#1F1F1F]">
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${STATUS_DOT_CLASS[status]}`}
          />
          {status}
        </span>
      </TableCell>
      <TableCell className={CELL_PADDING} />
    </TableRow>
  );
}

export function CampaignTable({
  rows,
  ...sortProps
}: SortProps & { rows: readonly CampaignRow[] }) {
  return (
    <CampaignTableFrame testId="campaign-table" {...sortProps}>
      {rows.map((row) => (
        <CampaignTableRow key={row.campaign.campaignId} row={row} />
      ))}
    </CampaignTableFrame>
  );
}

/** The table's header with a message filling the body, such as an empty state. */
export function CampaignTableMessage({
  children,
  ...sortProps
}: SortProps & { children: ReactNode }) {
  return (
    <CampaignTableFrame {...sortProps}>
      <TableRow className="border-0 hover:bg-transparent">
        <TableCell
          colSpan={COLUMNS.length + 1}
          className="p-0 whitespace-normal"
        >
          {children}
        </TableCell>
      </TableRow>
    </CampaignTableFrame>
  );
}

export function CampaignTableSkeleton() {
  return (
    <CampaignTableFrame testId="campaign-list-loading" busy className="pb-14">
      {Array.from({ length: 4 }, (_, row) => (
        <TableRow
          key={row}
          className="h-13.5 border-[#ECE8E3] hover:bg-transparent"
        >
          {COLUMNS.map(({ label, bar }) => (
            <TableCell key={label} className={CELL_PADDING}>
              <Skeleton className={`${bar} ${BAR}`} />
            </TableCell>
          ))}
          <TableCell className={CELL_PADDING}>
            <Skeleton className={`ml-auto w-22 ${BAR}`} />
          </TableCell>
        </TableRow>
      ))}
    </CampaignTableFrame>
  );
}

/** List is the only view for now */
export function CampaignViewToggle() {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-pressed="true"
        aria-label="List view"
        className="rounded-md p-1 text-[#1F1F1F]"
      >
        <ListIcon className="size-5" />
      </button>
      <button
        type="button"
        aria-pressed="false"
        aria-label="Grid view"
        title="Grid view is coming soon"
        disabled
        className="rounded-md p-1 text-[#B5B0AA] disabled:cursor-not-allowed"
      >
        <SquaresFourIcon className="size-5" />
      </button>
    </div>
  );
}
