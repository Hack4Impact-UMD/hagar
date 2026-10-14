import { LockIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Input } from "@frontend/components/ui/input.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@frontend/components/ui/tooltip.tsx";

interface LockedInputProps {
  /** The id of the element that labels the input. */
  labelId: string;
  value: string;
}

/**
 * Shows a value the user can't change. It stays focusable so a click can
 * explain why, which `disabled` would prevent.
 */
export function LockedInput({ labelId, value }: LockedInputProps) {
  const [open, setOpen] = useState(false);

  // `onOpenChange` is left out on purpose: Radix would also open the tooltip
  // on hover and focus and close it when the pointer leaves, but it should
  // only show after a click and stay until focus moves elsewhere.
  return (
    <div className="relative">
      <Input
        aria-labelledby={labelId}
        value={value}
        readOnly
        aria-readonly
        className="bg-muted pr-9"
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      <Tooltip open={open}>
        {/* The tooltip positions itself against its trigger, so the lock icon
            is the trigger to make the bubble appear above the icon. The icon
            ignores the pointer, so clicks still reach the input beneath. */}
        <TooltipTrigger asChild>
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
            <LockIcon aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          // Light bubble instead of the default dark one.
          className="bg-muted text-foreground shadow-md"
        >
          Contact an admin to change this
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
