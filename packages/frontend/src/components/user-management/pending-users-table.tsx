import type { ActiveUserProfile, UserProfile } from "@repo/common";
import { canAssignRole, canManage } from "@repo/common";
import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@frontend/components/ui/table.tsx";
import { ApproveDialog } from "@frontend/components/user-management/approve-dialog.tsx";
import { ConfirmDialog } from "@frontend/components/confirm-dialog.tsx";
import {
  EmptyState,
  ErrorState,
} from "@frontend/components/user-management/table-states.tsx";
import type { ReportError } from "@frontend/components/user-management/use-user-mutations.ts";
import { useUserMutations } from "@frontend/components/user-management/use-user-mutations.ts";
import { UserAvatar } from "@frontend/components/user-management/user-avatar.tsx";
import {
  describeUserError,
  fullName,
  userRoles,
} from "@common/user-helpers.ts";
import { trpc } from "@frontend/lib/trpc.ts";

// Widths only take effect because the table uses `table-fixed`.
const COLUMNS = [
  { label: "Photo", width: "w-[7%]" },
  { label: "Full Name", width: "w-[19%]" },
  { label: "Email", width: "w-[22%]" },
  { label: "Role", width: "w-[18%]" },
  { label: "Region", width: "w-[21%]" },
  { label: "Actions", width: "w-[13%]" },
];

// Below this the columns get too cramped (the actions column needs ~130px), so
// the table scrolls sideways instead of shrinking further.
const TABLE_MIN_WIDTH = "min-w-[64rem]";

const ROW_CLASS = "h-23 bg-white hover:bg-white";
const CELL_TEXT = "truncate text-lg leading-[1.4375rem] text-black";
const CELL_CLASS = `${CELL_TEXT} px-5`;

interface PendingUsersTableProps {
  me: ActiveUserProfile;
  reportError: ReportError;
}

export function PendingUsersTable({ me, reportError }: PendingUsersTableProps) {
  const users = useQuery(
    trpc.users.list.queryOptions({ stage: "AWAITING APPROVAL" }),
  );

  if (users.isError) {
    return <ErrorState message={describeUserError(users.error).message} />;
  }
  if (users.data?.length === 0) {
    return <EmptyState message="No one is waiting for approval." />;
  }

  return (
    <div className="px-6 md:px-10">
      {/* Side outline lives here because a collapsed-border table draws half of
          an edge border outside itself, where Table's scroll container clips it. */}
      <div className="border-x border-[#E5E5E5]">
        <Table
          data-testid="pending-users-table"
          // TableBody strips the last row's bottom border; the design keeps it so
          // the table is closed off.
          className={`${TABLE_MIN_WIDTH} table-fixed [&_tr]:border-[#E5E5E5] [&_tbody_tr:last-child]:border-b!`}
        >
          <TableHeader>
            <TableRow className="bg-[#F1DED2] hover:bg-[#F1DED2]">
              {COLUMNS.map(({ label, width }) => (
                <TableHead
                  key={label}
                  className={`${width} h-auto px-5 py-[1.1875rem] text-sm leading-[1.125rem] font-semibold text-black`}
                >
                  {label === "Photo" ? (
                    <span className="sr-only">{label}</span>
                  ) : (
                    label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.data
              ? users.data.map((user) => (
                  <PendingUserRow
                    key={user.uid}
                    me={me}
                    user={user}
                    reportError={reportError}
                  />
                ))
              : Array.from({ length: 5 }, (_, row) => (
                  <TableRow key={row} className={ROW_CLASS}>
                    {COLUMNS.map(({ label }) => (
                      <TableCell key={label} className="px-5">
                        {label === "Photo" ? (
                          <Skeleton className="size-11 rounded-full" />
                        ) : (
                          <Skeleton className="h-5 w-full" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface PendingUserRowProps {
  me: ActiveUserProfile;
  user: UserProfile;
  reportError: ReportError;
}

function PendingUserRow({ me, user, reportError }: PendingUserRowProps) {
  const { approve, remove, isPending } = useUserMutations(reportError);
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const name = fullName(user);
  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null);
  };

  return (
    <TableRow data-testid={`user-row-${user.uid}`} className={ROW_CLASS}>
      <TableCell className="pr-0 pl-5">
        <UserAvatar user={user} className="size-11" />
      </TableCell>
      <TableCell className={`${CELL_TEXT} pr-5 pl-3`}>{name}</TableCell>
      <TableCell className={CELL_CLASS}>{user.email}</TableCell>
      <TableCell className={CELL_CLASS}>{user.role}</TableCell>
      <TableCell className={CELL_CLASS}>{user.region ?? ""}</TableCell>
      <TableCell className="px-5">
        {canManage(me, user) ? (
          <div className="flex gap-3.75">
            <Button
              size="icon-sm"
              className="size-9 cursor-pointer rounded-full bg-[#A0BD6E] text-[#FAFAFA] hover:bg-[#adc97c]"
              aria-label={`Approve ${name}`}
              data-testid={`approve-${user.uid}`}
              disabled={isPending}
              onClick={() => setDialog("approve")}
            >
              <CheckIcon />
            </Button>
            <Button
              size="icon-sm"
              className="size-9 cursor-pointer rounded-full bg-[#DC3E42] text-[#FAFAFA] hover:bg-[#EC6753]"
              aria-label={`Reject ${name}`}
              data-testid={`reject-${user.uid}`}
              disabled={isPending}
              onClick={() => setDialog("reject")}
            >
              <XIcon />
            </Button>
          </div>
        ) : null}
        <ApproveDialog
          name={name}
          roles={userRoles.filter((role) => canAssignRole(me, role))}
          open={dialog === "approve"}
          onOpenChange={closeDialog}
          pending={approve.isPending}
          onApprove={(role) =>
            approve.mutate(
              { uid: user.uid, role },
              { onSettled: () => setDialog(null) },
            )
          }
        />
        <ConfirmDialog
          open={dialog === "reject"}
          onOpenChange={closeDialog}
          title={`Reject ${name}?`}
          description="This permanently deletes their account and login. It can't be undone."
          confirmLabel="Reject"
          destructive
          pending={remove.isPending}
          onConfirm={() =>
            remove.mutate(
              { uid: user.uid },
              { onSettled: () => setDialog(null) },
            )
          }
        />
      </TableCell>
    </TableRow>
  );
}
