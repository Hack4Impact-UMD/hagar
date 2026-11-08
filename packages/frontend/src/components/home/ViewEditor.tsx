import {
  CaretDownIcon,
  PencilSimpleIcon,
  PlusCircleIcon,
} from "@phosphor-icons/react";
import { chartWidth } from "@repo/common";
import type { View, ViewShareOption } from "@repo/common";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { useState } from "react";
import { ViewCard } from "@frontend/components/home/ViewCard.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@frontend/components/ui/dropdown-menu.tsx";
import { Separator } from "@frontend/components/ui/separator.tsx";
import { trpc } from "@frontend/lib/trpc.ts";

import {
  cleanName,
  diffDraft,
  draftFromView,
  removeCard,
} from "@frontend/lib/viewDraft.ts";

const SHARE_OPTIONS: { value: ViewShareOption; label: string }[] = [
  { value: "PRIVATE", label: "Private" },
  { value: "ANYONE_VIEW", label: "Anyone can view" },
  { value: "ANYONE_EDIT", label: "Anyone can edit" },
];

type ViewEditorProps = {
  view: View;
  canShare: boolean;
  onExit: () => void;
  onNotice: (message: string) => void;
};

export function ViewEditor({
  view,
  canShare,
  onExit,
  onNotice,
}: ViewEditorProps) {
  const queryClient = useQueryClient();
  // The view as last saved. After a partly failed save it includes the part
  // that did save, so a retry sends only the rest.
  const [baseline, setBaseline] = useState(view);
  const [draft, setDraft] = useState(() => draftFromView(view));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const update = useMutation(trpc.views.update.mutationOptions());
  const setShareOption = useMutation(
    trpc.views.setShareOption.mutationOptions(),
  );
  const nameProblem = nameError(draft.name);

  // The page reads the view from the cache, so it shows the saved version
  // right away. The list is refetched because saving moves the view to the top.
  function storeSaved(saved: View) {
    queryClient.setQueryData(
      trpc.views.get.queryKey({ viewId: saved.viewId }),
      saved,
    );
    void queryClient.invalidateQueries({
      queryKey: trpc.views.list.queryKey(),
    });
  }

  async function save() {
    const changes = diffDraft(baseline, draft);
    if (!changes.update && !changes.shareOption) {
      onExit();
      return;
    }

    setSaving(true);
    setSaveError(null);
    // Set once the first call succeeds, to tell a partial save from a failed one.
    let saved: View | null = null;
    try {
      if (changes.update) {
        saved = await update.mutateAsync({
          viewId: view.viewId,
          ...changes.update,
        });
        storeSaved(saved);
      }
      if (changes.shareOption) {
        saved = await setShareOption.mutateAsync({
          viewId: view.viewId,
          shareOption: changes.shareOption,
        });
        storeSaved(saved);
      }
      onExit();
    } catch (error) {
      const code = errorCode(error);
      if (code === "NOT_FOUND") {
        onNotice("That view can't be found.");
        void queryClient.invalidateQueries({
          queryKey: trpc.views.list.queryKey(),
        });
        onExit();
        return;
      }
      if (code === "FORBIDDEN") {
        onNotice("You no longer have permission to edit this view.");
        void queryClient.invalidateQueries({
          queryKey: trpc.views.get.queryKey({ viewId: view.viewId }),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.views.list.queryKey(),
        });
        onExit();
        return;
      }
      if (saved) {
        setBaseline(saved);
        setSaveError(
          "Your name and cards were saved, but the sharing change wasn't. Try again.",
        );
        return;
      }
      setSaveError("Couldn't save your changes. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    // Fills the page's height so the cards scroll between the header and the
    // buttons, which stay in view at the bottom.
    <section data-editing className="flex min-h-0 flex-1 flex-col">
      {/* The label sits above the page's usual title line, so the name field
          lines up with the title in view mode (21px = label height + gap). The
          first column takes the subtitle's width: the label opts out of sizing it,
          so the name field grows with the text up to that width. */}
      <header className="-mt-[21px] grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-[11px]">
        <label className="flex w-0 min-w-full flex-col gap-[5px]">
          <span className="text-base leading-none">View name</span>
          <span className="flex h-[52px] w-max max-w-full min-w-[290px] items-center gap-2 rounded-lg border border-neutral-400 bg-background px-2.5 py-2 has-aria-invalid:border-destructive">
            {/* The hidden copy of the name sets the input's width. */}
            <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] overflow-hidden text-[35px] leading-none font-semibold">
              <span
                aria-hidden="true"
                className="invisible col-start-1 row-start-1 whitespace-pre"
              >
                {draft.name || " "}
              </span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                // Without this, the input's default width of about 20
                // characters would widen the field past the name.
                size={1}
                disabled={saving}
                aria-invalid={nameProblem !== null}
                className="col-start-1 row-start-1 w-full min-w-0 bg-transparent outline-none disabled:opacity-50"
              />
            </span>
            <PencilSimpleIcon
              aria-hidden="true"
              className="size-[27px] shrink-0"
            />
          </span>
        </label>
        <p className="row-start-2 text-2xl leading-none font-medium text-[#808080]">
          Drag cards to reorder. Select X button to remove.
        </p>
        <div className="row-start-2 flex items-center gap-2.5 justify-self-end">
          {canShare && (
            <ShareMenu
              value={draft.shareOption}
              onChange={(shareOption) => setDraft({ ...draft, shareOption })}
              disabled={saving}
            />
          )}
          {/* Placeholder until the backend has a views.delete procedure. */}
          <Button
            disabled={saving}
            className="h-8 w-[117px] gap-1 rounded-sm bg-[#DC3E42] px-2.5 text-sm leading-none font-normal text-white hover:bg-[#DC3E42]/90"
          >
            Delete View
          </Button>
        </div>
      </header>

      <Separator className="mt-8" />

      {nameProblem && (
        <p className="mt-4 text-sm text-destructive">{nameProblem}</p>
      )}
      {saveError && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {saveError}
        </p>
      )}

      {/* Starts right at the line, so cards scroll up to it through the top
          padding instead of stopping 40px short. The side padding, offset by
          the negative margin, keeps the remove buttons that poke out past
          each card's corner from being clipped. */}
      <div className="-mx-4 min-h-[300px] flex-1 overflow-y-auto px-4 pt-10 pb-4">
        <ul className="grid gap-[50px] md:grid-cols-3">
          {draft.cards.map((card) => (
            <ViewCard
              key={card.id}
              name={card.chart.name}
              width={chartWidth(card.chart)}
              onRemove={() => setDraft(removeCard(draft, card.id))}
              disabled={saving}
            />
          ))}
          <li>
            {/* Placeholder until the chart editor modal (#84) exists. Its
              onSave should call `setDraft(addCard(draft, chart))`. */}
            <button
              type="button"
              disabled={saving}
              className="flex h-[270px] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary bg-[#F9F6F1] text-lg font-bold text-primary hover:brightness-95 disabled:opacity-50"
            >
              <PlusCircleIcon aria-hidden="true" size={48} />
              Add analytic
            </button>
          </li>
        </ul>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onExit}
          disabled={saving}
          className="h-8 w-20 gap-1 rounded-sm border-primary px-2.5 text-sm leading-none font-normal text-primary"
        >
          Cancel
        </Button>
        <Button
          onClick={() => void save()}
          disabled={saving || nameProblem !== null}
          className="h-8 w-[130px] gap-1 rounded-sm px-2.5 text-sm leading-none font-normal"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </section>
  );
}

