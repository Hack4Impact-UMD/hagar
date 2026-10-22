import { createFileRoute, Link } from "@tanstack/react-router";

/**
 * Lists every report the user can see, newest first, with a way to open and
 * download each one.
 */
export const Route = createFileRoute("/_app/reports/history")({
  component: ReportsHistory,
});

function ReportsHistory() {
  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 data-testid="reports-history">Reports history</h1>
      <p>Placeholder for searching, opening and downloading past reports.</p>
      <Link to="/" className="underline">
        Back to homepage
      </Link>
    </main>
  );
}
