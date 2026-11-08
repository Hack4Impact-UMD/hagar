import { canEditView, canShareView, chartWidth } from "@repo/common";
import type { View } from "@repo/common";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { NewViewDialog } from "@frontend/components/home/NewViewDialog.tsx";
import { ViewPicker } from "@frontend/components/home/ViewPicker.tsx";
import { ViewEditor } from "@frontend/components/home/ViewEditor.tsx";
import { ViewCard } from "@frontend/components/home/ViewCard.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import { Separator } from "@frontend/components/ui/separator.tsx";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
import { trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/_app/")({
  validateSearch: (search: Record<string, unknown>): { view?: string } => ({
    view: typeof search.view === "string" ? search.view : undefined,
  }),
  component: Home,
});

function Home() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <main
      // Capped to the screen so the header stays put and only the cards
      // scroll. While customizing, the editor's buttons sit 24px above the
      // bottom.
      className="flex min-h-0 flex-1 flex-col px-14 pt-[96px] has-data-editing:pb-6"
    >
      <HomeContent notice={notice} onNotice={setNotice} />
    </main>
  );
}

function HomeContent({
  notice,
  onNotice,
}: {
  notice: string | null;
  onNotice: (message: string) => void;
}) {
  const { view } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const me = useQuery({ ...trpc.me.queryOptions(), staleTime: "static" });
  const views = useQuery(trpc.views.list.queryOptions());
  const [newViewOpen, setNewViewOpen] = useState(false);

  // The view being customized, as the server had it when Customize was pressed.
  const [editing, setEditing] = useState<View | null>(null);
  const [startingEdit, setStartingEdit] = useState(false);
  const isEditing = editing !== null;

  const selected = views.data?.find((v) => v.viewId === view);
  const firstViewId = views.data?.[0]?.viewId;

  // No valid view in the URL: pick the newest one. `replace` keeps the Back
  // button from landing on the URL we just corrected.
  useEffect(() => {
    if (firstViewId && !selected) {
      void navigate({ search: { view: firstViewId }, replace: true });
    }
  }, [firstViewId, selected, navigate]);

  // The list must include the new view before it's selected. Otherwise the
  // effect above treats it as missing and jumps back to the first view.
  async function showNewView(viewId: string) {
    await queryClient.invalidateQueries({
      queryKey: trpc.views.list.queryKey(),
    });
    await navigate({ search: { view: viewId } });
  }

  async function startCustomizing(viewId: string) {
    setStartingEdit(true);
    try {
      // The draft starts from the server's latest copy, not the cached one.
      const fresh = await queryClient.fetchQuery({
        ...trpc.views.get.queryOptions({ viewId }),
        staleTime: 0,
      });
      setEditing(fresh);
    } catch (error) {
      if (errorCode(error) === "NOT_FOUND") {
        onNotice("That view can't be found.");
        void queryClient.invalidateQueries({
          queryKey: trpc.views.list.queryKey(),
        });
      } else {
        onNotice("Couldn't open this view for customizing. Try again.");
      }
    } finally {
      setStartingEdit(false);
    }
  }

  function page(body: ReactNode, controls?: ReactNode) {
    return (
      <>
        {/* The editor has its own header with the name field. */}
        {!isEditing && <PageHeader view={selected}>{controls}</PageHeader>}
        {notice && (
          <p role="status" className="mt-4">
            {notice}
          </p>
        )}
        {isEditing ? (
          body
        ) : (
          // Starts right at the line, so cards scroll up to it through the
          // top padding.
          <div className="-mx-4 min-h-[300px] flex-1 overflow-y-auto px-4 pt-10 pb-6">
            {body}
          </div>
        )}
        <NewViewDialog
          open={newViewOpen}
          onOpenChange={setNewViewOpen}
          onCreated={showNewView}
        />
      </>
    );
  }

  if (views.isPending) return page(<HomeSkeleton />);

  if (views.isError) {
    return page(
      <div className="flex flex-col items-start gap-3">
        <p>We couldn&apos;t load your views.</p>
        <Button variant="outline" onClick={() => void views.refetch()}>
          Retry
        </Button>
      </div>,
    );
  }

  if (views.data.length === 0) {
    return page(
      <div className="flex flex-col items-start gap-3">
        <p>You don&apos;t have any views yet.</p>
        <Button onClick={() => setNewViewOpen(true)}>New view</Button>
      </div>,
    );
  }

  if (!selected) return page(<HomeSkeleton />);

  const canEdit = me.data !== undefined && canEditView(me.data, selected);

  return page(
    isEditing ? (
      <ViewEditor
        view={editing}
        canShare={me.data !== undefined && canShareView(me.data, editing)}
        onExit={() => setEditing(null)}
        onNotice={onNotice}
      />
    ) : (
      <ViewDetails viewId={selected.viewId} onNotice={onNotice} />
    ),
    <>
      <ViewPicker
        views={views.data}
        selectedId={selected.viewId}
        onSelect={(viewId) => void navigate({ search: { view: viewId } })}
        onNewView={() => setNewViewOpen(true)}
      />
      {canEdit && (
        <Button
          disabled={startingEdit}
          onClick={() => void startCustomizing(selected.viewId)}
          className="h-8 w-37 gap-1 rounded-sm px-2.5 text-sm font-medium"
        >
          {startingEdit ? "Opening…" : "Customize View"}
        </Button>
      )}
    </>,
  );
}

function PageHeader({
  view,
  children,
}: {
  view: View | undefined;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      <h1
        data-testid="homepage"
        className="text-[35px] leading-none font-semibold"
      >
        {view?.name ?? "Dashboards"}
      </h1>
      <div className="flex min-h-8 items-center justify-between gap-4">
        {view && (
          <p className="text-2xl leading-none font-medium text-[#808080]">
            Showing {view.charts.length} analytics in {view.name} view
          </p>
        )}
        {children && (
          <div className="ml-auto flex items-center gap-2.5">{children}</div>
        )}
      </div>
      <Separator className="mt-4" />
    </header>
  );
}

function ViewDetails({
  viewId,
  onNotice,
}: {
  viewId: string;
  onNotice: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const view = useQuery(trpc.views.get.queryOptions({ viewId }));
  const notFound = view.error?.data?.code === "NOT_FOUND";

  // The view was deleted or unshared after the list loaded. Reloading the list
  // drops it, and HomeContent then selects the first view that's left.
  useEffect(() => {
    if (notFound) {
      onNotice("That view can't be found.");
      void queryClient.invalidateQueries({
        queryKey: trpc.views.list.queryKey(),
      });
    }
  }, [notFound, onNotice, queryClient]);

  if (view.isPending || notFound) return <HomeSkeleton />;

  if (view.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>We couldn&apos;t load this view.</p>
        <Button variant="outline" onClick={() => void view.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const { charts } = view.data;

  return (
    <section>
      {charts.length === 0 ? (
        <p>This view has no cards yet</p>
      ) : (
        <ul className="grid gap-[50px] md:grid-cols-3">
          {charts.map((chart, i) => (
            <ViewCard
              // oxlint-disable-next-line react/no-array-index-key -- cards have no id and names can repeat; this list never reorders while viewing.
              key={i}
              name={chart.name}
              width={chartWidth(chart)}
            />
          ))}
        </ul>
      )}
    </section>
  );
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

/** The tRPC error code, such as "NOT_FOUND", or undefined for other errors. */
function errorCode(error: unknown): string | undefined {
  return error instanceof TRPCClientError ? error.data?.code : undefined;
}
