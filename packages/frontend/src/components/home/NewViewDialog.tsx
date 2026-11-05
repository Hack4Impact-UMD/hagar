import { useMutation } from "@tanstack/react-query";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import { trpc } from "@frontend/lib/trpc.ts";
import { cleanName } from "@frontend/lib/viewDraft.ts";

type NewViewDialogProps = {
  onCreated: (viewId: string) => Promise<void>;
  disabled?: boolean;
};

export function NewViewDialog({ onCreated, disabled }: NewViewDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const create = useMutation({
    ...trpc.views.create.mutationOptions(),
    onSuccess: async (view) => {
      await onCreated(view.viewId);
      handleOpenChange(false);
    },
  });

  const cleaned = cleanName(name);
  const tooLong = name.trim().length > 500;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setName("");
      create.reset();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cleaned && !create.isPending) create.mutate({ name: cleaned });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="border-primary text-primary"
        >
          New view
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 w-[min(90vw,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg"
        >
          <Dialog.Title className="text-lg font-semibold">
            New view
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
            {create.isError && (
              <p role="alert" className="text-sm text-destructive">
                Couldn&apos;t create the view. Try again.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={!cleaned || create.isPending}>
                {create.isPending ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