/** Styled like the view picker it replaces while customizing. */
function ShareMenu({
  value,
  onChange,
  disabled,
}: {
  value: ViewShareOption;
  onChange: (value: ViewShareOption) => void;
  disabled: boolean;
}) {
  const label = SHARE_OPTIONS.find((o) => o.value === value)?.label;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label="Who can see this view"
        className="group flex h-8 w-41.5 items-center justify-center gap-1 rounded-sm border border-primary bg-white px-2.5 text-sm font-medium text-primary disabled:opacity-50"
      >
        <span className="truncate">{label}</span>
        <CaretDownIcon
          weight="bold"
          className="size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-180"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="rounded-lg p-0 shadow-lg">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as ViewShareOption)}
        >
          {SHARE_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="rounded-none px-3 py-2 text-sm focus:bg-sidebar data-[state=checked]:bg-sidebar [&_svg]:size-5 [&_svg]:text-primary"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function nameError(name: string): string | null {
  if (cleanName(name)) return null;
  if (name.trim() === "") return "Name is required.";
  return "Name must be 500 characters or fewer.";
}

/** The tRPC error code, such as "NOT_FOUND", or undefined for other errors. */
function errorCode(error: unknown): string | undefined {
  return error instanceof TRPCClientError ? error.data?.code : undefined;
}
