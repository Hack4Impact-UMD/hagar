import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@frontend/components/ui/dialog.tsx";
import { Input } from "@frontend/components/ui/input.tsx";
import { Label } from "@frontend/components/ui/label.tsx";
import { trpc } from "@frontend/lib/trpc.ts";
import { cleanName } from "@frontend/lib/viewDraft.ts";

type NewViewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (viewId: string) => Promise<void>;
};

export function NewViewDialog({
  open,
  onOpenChange,
  onCreated,
}: NewViewDialogProps) {
  const [name, setName] = useState("");
  const id = useId();

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
    onOpenChange(next);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New view</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-name`}>Name</Label>
            <Input
              id={`${id}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={tooLong}
            />
          </div>

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

          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-sm border-primary px-2.5 text-sm font-normal text-primary"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={!cleaned || create.isPending}
              className="h-8 rounded-sm px-2.5 text-sm font-normal"
            >
              {create.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
