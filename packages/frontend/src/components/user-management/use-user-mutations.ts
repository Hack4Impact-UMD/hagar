import { useMutation } from "@tanstack/react-query";
import { describeUserError } from "@common/user-helpers.ts";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";

/* Shows a message to the admin */
export type ReportError = (message: string) => void;

// One filter covers both tabs and every region, which matters because
// approving or moving someone shifts them between lists.
function refreshUserLists() {
  return queryClient.invalidateQueries(trpc.users.list.pathFilter());
}

/*
  The user management mutations for a single row. Call it once per row so
  'isPending' only locks the row being changed. 'me' is never updated.
 */
export function useUserMutations(reportError: ReportError) {
  const handlers = {
    // Returning the refetch keeps the row locked until the list reflects the
    // change, so the admin can't act on a stale row.
    onSuccess: () => refreshUserLists(),
    onError: (error: { data?: { code?: string } | null }) => {
      const { message, refresh } = describeUserError(error);
      reportError(message);
      if (refresh) void refreshUserLists();
    },
  };

  const approve = useMutation(trpc.users.approve.mutationOptions(handlers));
  const setRole = useMutation(trpc.users.setRole.mutationOptions(handlers));
  const setRegion = useMutation(trpc.users.setRegion.mutationOptions(handlers));
  const remove = useMutation(trpc.users.delete.mutationOptions(handlers));

  return {
    approve,
    setRole,
    setRegion,
    remove,
    isPending:
      approve.isPending ||
      setRole.isPending ||
      setRegion.isPending ||
      remove.isPending,
  };
}
