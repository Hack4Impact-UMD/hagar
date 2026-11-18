import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";
import type { AuthError } from "firebase/auth";
import { auth } from "@frontend/lib/firebase.ts";

// Firebase reports a wrong password as either code, depending on whether
// email enumeration protection is on.
const WRONG_PASSWORD_CODES = ["auth/wrong-password", "auth/invalid-credential"];

export function isWrongPassword(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    WRONG_PASSWORD_CODES.includes((error as AuthError).code)
  );
}

async function reauthenticate(currentPassword: string) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Sign in before changing your password.");
  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, currentPassword),
  );
  return user;
}

/**
 * Whether `password` is the signed-in user's current password. Anything other
 * than a wrong password, such as a network failure or too many attempts,
 * throws, since it says nothing about whether the password is right.
 */
export async function isCurrentPassword(password: string): Promise<boolean> {
  try {
    await reauthenticate(password);
    return true;
  } catch (error) {
    if (isWrongPassword(error)) return false;
    throw error;
  }
}

/**
 * Emails the signed-in user a link for choosing a new password, and returns
 * the address it went to.
 */
export async function sendPasswordReset(): Promise<string> {
  const email = auth.currentUser?.email;
  if (!email) throw new Error("Sign in before resetting your password.");
  await sendPasswordResetEmail(auth, email);
  return email;
}

/**
 * Changes the signed-in user's password. Firebase only allows this shortly
 * after signing in, so the current password is checked again here instead of
 * trusting an earlier check.
 */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const user = await reauthenticate(input.currentPassword);
  await updatePassword(user, input.newPassword);
}
