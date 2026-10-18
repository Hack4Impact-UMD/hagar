import { useId } from "react";
import { LockedInput } from "@frontend/components/profile/LockedInput.tsx";
import {
  PROFILE_INPUT_CLASS,
  PROFILE_LABEL_CLASS,
} from "@frontend/components/profile/profileInputStyles.ts";
import { ResizeGrip } from "@frontend/components/profile/ResizeGrip.tsx";
import { Input } from "@frontend/components/ui/input.tsx";

interface ProfileFieldProps {
  label: string;
  value: string;
  /** Renders an input in place of the value while `editing`. */
  input?: { name: string; type: "text" | "tel"; maxLength: number };
  /** Renders a read-only input with a tooltip while `editing`. */
  locked?: boolean;
  editing?: boolean;
}

export function ProfileField({
  label,
  value,
  input,
  locked = false,
  editing = false,
}: ProfileFieldProps) {
  const id = useId();

  if (!editing || (!input && !locked)) {
    return (
      <div className="md:min-h-17">
        <dt className={PROFILE_LABEL_CLASS}>{label}</dt>
        <dd className="text-lg leading-8.5 font-semibold break-words text-black/80">
          {value}
        </dd>
      </div>
    );
  }

  return (
    <div className="md:h-17">
      <dt>
        {/* A label for a locked field is not tied to the input with `for`:
            clicking a label clicks its input, so the tooltip would open from
            the label's area too. */}
        {input ? (
          <label htmlFor={id} className={PROFILE_LABEL_CLASS}>
            {label}
          </label>
        ) : (
          <span id={id} className={PROFILE_LABEL_CLASS}>
            {label}
          </span>
        )}
      </dt>
      {/* The input is offset by its border and padding, so its text sits
          exactly where the value did, and pulled up into the label's line box
          to line up with the value vertically. It is wider than the column
          and spills into the gap beside it. */}
      <dd className="-mt-0.5 md:-ml-[0.6875rem] md:w-65.75">
        {input ? (
          <div className="relative">
            <Input
              id={id}
              name={input.name}
              maxLength={input.maxLength}
              type={input.type}
              defaultValue={value}
              required
              // `required` accepts whitespace, which the server would store as is.
              pattern=".*\S.*"
              data-testid={input.name}
              className={`${PROFILE_INPUT_CLASS} border-[#898887] text-black`}
            />
            <ResizeGrip />
          </div>
        ) : (
          <LockedInput labelId={id} value={value} />
        )}
      </dd>
    </div>
  );
}
