import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { PROFILE_INPUT_CLASS } from "@frontend/components/profile/profileInputStyles.ts";
import { ResizeGrip } from "@frontend/components/profile/ResizeGrip.tsx";
import { Input } from "@frontend/components/ui/input.tsx";

// The hidden state is a fixed run of x's, so its length says nothing about the
// real password.
const HIDDEN_PASSWORD = "xxxxxxxxxxxxxx";

// Stub: Firebase never hands the page a user's password, so there is nothing
// real to reveal yet.
const STUBBED_PASSWORD = "stub-password";

/** The user's password, hidden as x's until the toggle reveals it. */
export function PasswordDisplay() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative md:w-65.75">
      <Input
        aria-label="Password"
        value={visible ? STUBBED_PASSWORD : HIDDEN_PASSWORD}
        readOnly
        className={`${PROFILE_INPUT_CLASS} border-[#898887] pr-10 text-black`}
      />
      <ResizeGrip />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-sm text-black outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? (
          <EyeIcon aria-hidden className="size-5" />
        ) : (
          <EyeSlashIcon aria-hidden className="size-5" />
        )}
      </button>
    </div>
  );
}
