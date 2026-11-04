import type { ComponentProps } from "react";
import { cn } from "cn";

type SubmitButtonProps = ComponentProps<"button"> & { pending: boolean };

export function SubmitButton({
  pending,
  className,
  children,
  ...buttonProps
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "flex items-center justify-center gap-3 bg-primary text-white font-bold w-full h-14 sm:h-17.5 rounded-[0.625em] hover:bg-primary/90 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed",
        className,
      )}
      {...buttonProps}
    >
      {pending ? (
        <span
          aria-hidden="true"
          className="size-5 motion-safe:animate-[spin_1.5s_linear_infinite] rounded-full border-2 border-white/40 border-t-white"
        />
      ) : null}
      {children}
    </button>
  );
}
