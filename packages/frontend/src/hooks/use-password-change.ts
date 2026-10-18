import { isValidNewPassword } from "@repo/common";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  changePassword,
  isCurrentPassword,
  isWrongPassword,
  sendPasswordReset,
} from "@frontend/lib/passwordChange.ts";

/**
 * How long typing has to pause before the old password is checked. Checking
 * on every keystroke would send Firebase a request per character, and it
 * locks an account out after too many wrong guesses.
 */
const CHECK_DELAY_MS = 1000;

export type OldPasswordStatus =
  | "idle"
  | "checking"
  | "valid"
  | "invalid"
  | "error";

/** The state and rules of the change password form. */
export function usePasswordChange() {
  const [editing, setEditing] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Mistakes are only pointed out once the user has left the field, so typing
  // a valid password doesn't flash errors on the way there. After that they
  // stay until fixed.
  const [newTouched, setNewTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [oldStatus, setOldStatus] = useState<OldPasswordStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A check that finishes after the user has typed more is out of date.
  const latestCheck = useRef(0);

  const save = useMutation({ mutationFn: changePassword });
  const { reset: resetSave } = save;
  const forgotPassword = useMutation({ mutationFn: sendPasswordReset });
  const { reset: resetForgotPassword } = forgotPassword;

  const cancelPendingCheck = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    latestCheck.current += 1;
  }, []);

  useEffect(() => cancelPendingCheck, [cancelPendingCheck]);

  const check = useCallback(async (password: string) => {
    latestCheck.current += 1;
    const id = latestCheck.current;
    setOldStatus("checking");
    try {
      const matches = await isCurrentPassword(password);
      if (id === latestCheck.current) {
        setOldStatus(matches ? "valid" : "invalid");
      }
    } catch {
      if (id === latestCheck.current) setOldStatus("error");
    }
  }, []);

  const changeOldPassword = (value: string) => {
    cancelPendingCheck();
    setOldPassword(value);
    setOldStatus("idle");
    if (value !== "") {
      timer.current = setTimeout(() => void check(value), CHECK_DELAY_MS);
    }
  };

  // Leaving the field is a pause too, so don't make the user wait out the
  // rest of the delay.
  const blurOldPassword = () => {
    if (oldPassword === "" || oldStatus !== "idle") return;
    cancelPendingCheck();
    void check(oldPassword);
  };

  const start = () => setEditing(true);

  const reset = useCallback(() => {
    cancelPendingCheck();
    setEditing(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setNewTouched(false);
    setConfirmTouched(false);
    setOldStatus("idle");
    resetSave();
    resetForgotPassword();
  }, [cancelPendingCheck, resetSave, resetForgotPassword]);

  const canSave =
    oldStatus === "valid" &&
    isValidNewPassword(newPassword) &&
    confirmPassword === newPassword &&
    !save.isPending;

  const submit = () => {
    if (!canSave) return;
    save.mutate(
      { currentPassword: oldPassword, newPassword },
      {
        onSuccess: reset,
        // The password was changed elsewhere since it was checked.
        onError: (error) => {
          if (isWrongPassword(error)) setOldStatus("invalid");
        },
      },
    );
  };

  return {
    editing,
    start,
    reset,
    oldPassword,
    newPassword,
    confirmPassword,
    changeOldPassword,
    blurOldPassword,
    changeNewPassword: setNewPassword,
    blurNewPassword: () => setNewTouched(true),
    changeConfirmPassword: setConfirmPassword,
    blurConfirmPassword: () => setConfirmTouched(true),
    oldStatus,
    newPasswordTooShort:
      newTouched && newPassword !== "" && !isValidNewPassword(newPassword),
    confirmMismatch:
      confirmTouched &&
      confirmPassword !== "" &&
      confirmPassword !== newPassword,
    canSave,
    isSaving: save.isPending,
    saveFailed: save.isError && !isWrongPassword(save.error),
    submit,
    sendPasswordReset: () => forgotPassword.mutate(),
    /** The address the reset email went to, once it has been sent. */
    resetEmailSentTo: forgotPassword.data ?? null,
    sendingResetEmail: forgotPassword.isPending,
    resetEmailFailed: forgotPassword.isError,
    /** Whether leaving now would throw away something the user typed. */
    isDirty:
      editing &&
      (oldPassword !== "" || newPassword !== "" || confirmPassword !== ""),
  };
}

export type PasswordChange = ReturnType<typeof usePasswordChange>;
