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
import { ConfirmDialog } from "@frontend/components/user-management/confirm-dialog.tsx";
import { sampleUsers } from "@frontend/components/user-management/sample-data.ts";
import {
  EmptyState,
  ErrorState,
  Pagination,
} from "@frontend/components/user-management/table-states.tsx";
import type { ReportError } from "@frontend/components/user-management/use-user-mutations.ts";
import { useUserMutations } from "@frontend/components/user-management/use-user-mutations.ts";
import {
  describeUserError,
  fullName,
  paginate,
  userRoles,
} from "@frontend/components/user-management/user-helpers.ts";
import { trpc } from "@frontend/lib/trpc.ts";

const PAGE_SIZE = 9;
const COLUMNS = ["Full Name", "Email", "Region", "Actions"];

interface PendingUsersTableProps {
  me: ActiveUserProfile;
  reportError: ReportError;
}

export function PendingUsersTable({ me, reportError }: PendingUsersTableProps) {
  const [page, setPage] = useState(0);
  // TEMP: sample data until the backend lands. Don't commit.
  const users = useQuery({
    ...trpc.users.list.queryOptions({ stage: "AWAITING APPROVAL" }),
    queryFn: () =>
      Promise.resolve(
        sampleUsers.filter((user) => user.stage === "AWAITING APPROVAL"),
      ),
  });

  if (users.isError) {
    return <ErrorState message={describeUserError(users.error).message} />;
  }
  if (users.data?.length === 0) {
    return <EmptyState message="No one is waiting for approval." />;
  }

  const current = users.data ? paginate(users.data, page, PAGE_SIZE) : null;

  return (
    <div className="flex flex-col gap-4">
      <Table data-testid="pending-users-table">
        <TableHeader className="bg-[#F1DED2] dark:bg-muted">
          <TableRow className="hover:bg-transparent">
            {COLUMNS.map((column) => (
              <TableHead
                key={column}
                className="h-11 px-6 font-bold text-center text-[1.125rem] text-foreground"
              >
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {current
            ? current.items.map((user) => (
                <PendingUserRow
                  key={user.uid}
                  me={me}
                  user={user}
                  reportError={reportError}
                />
              ))
            : Array.from({ length: 5 }, (_, row) => (
                <TableRow key={row}>
                  {COLUMNS.map((column) => (
                    <TableCell key={column} className="px-6 py-5">
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
      {current ? (
        <Pagination
          page={current.page}
          pageCount={current.pageCount}
          onPageChange={setPage}
        />
      ) : null}
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
    <TableRow data-testid={`user-row-${user.uid}`}>
      <TableCell className="px-6 py-5 text-center">{name}</TableCell>
      <TableCell className="px-6 py-5 text-center">{user.email}</TableCell>
      <TableCell className="px-6 py-5 text-center">
        {user.region ?? ""}
      </TableCell>
      <TableCell className="px-6 py-5 text-center">
        {canManage(me, user) ? (
          <div className="flex justify-center gap-3">
            <Button
              size="icon-sm"
              className="rounded-full bg-[#A0BD6E] text-white hover:bg-[#8aab58]"
              aria-label={`Approve ${name}`}
              data-testid={`approve-${user.uid}`}
              disabled={isPending}
              onClick={() => setDialog("approve")}
            >
              <CheckIcon />
            </Button>
            <Button
              size="icon-sm"
              className="rounded-full bg-[#EC6753] text-white hover:bg-[#cf5640]"
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
          onApprove={(role) => approve.mutate({ uid: user.uid, role })}
        />
        <ConfirmDialog
          open={dialog === "reject"}
          onOpenChange={closeDialog}
          title={`Reject ${name}?`}
          description="This permanently deletes their account and login. It can't be undone."
          confirmLabel="Reject"
          onConfirm={() => remove.mutate({ uid: user.uid })}
        />
      </TableCell>
    </TableRow>
  );
}
