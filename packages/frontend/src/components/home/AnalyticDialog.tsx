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
import { cleanName } from "@frontend/lib/viewDraft.ts";

type AnalyticDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The name to start from when editing an existing analytic. */
  initialName?: string;
  onSave: (name: string) => void;
};

/**
 * Stand-in for the chart editor modal (#84): it only asks for a name, and the
 * caller decides what the rest of the chart is.
 */
export function AnalyticDialog({
  open,
  onOpenChange,
  initialName,
  onSave,
}: AnalyticDialogProps) {
  const editing = initialName !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit analytic" : "Add analytic"}
          </DialogTitle>
        </DialogHeader>
        {/* Only mounted while the dialog is open, so the field starts from
            `initialName` each time instead of keeping the last entry. */}
        <NameForm
          initialName={initialName ?? ""}
          submitLabel={editing ? "Save" : "Add"}
          onSubmit={(name) => {
            onSave(name);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function NameForm({
  initialName,
  submitLabel,
  onSubmit,
}: {
  initialName: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const id = useId();

  const cleaned = cleanName(name);
  const tooLong = name.trim().length > 500;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cleaned) onSubmit(cleaned);
  }

  return (
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
          disabled={!cleaned}
          className="h-8 rounded-sm px-2.5 text-sm font-normal"
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
