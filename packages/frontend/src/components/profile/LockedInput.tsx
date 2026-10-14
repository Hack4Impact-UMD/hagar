import { LockIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Input } from "@frontend/components/ui/input.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@frontend/components/ui/tooltip.tsx";

interface LockedInputProps {
  id: string;
  value: string;
}

/**
 * Shows a value the user can't change. It stays focusable so a click can
 * explain why, which `disabled` would prevent.
 */
export function LockedInput({ id, value }: LockedInputProps) {
  const [open, setOpen] = useState(false);

  // `onOpenChange` is left out on purpose: Radix would also open the tooltip
  // on hover and focus and close it when the pointer leaves, but it should
  // only show after a click and stay until focus moves elsewhere.
  return (
    <div>
      <Tooltip open={open}>
        <TooltipTrigger asChild>
          <Input
            id={id}
            value={value}
            readOnly
            aria-readonly
            onClick={() => setOpen(true)}
            onBlur={() => setOpen(false)}
          />
        </TooltipTrigger>
        <TooltipContent>Contact an admin to change this</TooltipContent>
      </Tooltip>
      <LockIcon aria-hidden />
    </div>
  );
}
