import type { Campaign } from "@repo/common";
import { useMutation } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";

const NotesEditor = lazy(async () => {
  const { NotesEditor } =
    await import("@frontend/components/campaigns/notes-editor.tsx");
  return { default: NotesEditor };
});

// Matches the `campaignNotes` schema in `@repo/common`, which doesn't export
// the number. The editor counts in UTF-16 code units, as the schema does.
const MAX_CAMPAIGN_NOTES_LENGTH = 10_000;

const TOO_LONG = `Notes can be at most ${MAX_CAMPAIGN_NOTES_LENGTH.toLocaleString("en-US")} characters.`;

/**
 * The campaign's notes, saved with a button rather than as the user types:
 * every save bumps `updatedAt`, which reorders the campaign list.
 *
 * Mount it with `key={campaign.campaignId}` so moving to another campaign
 * starts from that campaign's notes.
 */
export function CampaignNotes({
  campaign,
  canEdit,
}: {
  campaign: Campaign;
  canEdit: boolean;
}) {
  // `saved` is what the server holds, in the editor's normalized form, so
  // opening the notes without typing never counts as a change.
  const [saved, setSaved] = useState(campaign.notes);
  const [draft, setDraft] = useState(campaign.notes);

  const save = useMutation(
    trpc.campaigns.setNotes.mutationOptions({
      onSuccess: (updated, { notes }) => {
        setSaved(notes);
        queryClient.setQueryData(
          trpc.campaigns.get.queryKey({ campaignId: campaign.campaignId }),
          updated,
        );
        void queryClient.invalidateQueries(trpc.campaigns.list.queryFilter());
      },
    }),
  );

  const tooLong = draft.length > MAX_CAMPAIGN_NOTES_LENGTH;
  const dirty = draft !== saved;
  const error = tooLong
    ? TOO_LONG
    : save.isError
      ? // The campaign id comes from the URL and is never empty, so the only
        // input the server can reject is the notes' length.
        save.error.data?.code === "BAD_REQUEST"
        ? TOO_LONG
        : save.error.data?.code === "FORBIDDEN"
          ? "You don't have permission to edit these notes."
          : "Couldn't save the notes. Your changes are still here, so try again."
      : null;

  return (
    <section
      aria-label="Notes"
      data-testid="campaign-notes"
      className="flex flex-col gap-3"
    >
      <div className="rounded-[0.625rem] bg-card">
        <Suspense fallback={<Skeleton className="h-[34rem] w-full" />}>
          <NotesEditor
            markdown={campaign.notes}
            readOnly={!canEdit}
            onChange={(markdown, normalized) => {
              if (normalized) setSaved(markdown);
              setDraft(markdown);
            }}
          />
        </Suspense>
      </div>
      {error ? (
        <p
          role="alert"
          data-testid="notes-error"
          className="text-destructive text-sm"
        >
          {error}
        </p>
      ) : null}
      {canEdit ? (
        <div className="flex items-center justify-end gap-3">
          {save.isSuccess && !dirty ? (
            <span
              data-testid="notes-saved"
              className="text-muted-foreground text-sm"
            >
              Saved
            </span>
          ) : null}
          <Button
            data-testid="save-notes"
            disabled={!dirty || tooLong || save.isPending}
            onClick={() =>
              save.mutate({ campaignId: campaign.campaignId, notes: draft })
            }
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
