import { CheckCircleIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import {
  PROFILE_INPUT_CLASS,
  PROFILE_LABEL_CLASS,
} from "@frontend/components/profile/profileInputStyles.ts";
import { ResizeGrip } from "@frontend/components/profile/ResizeGrip.tsx";
import { Input } from "@frontend/components/ui/input.tsx";

// What a password looks like once the user has left its field. Its length says
// nothing about the real one.
const HIDDEN_PASSWORD = "xxxxxxxxxxxxxx";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Shows the green outline and check mark. */
  valid?: boolean;
  /** Shows the red outline. */
  invalid?: boolean;
  autoComplete: "current-password" | "new-password";
  /** The id of text that explains why the field is invalid. */
  describedBy?: string;
  testId: string;
  /** Content under the input, e.g. a link. It may extend past the field. */
  below?: ReactNode;
}

/**
 * A password input that shows what is typed while it has focus and x's
 * otherwise. It is a text input because the x's are real text, not dots.
 */
export function PasswordField({
  label,
  value,
  onChange,
  onBlur,
  valid = false,
  invalid = false,
  autoComplete,
  describedBy,
  testId,
  below,
}: PasswordFieldProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);

  return (
    <div className="md:h-17">
      {/* "Confirm New Password" is wider than the 194px column, so it spills
          into the gap beside it instead of wrapping onto a second line. */}
      <label
        htmlFor={id}
        className={`${PROFILE_LABEL_CLASS} whitespace-nowrap`}
      >
        {label}
      </label>
      <div className="-mt-0.5 md:max-w-65.75">
        <div className="relative">
          <Input
            id={id}
            type="text"
            value={focused || value === "" ? value : HIDDEN_PASSWORD}
            autoComplete={autoComplete}
            // A text input gets the phone keyboard's capitalizing and
            // autocorrect by default, which would change what the user typed
            // and so the password that gets saved.
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            data-testid={testId}
            data-valid={valid}
            className={`${PROFILE_INPUT_CLASS} pr-10 text-black ${
              valid
                ? "border-[#16a34a] focus-visible:border-[#16a34a]"
                : "border-[#898887]"
            }`}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              onBlur?.();
            }}
          />
          <ResizeGrip />
          {valid ? (
            <CheckCircleIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-2.5 size-6 -translate-y-1/2 text-[#16a34a]"
            />
          ) : null}
        </div>
        {below}
      </div>
    </div>
  );
}
