import { useId } from "react";
import { Input } from "@frontend/components/ui/input.tsx";

interface ProfileFieldProps {
  label: string;
  value: string;
  /** Renders an input in place of the value while `editing`. */
  input?: { name: string; type: "text" | "tel" };
  editing?: boolean;
}

export function ProfileField({
  label,
  value,
  input,
  editing = false,
}: ProfileFieldProps) {
  const id = useId();

  if (!editing || !input) {
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
      </dd>
    </div>
  );
}
