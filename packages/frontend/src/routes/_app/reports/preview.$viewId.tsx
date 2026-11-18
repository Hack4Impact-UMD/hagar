import { createFileRoute, Link } from "@tanstack/react-router";
import { pageTitle } from "@frontend/lib/pageTitle.ts";

/**
 * Previews what a report of one view will look like, and generates it. The view
 * comes from the URL, so a preview can be linked to and reloaded.
 */
export const Route = createFileRoute("/_app/reports/preview/$viewId")({
  head: () => pageTitle("Report preview"),
  component: ReportPreview,
});

function ReportPreview() {
  const { viewId } = Route.useParams();

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 data-testid="report-preview">Report preview</h1>
      <p>
        Placeholder for previewing and generating a report of view{" "}
        <code>{viewId}</code>.
      </p>
      <Link to="/" className="underline">
        Back to homepage
      </Link>
    </main>
  );
}
