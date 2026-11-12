import { createFileRoute } from "@tanstack/react-router";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

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

export const Route = createFileRoute("/_app/calendar")({
  validateSearch: (search: Record<string, unknown>) => ({
    month: parseMonthParam(search.month),
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { month } = Route.useSearch();

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
        className="mb-4 flex h-10 items-center justify-between gap-4"
      >
        <span data-testid="calendar-month" className="text-xl font-semibold">
          {month}
        </span>
      </section>
    </main>
  );
}
