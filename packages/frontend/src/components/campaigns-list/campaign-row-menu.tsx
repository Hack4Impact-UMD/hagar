import { DotsThreeVerticalIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ConfirmDialog } from "@frontend/components/confirm-dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@frontend/components/ui/dropdown-menu.tsx";
import { trpc } from "@frontend/lib/trpc.ts";
import { refreshCampaigns } from "@frontend/components/campaigns-list/refresh-campaigns.ts";

function describeDeleteError(error: { data?: { code?: string } | null }) {
  return error.data?.code === "FORBIDDEN"
    ? "You don't have permission to delete campaigns."
    : "Couldn't delete the campaign. Please try again.";
}

// A row's ⋮ button, its menu, and the confirmation before deleting. Only render it for people who can edit.
export function CampaignRowMenu({
  campaignId,
  name,
}: {
  campaignId: string;
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionsRef = useRef<HTMLButtonElement>(null);
  // The refresh lives here rather than in mutate()'s callbacks, which are
  // skipped if the row unmounts before the delete finishes. Returning it keeps
  // the dialog pending until the refreshed list no longer has the row.
  const remove = useMutation(
    trpc.campaigns.delete.mutationOptions({
      onSuccess: () => refreshCampaigns(),
      onError: (failure) => {
        if (failure.data?.code === "NOT_FOUND") void refreshCampaigns();
      },
    }),
  );

  return (
    <>
      {/* Not modal, so closing the menu doesn't fight the dialog it opens
          over focus and page scroll locking. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            ref={actionsRef}
            type="button"
            aria-label={`Actions for ${name}`}
            data-testid={`campaign-actions-${campaignId}`}
            className="relative z-10 ml-auto flex size-8 cursor-pointer items-center justify-center rounded-md text-[#1F1F1F] outline-none hover:bg-[#F1EDE8] focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <DotsThreeVerticalIcon weight="bold" className="size-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-36 rounded-md border-[#D9D4CE] bg-white p-1"
        >
          <DropdownMenuItem
            data-testid={`campaign-delete-${campaignId}`}
            onSelect={() => {
              setError(null);
              setConfirming(true);
            }}
            className="cursor-pointer text-sm text-[#1F1F1F] focus:bg-[#F1DED2]"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        // The dialog opens from a menu item, not a Trigger, so Radix has no
        // element to send focus back to on close. After a delete the row is
        // gone and the ref is null, so focus goes nowhere in particular.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          actionsRef.current?.focus();
        }}
        title="Delete campaign?"
        description={
          <>
            This removes <span className="font-semibold">{name}</span>. Its
            linked emails are not deleted. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete campaign"
        destructive
        pending={remove.isPending}
        onConfirm={() => {
          setError(null);
          remove.mutate(
            { campaignId },
            {
              onSuccess: () => setConfirming(false),
              onError: (failure) => {
                // Someone else already deleted it, so the outcome is the same:
                // close and let the refreshed list drop the row.
                if (failure.data?.code === "NOT_FOUND") {
                  setConfirming(false);
                  return;
                }
                setError(describeDeleteError(failure));
              },
            },
          );
        }}
      >
        {error ? (
          <p
            role="alert"
            data-testid="delete-campaign-error"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
