import { LockSimpleIcon } from "@phosphor-icons/react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { useState } from "react";
import { PROFILE_INPUT_CLASS } from "@frontend/components/profile/profileInputStyles.ts";
import { ResizeGrip } from "@frontend/components/profile/ResizeGrip.tsx";
import { Input } from "@frontend/components/ui/input.tsx";
import { Tooltip, TooltipTrigger } from "@frontend/components/ui/tooltip.tsx";

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
        className={`${PROFILE_INPUT_CLASS} border-[#d9d9d9] bg-background pr-10 text-[#808080]`}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      <ResizeGrip />
      <Tooltip open={open}>
        {/* The tooltip positions itself against its trigger, so an invisible
            layer over the whole input is the trigger to center the bubble on
            the input. It ignores the pointer, so clicks still reach the input
            beneath. */}
        <TooltipTrigger asChild>
          <span aria-hidden className="pointer-events-none absolute inset-0" />
        </TooltipTrigger>
        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground">
          <LockSimpleIcon aria-hidden className="size-5" />
        </span>
        {/* Built from the Radix parts instead of the shared `TooltipContent`
            because the Figma gives this tooltip its own colors and a flat
            triangle arrow. */}
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="top"
            sideOffset={0}
            className="z-50 w-60 rounded-md bg-[#e5e5e5] px-3 py-2 text-sm leading-5 text-[#0a0a0a] shadow-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=top]:slide-in-from-bottom-2"
          >
            Contact an admin to change this
            <TooltipPrimitive.Arrow
              width={10}
              height={6}
              className="fill-[#e5e5e5]"
            />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </Tooltip>
    </div>
  );
}
