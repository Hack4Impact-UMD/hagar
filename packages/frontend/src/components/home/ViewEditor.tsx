import { XIcon } from "@phosphor-icons/react";
import type { View, ViewShareOption } from "@repo/common";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import {
  addCard,
  cleanName,
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
  onCancel: () => void;
};

export function ViewEditor({ view, canShare, onCancel }: ViewEditorProps) {
  const [draft, setDraft] = useState(() => draftFromView(view));
  const error = nameError(draft.name);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            aria-invalid={error !== null}
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

        <Button variant="outline" onClick={onCancel} className="ml-auto">
          Cancel
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <ul className="grid gap-6 md:grid-cols-3">
        {draft.cards.map((card) => (
          <li
            key={card.id}
            className="relative flex flex-col gap-4 rounded-lg border p-4 md:first:col-span-3"
          >
            <button
              type="button"
              aria-label={`Remove ${card.name}`}
              onClick={() => setDraft(removeCard(draft, card.id))}
              className="absolute top-2 right-2 rounded-md p-1 hover:bg-muted"
            >
              <XIcon aria-hidden="true" />
            </button>
            <h2 className="pr-8 text-lg">{card.name}</h2>
            <div aria-hidden="true" className="h-48 rounded-md bg-muted" />
          </li>
        ))}
        <li>
          <AddCardDialog onAdd={(name) => setDraft(addCard(draft, name))} />
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

function AddCardDialog({ onAdd }: { onAdd: (name: string) => void }) {
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
          className="flex h-full min-h-48 w-full items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground hover:bg-muted"
        >
          + Add analytic
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
