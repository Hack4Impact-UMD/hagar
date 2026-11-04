import { canEditView, canShareView, MAX_USER_INFO } from "@repo/common";
import type { UserInfo, View } from "@repo/common";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";
import { useEffect, useState } from "react";
import { NewViewDialog } from "@frontend/components/home/NewViewDialog.tsx";
import { ViewPicker } from "@frontend/components/home/ViewPicker.tsx";
import { ViewEditor } from "@frontend/components/home/ViewEditor.tsx";
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
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <main className="flex flex-col gap-2 p-6 md:px-10">
      <header className="flex items-start justify-between gap-4">
        <h1
          data-testid="homepage"
          className="text-[2.1875rem] leading-[normal] font-bold"
        >
          {firstName ? `Welcome, ${firstName}` : "Welcome"}
        </h1>
        <Button
          variant="ghost"
          size="sm"
          data-testid="sign-out"
          onClick={() => void auth.signOut()}
        >
          Sign out
        </Button>
      </header>
      {notice && <p role="status">{notice}</p>}
      <HomeContent onNotice={setNotice} />
    </main>
  );
}

function HomeContent({ onNotice }: { onNotice: (message: string) => void }) {
  const { view } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const me = useQuery({ ...trpc.me.queryOptions(), staleTime: "static" });
  const views = useQuery(trpc.views.list.queryOptions());
  const { authors, authorsLoading } = useAuthors(views.data ?? []);

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

  if (views.isPending) return <HomeSkeleton />;

  if (views.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>We couldn&apos;t load your views.</p>
        <Button variant="outline" onClick={() => void views.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (views.data.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>You don&apos;t have any views yet.</p>
        <NewViewDialog onCreated={showNewView} />
      </div>
    );
  }

  if (!selected) return <HomeSkeleton />;

  const canEdit = me.data !== undefined && canEditView(me.data, selected);

  return (
    <>
      return (
      <div className="flex flex-col gap-8">
        {/* The editor has its own row with Cancel and Save, so this one is hidden
          while customizing. */}
        {!isEditing && (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="text-lg">
              Showing <strong>{selected.charts.length}</strong> analytics in the{" "}
              <strong>{selected.name}</strong> view
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <NewViewDialog onCreated={showNewView} />
              <CopyButton
                key={selected.viewId}
                viewId={selected.viewId}
                onCopied={showNewView}
              />
              <ViewPicker
                views={views.data}
                authors={authors}
                authorsLoading={authorsLoading}
                selectedId={selected.viewId}
                onSelect={(viewId) =>
                  void navigate({ search: { view: viewId } })
                }
              />
              {canEdit && (
                <Button
                  disabled={startingEdit}
                  onClick={() => void startCustomizing(selected.viewId)}
                >
                  {startingEdit ? "Opening…" : "Customize view"}
                </Button>
              )}
            </div>
          </div>
        )}

        {isEditing ? (
          <ViewEditor
            view={editing}
            canShare={me.data !== undefined && canShareView(me.data, editing)}
            onExit={() => setEditing(null)}
            onNotice={onNotice}
          />
        ) : (
          <ViewDetails viewId={selected.viewId} onNotice={onNotice} />
        )}
      </div>
      );
    </>
  );
}

function CopyButton({
  viewId,
  onCopied,
  disabled,
}: {
  viewId: string;
  onCopied: (viewId: string) => Promise<void>;
  disabled?: boolean;
}) {
  const copy = useMutation({
    ...trpc.views.copy.mutationOptions(),
    onSuccess: (view) => onCopied(view.viewId),
  });

  return (
    <div className="flex items-center gap-2">
      {copy.isError && (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t copy this view.
        </p>
      )}
      <Button
        variant="outline"
        disabled={disabled || copy.isPending}
        onClick={() => copy.mutate({ viewId })}
        className="border-primary text-primary"
      >
        {copy.isPending ? "Copying…" : "Copy"}
      </Button>
    </div>
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
        <ul className="grid gap-6 md:grid-cols-3">
          {charts.map((chart, i) => (
            <li
              // oxlint-disable-next-line react/no-array-index-key -- cards have no id and names can repeat; this list never reorders while viewing.
              key={i}
              className="flex flex-col gap-4 rounded-lg border p-4 md:first:col-span-3"
            >
              <h2 className="text-lg">{chart.name}</h2>
              <div aria-hidden="true" className="h-48 rounded-md bg-muted" />
            </li>
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

/** The authors of `views`, looked up once for the whole list. */
function useAuthors(views: View[]) {
  // Sorted so the query keys don't change when only the views' order does.
  const uids = [...new Set(views.map((v) => v.authorUid))].toSorted();

  // `users.info` accepts at most MAX_USER_INFO (100) uids per call.
  const chunks: string[][] = [];
  for (let i = 0; i < uids.length; i += MAX_USER_INFO) {
    chunks.push(uids.slice(i, i + MAX_USER_INFO));
  }

  const results = useQueries({
    queries: chunks.map((chunk) =>
      trpc.users.info.queryOptions({ uids: chunk }),
    ),
  });

  const authors = new Map<string, UserInfo>();
  for (const result of results) {
    for (const user of result.data ?? []) authors.set(user.uid, user);
  }

  return { authors, authorsLoading: results.some((r) => r.isPending) };
}

/** The tRPC error code, such as "NOT_FOUND", or undefined for other errors. */
function errorCode(error: unknown): string | undefined {
  return error instanceof TRPCClientError ? error.data?.code : undefined;
}
