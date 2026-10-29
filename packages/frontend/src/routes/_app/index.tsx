import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
import { auth } from "@frontend/lib/firebase.ts";
import { trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/_app/")({
  validateSearch: (search: Record<string, unknown>): { view?: string } => ({
    view: typeof search.view === "string" ? search.view : undefined,
  }),
  component: Home,
});

function Home() {
  // Same staleTime as the root guard, so this reads its cached copy.
  const me = useQuery({ ...trpc.me.queryOptions(), staleTime: "static" });
  const firstName = me.data?.firstName;

  return (
    <main className="flex flex-col gap-6 p-6 md:px-10">
      <header className="flex items-start justify-between gap-4">
        <h1 data-testid="homepage" className="text-3xl font-bold">
          {firstName ? `Welcome, ${firstName}` : "Welcome"}
        </h1>
        <button type="button" data-testid="sign-out" onClick={() => void auth.signOut()} className="border px-3 py-1">
          Sign out
        </button>
      </header>
      <HomeContent />
    </main>
  );
}

function HomeContent() {
  const { view } = Route.useSearch();
  const navigate = Route.useNavigate();
  const views = useQuery(trpc.views.list.queryOptions());

  const selected = views.data?.find((v) => v.viewId === view);
  const firstViewId = views.data?.[0]?.viewId;

  // No valid view in the URL: pick the newest one. `replace` keeps the Back
  // button from landing on the URL we just corrected.
  useEffect(() => {
    if (firstViewId && !selected) {
      void navigate({ search: { view: firstViewId }, replace: true });
    }
  }, [firstViewId, selected, navigate]);

  if (views.isPending) return <HomeSkeleton />;

  if (views.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>We couldn't load your views.</p>
        <Button variant="outline" onClick={() => void views.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (views.data.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>You don't have any views yet.</p>
        <Button>New view</Button>
      </div>
    );
  }

  if (!selected) return <HomeSkeleton />;

  return <p>Selected view: {selected.name}</p>;
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-40 self-end" />
      <Skeleton className="h-64" />
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
