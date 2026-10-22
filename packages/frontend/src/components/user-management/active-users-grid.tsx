import type {
  ActiveUserProfile,
  UserProfile,
  UserRegion,
  UserRole,
} from "@repo/common";
import { canAssignRole, canManage } from "@repo/common";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@frontend/components/ui/input.tsx";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
import { ConfirmDialog } from "@frontend/components/user-management/confirm-dialog.tsx";
import {
  RegionFilter,
  RoleFilter,
} from "@frontend/components/user-management/filters.tsx";
import {
  EmptyState,
  ErrorState,
} from "@frontend/components/user-management/table-states.tsx";
import type { ReportError } from "@frontend/components/user-management/use-user-mutations.ts";
import { useUserMutations } from "@frontend/components/user-management/use-user-mutations.ts";
import { UserAvatar } from "@frontend/components/user-management/user-avatar.tsx";
import {
  describeUserError,
  filterUsers,
  fullName,
  userRoles,
} from "@common/user-helpers.ts";
import { trpc } from "@frontend/lib/trpc.ts";
import { EditUserDialog } from "@frontend/components/user-management/edit-user-dialog.tsx";
import type { UserChanges } from "@frontend/components/user-management/edit-user-dialog.tsx";

interface ActiveUsersGridProps {
  me: ActiveUserProfile;
  region: UserRegion | undefined;
  onRegionChange: (region: UserRegion | undefined) => void;
  reportError: ReportError;
}

export function ActiveUsersGrid({
  me,
  region,
  onRegionChange,
  reportError,
}: ActiveUsersGridProps) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const users = useQuery(
    trpc.users.list.queryOptions({ stage: "ACTIVE", region }),
  );

  const filtered = users.data
    ? filterUsers(users.data, { search, role })
    : null;

  return (
    <div className="@container flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search name, email or phone"
            aria-label="Search name, email or phone"
            data-testid="search-users"
            className="h-8 w-48 bg-background pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <RoleFilter value={role} onChange={setRole} />
        {me.role === "Global Admin" ? (
          <RegionFilter value={region} onChange={onRegionChange} />
        ) : null}
      </div>

      {users.isError ? (
        <ErrorState message={describeUserError(users.error).message} />
      ) : filtered?.length === 0 ? (
        <EmptyState
          message={
            users.data?.length === 0
              ? "There are no active users yet."
              : "No users match your filters."
          }
        />
      ) : (
        <ul
          data-testid="active-users-grid"
          className="grid grid-cols-1 gap-x-5 gap-y-21.25 @xl:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4"
        >
          {filtered
            ? filtered.map((user) => (
                <ActiveUserCard
                  key={user.uid}
                  me={me}
                  user={user}
                  reportError={reportError}
                />
              ))
            : Array.from({ length: 12 }, (_, index) => (
                <li
                  key={index}
                  className="flex items-center gap-4 rounded-xl bg-[#F9F6F1] px-5 py-8"
                >
                  <Skeleton className="size-16 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </li>
              ))}
        </ul>
      )}
    </div>
  );
}

interface ActiveUserCardProps {
  me: ActiveUserProfile;
  user: UserProfile;
  reportError: ReportError;
}

function ActiveUserCard({ me, user, reportError }: ActiveUserCardProps) {
  const { setRole, setRegion, remove, isPending } =
    useUserMutations(reportError);
  const [dialog, setDialog] = useState<"edit" | "remove" | null>(null);
  const name = fullName(user);
  const editable = canManage(me, user);
  const isSelf = user.uid === me.uid;
  const save = async ({ role, region }: UserChanges) => {
    try {
      if (role) await setRole.mutateAsync({ uid: user.uid, role });
      if (region) await setRegion.mutateAsync({ uid: user.uid, region });
    } catch {
      // useUserMutations already showed the error.
    } finally {
      setDialog(null);
    }
  };

  const details = (
    <>
      <UserAvatar user={user} className="size-20" />
      <div className="flex min-w-0 flex-col items-start gap-0.5 text-[1.125rem]">
        <p className="truncate font-medium">
          {name}
          {isSelf ? (
            <span className="font-normal text-muted-foreground"> (you)</span>
          ) : null}
        </p>
        <p className="text-base text-[#808080]">{user.role}</p>
        <p className="text-base text-[#808080]">{user.region ?? ""}</p>
      </div>
    </>
  );
  const cardClass = "flex w-full items-center gap-6 rounded-xl px-5 py-8";

  return (
    <li
      data-testid={`user-card-${user.uid}`}
      className="rounded-xl bg-[#F9F6F1]"
    >
      {editable ? (
        <button
          type="button"
          aria-label={`Edit ${name}`}
          data-testid={`edit-${user.uid}`}
          className={`${cardClass} cursor-pointer text-left hover:bg-[#F1DED2]/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
          disabled={isPending}
          onClick={() => setDialog("edit")}
        >
          {details}
        </button>
      ) : (
        <div className={cardClass}>{details}</div>
      )}
      <EditUserDialog
        open={dialog === "edit"}
        onOpenChange={(open) => !open && setDialog(null)}
        user={user}
        roles={userRoles.filter((role) => canAssignRole(me, role))}
        moveResetsApproval={me.role === "Local Admin"}
        pending={isPending}
        onSave={(changes) => void save(changes)}
        onRemove={() => setDialog("remove")}
      />
      <ConfirmDialog
        open={dialog === "remove"}
        // Cancelling goes back to the edit dialog the delete was started from.
        onOpenChange={(open) => !open && setDialog("edit")}
        title={`Delete ${name}?`}
        description="This permanently deletes their profile and login. It can't be undone."
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate({ uid: user.uid }, { onSettled: () => setDialog(null) })
        }
      />
    </li>
  );
}
