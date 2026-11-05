import type { ComponentProps } from "react";
import { cn } from "cn";

/** The label text style, shared with fields that aren't a plain input. */
export const FIELD_LABEL = "flex flex-col text-base font-semibold gap-2";

type FormFieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string | null;
};

export function FormField({
  label,
  error,
  className,
  ...inputProps
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Wrapping the input labels it without needing a generated id. */}
      <label className={FIELD_LABEL}>
        {label}
        <input
          {...inputProps}
          aria-invalid={error ? true : undefined}
          className={cn(
            "border w-full h-12 sm:h-15 px-4 text-base rounded-[0.625em]",
            className,
          )}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
