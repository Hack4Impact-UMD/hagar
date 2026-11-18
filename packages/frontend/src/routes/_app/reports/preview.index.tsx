import { createFileRoute, Link } from "@tanstack/react-router";
import { pageTitle } from "@frontend/lib/pageTitle.ts";

/**
 * The report preview with no view chosen yet. Choosing a view moves to
 * `/reports/preview/$viewId`, so every preview can be linked to and reloaded.
 */
export const Route = createFileRoute("/_app/reports/preview/")({
  head: () => pageTitle("Report preview"),
  component: ReportPreviewEmpty,
});

function ReportPreviewEmpty() {
  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 data-testid="report-preview">Report preview</h1>
      <p>
        Placeholder for choosing a view to preview and generate a report of.
      </p>
      <Link to="/" className="underline">
        Back to homepage
      </Link>
    </main>
  );
}
