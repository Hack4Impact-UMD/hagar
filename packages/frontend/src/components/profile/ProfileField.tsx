import { useId } from "react";
import { LockedInput } from "@frontend/components/profile/LockedInput.tsx";
import { Input } from "@frontend/components/ui/input.tsx";

interface ProfileFieldProps {
  label: string;
  value: string;
  /** Renders an input in place of the value while `editing`. */
  input?: { name: string; type: "text" | "tel" };
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
      <div>
        <dt className="field-label">{label}</dt>
        <dd className="field-value">{value}</dd>
      </div>
    );
  }

  return (
    <div>
      <dt>
        {/* A label for a locked field is not tied to the input with `for`:
            clicking a label clicks its input, so the tooltip would open from
            the label's area too. */}
        {input ? (
          <label htmlFor={id} className="field-label">
            {label}
          </label>
        ) : (
          <span id={id} className="field-label">
            {label}
          </span>
        )}
      </dt>
      <dd>
        {input ? (
          <Input
            id={id}
            name={input.name}
            type={input.type}
            defaultValue={value}
            required
            // `required` accepts whitespace, which the server would store as is.
            pattern=".*\S.*"
            data-testid={input.name}
          />
        ) : (
          <LockedInput labelId={id} value={value} />
        )}
      </dd>
    </div>
  );
}
