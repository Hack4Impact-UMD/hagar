import type { Campaign } from "@repo/common";
import { lazy, Suspense } from "react";
import { Skeleton } from "@frontend/components/ui/skeleton.tsx";

const NotesEditor = lazy(async () => {
  const { NotesEditor } =
    await import("@frontend/components/campaigns/notes-editor.tsx");
  return { default: NotesEditor };
});

/**
 * The campaign's notes. Viewers get them read-only.
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
  return (
    <section
      aria-label="Notes"
      data-testid="campaign-notes"
      className="flex flex-col gap-3"
    >
      <div className="rounded-[0.625rem] bg-card">
        <Suspense fallback={<Skeleton className="h-[34rem] w-full" />}>
          <NotesEditor markdown={campaign.notes} readOnly={!canEdit} />
        </Suspense>
      </div>
    </section>
  );
}
