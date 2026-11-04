import { PlusCircleIcon } from "@phosphor-icons/react";
import type { View, ViewShareOption } from "@repo/common";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { ViewCard } from "@frontend/components/home/ViewCard.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import { trpc } from "@frontend/lib/trpc.ts";

import {
  addCard,
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
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            disabled={saving}
            aria-invalid={nameProblem !== null}
            className="w-72 rounded-md border px-3 py-1.5"
          />
        </label>

        {canShare && (
          <label className="flex flex-col gap-1 text-sm">
            Sharing
            <select
              value={draft.shareOption}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  shareOption: e.target.value as ViewShareOption,
                })
              }
              disabled={saving}
              className="rounded-md border px-3 py-1.5"
            >
              {SHARE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={onExit} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving || nameProblem !== null}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {nameProblem && <p className="text-sm text-destructive">{nameProblem}</p>}
      {saveError && (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      )}

      <ul className="grid gap-10 md:grid-cols-3">
        {draft.cards.map((card) => (
          <ViewCard
            key={card.id}
            name={card.name}
            onRemove={() => setDraft(removeCard(draft, card.id))}
            disabled={saving}
          />
        ))}
        <li>
          <AddCardDialog
            onAdd={(name) => setDraft(addCard(draft, name))}
            disabled={saving}
          />
        </li>
      </ul>
    </section>
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

function AddCardDialog({
  onAdd,
  disabled,
}: {
  onAdd: (name: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const cleaned = cleanName(name);
  const tooLong = name.trim().length > 500;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setName("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cleaned) return;
    onAdd(cleaned);
    handleOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary bg-[#F9F6F1] text-lg font-bold text-primary hover:brightness-95 disabled:opacity-50"
        >
          <PlusCircleIcon aria-hidden="true" size={48} />
          Add analytic
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 w-[min(90vw,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg"
        >
          <Dialog.Title className="text-lg font-semibold">
            Add analytic
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-md border px-3 py-1.5"
              />
            </label>

            {tooLong && (
              <p className="text-sm text-destructive">
                Name must be 500 characters or fewer.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={!cleaned}>
                Add
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
