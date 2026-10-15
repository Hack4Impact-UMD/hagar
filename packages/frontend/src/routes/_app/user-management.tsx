import { isActive } from "@repo/common";
import type { UserRegion } from "@repo/common";
import { XIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import { PendingUsersTable } from "@frontend/components/user-management/pending-users-table.tsx";
import { trpc } from "@frontend/lib/trpc.ts";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@frontend/components/ui/tabs.tsx";
import { ActiveUsersGrid } from "@frontend/components/user-management/active-users-grid.tsx";

type Tab = "pending" | "users";

const SUBTITLES: Record<Tab, string> = {
  pending: "Review and approve requests for new user access.",
  users: "Manage and edit information of current users",
};

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
  const [tab, setTab] = useState<Tab>("pending");
  // Kept here so the region filter survives switching tabs.
  const [region, setRegion] = useState<UserRegion | undefined>();

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
          {SUBTITLES[tab]}
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

      <Tabs
        value={tab}
        onValueChange={(next) => {
          setTab(next as Tab);
          setError(null);
        }}
        className="flex-1"
      >
        <TabsList variant="line" className="mx-6 mb-4 md:mx-10">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending Requests
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            View Users
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <PendingUsersTable me={me} reportError={setError} />
        </TabsContent>
        <TabsContent value="users" className="bg-[#F1DED2] px-6 py-8 md:px-10">
          <ActiveUsersGrid
            me={me}
            region={region}
            onRegionChange={setRegion}
            reportError={setError}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
