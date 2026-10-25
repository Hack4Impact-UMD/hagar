import { PROFILE_INPUT_CLASS } from "@frontend/components/profile/profileInputStyles.ts";
import { ResizeGrip } from "@frontend/components/profile/ResizeGrip.tsx";
import { Input } from "@frontend/components/ui/input.tsx";

// The hidden state is a fixed run of x's, so its length says nothing about the
// real password.
const HIDDEN_PASSWORD = "xxxxxxxxxxxxxx";

/** The user's password, hidden as x's. */
export function PasswordDisplay() {
  return (
    <div className="relative md:w-65.75">
      <Input
        aria-label="Password"
        value={HIDDEN_PASSWORD}
        readOnly
        className={`${PROFILE_INPUT_CLASS} border-[#898887] text-black`}
      />
      <ResizeGrip />
    </div>
  );
}
