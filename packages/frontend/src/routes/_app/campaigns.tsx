import { createFileRoute, Link } from "@tanstack/react-router";
import { pageTitle } from "@frontend/lib/pageTitle.ts";

export const Route = createFileRoute("/_app/campaigns")({
  head: () => pageTitle("Campaigns"),
  component: Campaigns,
});

function Campaigns() {
  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 data-testid="campaigns">Campaigns</h1>
      <p>Placeholder for campaigns.</p>
      <Link to="/" className="underline">
        Back to homepage
      </Link>
    </main>
  );
}
