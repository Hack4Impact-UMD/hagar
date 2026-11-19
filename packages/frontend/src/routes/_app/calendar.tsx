import { createFileRoute, Link } from "@tanstack/react-router";
import { pageTitle } from "@frontend/lib/pageTitle.ts";

export const Route = createFileRoute("/_app/calendar")({
  head: () => pageTitle("Calendar"),
  component: Calendar,
});

function Calendar() {
  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 data-testid="calendar">Calendar</h1>
      <p>Placeholder for the calendar.</p>
      <Link to="/" className="underline">
        Back to homepage
      </Link>
    </main>
  );
}
