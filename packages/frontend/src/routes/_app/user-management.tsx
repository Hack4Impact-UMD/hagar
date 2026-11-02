import { isActive } from "@repo/common";
import type { UserRegion } from "@repo/common";
import { UserPlusIcon, XIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import { PendingUsersTable } from "@frontend/components/user-management/pending-users-table.tsx";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";
import { ActiveUsersGrid } from "@frontend/components/user-management/active-users-grid.tsx";

type View = "pending" | "users";

const SUBTITLES: Record<View, string> = {
  pending: "Review and approve requests for new user access.",
  users: "Manage and edit information of current users",
};

export const Route = createFileRoute("/_app/user-management")({
  // Viewers get the same page as an unknown URL, so the page's existence isn't
  // advertised to people who can't use it. The root guard has already cached `me`.
  beforeLoad: async () => {
    const me = await queryClient.query({
      ...trpc.me.queryOptions(),
      staleTime: "static",
    });
    if (isActive(me) && me.role === "Viewer") throw notFound();
  },
  component: UserManagement,
});

function UserManagement() {
  // Already cached by the root route's guard, so this resolves immediately.
  const { data: me } = useQuery({
    ...trpc.me.queryOptions(),
    staleTime: "static",
  });
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("users");
  const showView = (next: View) => {
    setView(next);
    setError(null);
  };
  // Kept here so the region filter survives switching views.
  const [region, setRegion] = useState<UserRegion | undefined>();
  // Same query as the pending table, so the count costs no extra request.
  const pending = useQuery(
    trpc.users.list.queryOptions({ stage: "AWAITING APPROVAL" }),
  );

  // The root route only lets active users into the app.
  if (!me || !isActive(me)) return null;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-6 pt-6 pb-6 md:px-10">
        <div>
          <h1
            data-testid="user-management"
            className="text-[2.1875rem] font-bold text-black leading-[normal]"
          >
            User Management
          </h1>
          <p className="text-[1.5rem] text-[#808080] leading-[normal]">
            {SUBTITLES[view]}
          </p>
        </div>
        {/* The way back from the pending view must stay, even once it's empty. */}
        {view === "pending" || pending.data?.length !== 0 ? (
          <button
            type="button"
            data-testid={
              view === "users" ? "pending-requests-link" : "view-users-link"
            }
            className="flex cursor-pointer items-center gap-2 text-base font-bold text-[#C75C3B] underline"
            onClick={() => showView(view === "users" ? "pending" : "users")}
          >
            {view === "users" ? (
              <>
                <UserPlusIcon className="size-6" aria-hidden />
                Pending Requests
                {pending.data ? ` (${pending.data.length})` : ""}
                <span aria-hidden>→</span>
              </>
            ) : (
              <>
                <span aria-hidden>←</span>
                View Users
              </>
            )}
          </button>
        ) : null}
      </header>

      {error ? (
        <div
          role="alert"
          data-testid="user-management-error"
          className="mx-6 mb-4 flex items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive md:mx-10"
        >
          {error}
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss"
            data-testid="dismiss-error"
            onClick={() => setError(null)}
          >
            <XIcon />
          </Button>
        </div>
      ) : null}

      {view === "pending" ? (
        <PendingUsersTable me={me} reportError={setError} />
      ) : (
        <div className="flex-1 bg-[#F1DED2] px-6 py-8 md:px-10">
          <ActiveUsersGrid
            me={me}
            region={region}
            onRegionChange={setRegion}
            reportError={setError}
          />
        </div>
      )}
    </main>
  );
}
