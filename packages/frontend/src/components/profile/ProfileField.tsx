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
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    );
  }

  return (
    <div>
      <dt>
        <label htmlFor={id}>{label}</label>
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
          <LockedInput id={id} value={value} />
        )}
      </dd>
    </div>
  );
}
