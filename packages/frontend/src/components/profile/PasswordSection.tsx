import { MIN_PASSWORD_LENGTH } from "@repo/common";
import { useId } from "react";
import { PasswordDisplay } from "@frontend/components/profile/PasswordDisplay.tsx";
import { PasswordField } from "@frontend/components/profile/PasswordField.tsx";
import {
  CANCEL_BUTTON,
  PRIMARY_BUTTON,
} from "@frontend/components/profile/profileButtonStyles.ts";
import { ProfileSection } from "@frontend/components/profile/ProfileSection.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import type { PasswordChange } from "@frontend/hooks/use-password-change.ts";

interface PasswordSectionProps {
  password: PasswordChange;
  /** Called instead of resetting directly, so the page can confirm first. */
  onCancel: () => void;
}

export function PasswordSection({ password, onCancel }: PasswordSectionProps) {
  const hintId = useId();

  // Its own form, because the profile form around the rest of the page would
  // otherwise submit when Enter is pressed in a password field.
  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        password.submit();
      }}
    >
      <ProfileSection
        title="Password"
        className="md:mt-2.5"
        bodyClassName={password.editing ? "pt-4 pb-7" : "pt-6.5 pb-7"}
        action={
          password.editing ? null : (
            // Changing the password is a separate flow from editing the
            // profile, so this doesn't start edit mode.
            <Button
              type="button"
              variant="ghost"
              className="h-5.5 w-40 justify-end px-0 text-lg leading-none font-bold text-[#c75c3b] opacity-80 hover:bg-transparent hover:text-[#c75c3b] md:mr-[0.84375rem]"
              onClick={password.start}
            >
              Change Password
            </Button>
          )
        }
      >
        {password.editing ? (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[repeat(3,minmax(0,16.4375rem))] md:gap-x-40 md:gap-y-11.25">
              <PasswordField
                label="Old Password"
                testId="oldPassword"
                autoComplete="current-password"
                value={password.oldPassword}
                onChange={password.changeOldPassword}
                onBlur={password.blurOldPassword}
                valid={password.oldStatus === "valid"}
                invalid={
                  password.oldStatus === "invalid" ||
                  password.oldStatus === "error"
                }
                below={
                  <>
                    <button
                      type="button"
                      onClick={password.sendPasswordReset}
                      disabled={password.sendingResetEmail}
                      className="rounded-sm text-base leading-9.25 text-[#c75c3b] underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                    >
                      Forgot password?
                    </button>
                    {password.resetEmailSentTo ? (
                      <output className="block text-sm text-black/80">
                        Reset email sent to {password.resetEmailSentTo}
                      </output>
                    ) : null}
                    {password.resetEmailFailed ? (
                      <p role="alert" className="text-sm text-destructive">
                        Couldn&rsquo;t send the reset email. Try again.
                      </p>
                    ) : null}
                  </>
                }
              />
              <PasswordField
                label="New Password"
                testId="newPassword"
                autoComplete="new-password"
                value={password.newPassword}
                onChange={password.changeNewPassword}
                onBlur={password.blurNewPassword}
                invalid={password.newPasswordTooShort}
                describedBy={password.newPasswordTooShort ? hintId : undefined}
              />
              <PasswordField
                label="Confirm New Password"
                testId="confirmPassword"
                autoComplete="new-password"
                value={password.confirmPassword}
                onChange={password.changeConfirmPassword}
                onBlur={password.blurConfirmPassword}
                invalid={password.confirmMismatch}
              />
            </div>
            {/* The Figma leaves 140px between the fields and the buttons, and
                the requirements fill it, so they appear without moving the
                buttons. */}
            <div className="mt-6 grid grid-cols-1 md:mt-0 md:h-35 md:grid-cols-[repeat(3,minmax(0,16.4375rem))] md:gap-x-40 md:pt-2.5">
              {password.newPasswordTooShort ? (
                <div
                  id={hintId}
                  className="opacity-80 md:col-start-2 md:w-85.5"
                >
                  <p className="text-base leading-7.5 font-bold text-[#dc3e42]">
                    Please add all necessary characters to create safe password.
                  </p>
                  <ul className="list-disc pl-6 text-base leading-7.5 text-[#464646]">
                    <li>
                      Minimum <strong>{MIN_PASSWORD_LENGTH}</strong> characters
                    </li>
                  </ul>
                </div>
              ) : null}
            </div>
            {/* Its right end is 45px past the right end of the Confirm New
                Password input, when there is room for that. */}
            <div className="flex flex-wrap items-center justify-end gap-4.25 md:max-w-[72.125rem]">
              {password.saveFailed ? (
                <p role="alert" className="mr-auto text-sm text-destructive">
                  Couldn&rsquo;t update your password. Try again.
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className={CANCEL_BUTTON}
                disabled={password.isSaving}
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={PRIMARY_BUTTON}
                disabled={!password.canSave}
              >
                Save Password
              </Button>
            </div>
          </>
        ) : (
          <PasswordDisplay />
        )}
      </ProfileSection>
    </form>
  );
}
