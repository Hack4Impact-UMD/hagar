import { isActive } from "@repo/common";
import { XIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import { PendingUsersTable } from "@frontend/components/user-management/pending-users-table.tsx";
import { trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/_app/user-management")({
  component: UserManagement,
});

function UserManagement() {
  // Already cached by the root route's guard, so this resolves immediately.
  const { data: me } = useQuery({
    ...trpc.me.queryOptions(),
    staleTime: "static",
  });
  const [error, setError] = useState<string | null>(null);

  // The root route only lets active users into the app.
  if (!me || !isActive(me)) return null;

  return (
    <main className="flex flex-1 flex-col">
      <header className="px-6 pt-6 pb-6 md:px-10">
        <h1
          data-testid="user-management"
          className="text-[2.1875rem] font-bold text-black leading-[normal]"
        >
          User Management
        </h1>
        <p className="text-[1.5rem] text-[#808080] leading-[normal]">
          Review and approve requests for new user access
        </p>
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

      <PendingUsersTable me={me} reportError={setError} />
    </main>
  );
}
