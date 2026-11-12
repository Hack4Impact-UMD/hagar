import type { UserRegion } from "@repo/common";
import { userRegions } from "@repo/common";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select.tsx";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const ALL_REGIONS = "all";

export function currentYearMonth(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function parseMonthParam(
  raw: unknown,
  fallback = currentYearMonth(),
): string {
  if (typeof raw === "string" && MONTH_PATTERN.test(raw)) {
    return raw;
  }
  return fallback;
}

export function parseYearMonth(month: string): {
  year: number;
  monthIndex: number;
} {
  const [yearStr, monthStr] = month.split("-");
  return {
    year: Number(yearStr),
    monthIndex: Number(monthStr) - 1,
  };
}

export function shiftMonth(month: string, delta: number): string {
  const { year, monthIndex } = parseYearMonth(month);
  const shifted = new Date(year, monthIndex + delta, 1);
  return currentYearMonth(shifted);
}

const MONTH_HEADING_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export function formatMonthHeading(month: string): string {
  const { year, monthIndex } = parseYearMonth(month);
  return MONTH_HEADING_FORMATTER.format(new Date(year, monthIndex, 1));
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

  const setMonth = (nextMonth: string) => {
    void navigate({
      search: (prev) => ({ ...prev, month: nextMonth }),
    });
  };

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
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            data-testid="prev-month"
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <CaretLeftIcon className="size-4" aria-hidden />
          </Button>
          <h2
            data-testid="calendar-month"
            className="min-w-44 text-center text-xl font-semibold text-foreground"
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
    </main>
  );
}
