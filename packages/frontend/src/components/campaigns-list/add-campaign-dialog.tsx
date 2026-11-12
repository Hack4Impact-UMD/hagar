import type { UserRegion } from "@repo/common";
import { userRegions } from "@repo/common";
import { CircleNotchIcon, PlusCircleIcon } from "@phosphor-icons/react";
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
  DialogTrigger,
} from "@frontend/components/ui/dialog.tsx";
import { Input } from "@frontend/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select.tsx";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";

// Matches the cap on `name` in `storedCampaign`, so the backend never has to
// reject a name the form let through.
const NAME_MAX_LENGTH = 500;

const FIELD_LABEL = "flex flex-col gap-1.5 text-sm text-[#464646]";
const FIELD_BOX =
  "h-9 rounded-md border-[#D9D4CE] px-3 text-sm text-[#1F1F1F] shadow-none md:text-sm";

function describeCreateError(error: { data?: { code?: string } | null }) {
  switch (error.data?.code) {
    case "FORBIDDEN":
      return "You don't have permission to add campaigns.";
    case "BAD_REQUEST":
      return "Check the name and region, then try again.";
    default:
      return "Couldn't add the campaign. Please try again.";
  }
}

/**
 * The orange "Add Campaign" button and the dialog it opens. Only render it for
 * people who can edit; the backend refuses Viewers either way.
 */
export function AddCampaignButton() {
  const [open, setOpen] = useState(false);
  const create = useMutation(
    trpc.campaigns.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.campaigns.list.queryFilter());
        setOpen(false);
      },
    }),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Escape and the overlay would otherwise close it mid-request.
        if (create.isPending) return;
        // Each opening starts without the last attempt's error.
        if (next) create.reset();
        setOpen(next);
      }}
    >
      {/* A trigger, so focus returns to the button when the dialog closes. */}
      <DialogTrigger asChild>
        <Button
          type="button"
          data-testid="add-campaign-button"
          className="h-9.5 cursor-pointer gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <PlusCircleIcon className="size-5" />
          Add Campaign
        </Button>
      </DialogTrigger>
      <DialogContent
        data-testid="add-campaign-dialog"
        className="px-8 sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl leading-normal font-bold text-black">
            Add Campaign
          </DialogTitle>
        </DialogHeader>
        {/* Content unmounts on close, so the form starts empty on every open. */}
        <AddCampaignForm
          pending={create.isPending}
          error={create.error ? describeCreateError(create.error) : null}
          onSubmit={(input) => create.mutate(input)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddCampaignForm({
  pending,
  error,
  onSubmit,
}: {
  pending: boolean;
  error: string | null;
  onSubmit: (input: { name: string; region: UserRegion }) => void;
}) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState<UserRegion | undefined>();
  const id = useId();
  // A name of only spaces would show up as a blank row in the table.
  const trimmed = name.trim();
  const ready = trimmed !== "" && region !== undefined;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) onSubmit({ name: trimmed, region });
      }}
    >
      <fieldset disabled={pending} className="flex flex-col gap-5">
        <label htmlFor={`${id}-name`} className={FIELD_LABEL}>
          Campaign name
          <Input
            id={`${id}-name`}
            required
            maxLength={NAME_MAX_LENGTH}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Year-End Giving Appeal"
            data-testid="add-campaign-name"
            className={FIELD_BOX}
          />
        </label>

        <div className={FIELD_LABEL}>
          <span id={`${id}-region`}>Region</span>
          <Select
            value={region ?? ""}
            onValueChange={(next) => setRegion(next as UserRegion)}
            disabled={pending}
          >
            <SelectTrigger
              className={`w-full data-[size=default]:h-9 ${FIELD_BOX}`}
              aria-labelledby={`${id}-region`}
              data-testid="add-campaign-region"
            >
              <SelectValue placeholder="Select a region" />
            </SelectTrigger>
            <SelectContent position="popper">
              {userRegions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <p
            role="alert"
            data-testid="add-campaign-error"
            className="text-sm leading-normal text-destructive"
          >
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-sm border-primary bg-white text-sm text-primary hover:bg-primary/10 hover:text-primary"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            size="sm"
            disabled={!ready}
            data-testid="add-campaign-submit"
            className="rounded-sm bg-primary text-sm text-primary-foreground hover:bg-primary/90"
          >
            {pending ? <CircleNotchIcon className="animate-spin" /> : null}
            Add campaign
          </Button>
        </DialogFooter>
      </fieldset>
    </form>
  );
}
