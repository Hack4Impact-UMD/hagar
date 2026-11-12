import type { CalendarRef, DayCellInfo, EventInput } from "@fullcalendar/react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import type { UserRegion } from "@repo/common";
import { campaignDateRanges, nowUtc, userRegions } from "@repo/common";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select.tsx";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
import { trpc } from "@frontend/lib/trpc.ts";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const ALL_REGIONS = "all";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function currentYearMonth(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseMonthParam(raw: unknown, fallback = currentYearMonth()): string {
  if (typeof raw === "string" && MONTH_PATTERN.test(raw)) {
    return raw;
  }
  return fallback;
}

function parseYearMonth(month: string): {
  year: number;
  monthIndex: number;
} {
  const [yearStr, monthStr] = month.split("-");
  return {
    year: Number(yearStr),
    monthIndex: Number(monthStr) - 1,
  };
}

function shiftMonth(month: string, delta: number): string {
  const { year, monthIndex } = parseYearMonth(month);
  const shifted = new Date(year, monthIndex + delta, 1);
  return currentYearMonth(shifted);
}

const MONTH_HEADING_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function formatMonthHeading(month: string): string {
  const { year, monthIndex } = parseYearMonth(month);
  return MONTH_HEADING_FORMATTER.format(new Date(year, monthIndex, 1));
}

function monthStartDate(month: string): Date {
  const { year, monthIndex } = parseYearMonth(month);
  return new Date(year, monthIndex, 1);
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function exclusiveLocalEndDate(utcDate: string): string {
  const local = new Date(utcDate);
  const nextDay = new Date(
    local.getFullYear(),
    local.getMonth(),
    local.getDate() + 1,
  );
  return toLocalDateString(nextDay);
}

function renderDayCell(arg: DayCellInfo) {
  return (
    <span
      className={
        arg.isToday
          ? "inline-flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          : "inline-flex size-7 items-center justify-center text-sm font-medium"
      }
    >
      {arg.dayNumberText}
    </span>
  );
}

export const Route = createFileRoute("/_app/calendar")({
  validateSearch: (search: Record<string, unknown>) => ({
    month: parseMonthParam(search.month),
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { month } = Route.useSearch();
  const navigate = Route.useNavigate();
  const todayMonth = currentYearMonth();
  const [region, setRegion] = useState<UserRegion | undefined>();
  const [sentTo, setSentTo] = useState(() => nowUtc());
  const calendarRef = useRef<CalendarRef | null>(null);

  const campaignsQuery = useQuery(trpc.campaigns.list.queryOptions());
  const emailsQuery = useQuery(trpc.emails.campaigns.queryOptions({ sentTo }));

  useEffect(() => {
    calendarRef.current?.getApi().gotoDate(monthStartDate(month));
  }, [month]);

  const setMonth = (nextMonth: string) => {
    void navigate({
      search: (prev) => ({ ...prev, month: nextMonth }),
    });
  };

  const handleRetry = () => {
    setSentTo(nowUtc());
    void campaignsQuery.refetch();
    void emailsQuery.refetch();
  };

  const events = useMemo<EventInput[]>(() => {
    if (!campaignsQuery.data || !emailsQuery.data) return [];
    const filteredCampaigns = region
      ? campaignsQuery.data.filter((c) => c.region === region)
      : campaignsQuery.data;
    const campaignsById = new Map(
      filteredCampaigns.map((c) => [c.campaignId, c]),
    );

    return campaignDateRanges(filteredCampaigns, emailsQuery.data).flatMap(
      (range) => {
        const campaign = campaignsById.get(range.campaignId);
        if (!campaign) return [];
        return [
          {
            id: campaign.campaignId,
            title: campaign.name,
            start: toLocalDateString(new Date(range.startDate)),
            end: exclusiveLocalEndDate(range.endDate),
            allDay: true,
            extendedProps: {
              campaignId: campaign.campaignId,
              region: campaign.region,
            },
          },
        ];
      },
    );
  }, [campaignsQuery.data, emailsQuery.data, region]);

  const isLoading = campaignsQuery.isLoading || emailsQuery.isLoading;
  const isError = campaignsQuery.isError || emailsQuery.isError;

  return (
    <main className="flex flex-1 flex-col px-6 pt-16 pb-10 md:px-10">
      <header className="mb-6">
        <h1
          data-testid="calendar"
          className="text-[2.1875rem] leading-[normal] font-bold text-foreground"
        >
          Calendar
        </h1>
      </header>

      <section
        aria-label="Calendar controls"
        className="mb-4 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            data-testid="prev-month"
            className="-ml-2.5"
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <CaretLeftIcon className="size-4" aria-hidden />
          </Button>
          <h2
            data-testid="calendar-month"
            className="text-xl font-semibold text-foreground"
          >
            {formatMonthHeading(month)}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next month"
            data-testid="next-month"
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <CaretRightIcon className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            data-testid="today-button"
            className="h-10 border-primary text-primary hover:bg-primary/5 hover:text-primary"
            disabled={month === todayMonth}
            onClick={() => setMonth(todayMonth)}
          >
            Today
          </Button>

          <Select
            value={region ?? ALL_REGIONS}
            onValueChange={(next) =>
              setRegion(next === ALL_REGIONS ? undefined : (next as UserRegion))
            }
          >
            <SelectTrigger
              aria-label="Filter by region"
              data-testid="calendar-region-filter"
              className="data-[size=default]:h-10 min-w-40 border-primary bg-background text-primary shadow-none [&_svg]:text-primary!"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={ALL_REGIONS}>All regions</SelectItem>
              {userRegions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {isLoading ? (
        <CalendarLoadingGrid />
      ) : isError ? (
        <div
          role="alert"
          data-testid="calendar-error"
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border py-20 text-center"
        >
          <p className="text-sm text-destructive">
            PLACEHOLDER TEXT -- BACKEND STUBS NOT IMPLEMENTED YET.
          </p>
          <Button
            type="button"
            variant="outline"
            data-testid="calendar-retry"
            onClick={handleRetry}
          >
            Retry
          </Button>
        </div>
      ) : (
        <div
          data-testid="calendar-grid"
          data-count={events.length}
          className="hagar-calendar overflow-hidden rounded-2xl border border-border bg-background"
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            initialDate={monthStartDate(month)}
            headerToolbar={false}
            height="auto"
            dayCellTopContent={renderDayCell}
            events={events}
          />
        </div>
      )}
    </main>
  );
}

function CalendarLoadingGrid() {
  return (
    <div
      data-testid="calendar-loading"
      aria-label="Loading calendar"
      className="overflow-hidden rounded-2xl border border-border"
    >
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-3 py-2 text-sm font-semibold text-foreground"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }, (_, index) => (
          <div
            key={index}
            className="flex h-28 flex-col justify-between border-r border-b border-border p-3 last:border-r-0 nth-[7n]:border-r-0 nth-[n+29]:border-b-0"
          >
            <Skeleton className="ml-auto size-6 rounded-full" />
            {index % 6 === 1 ? (
              <Skeleton className="h-5 w-4/5 rounded-full" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
