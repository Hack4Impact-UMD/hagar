import { FirebaseError } from "firebase/app";

const MESSAGES: Record<string, string> = {
  // Firebase's email enumeration protection reports a wrong email and a wrong
  // password as the same code, and the message should not tell them apart
  // either.
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Try again in a few minutes.",
  "auth/network-request-failed":
    "Couldn't reach the server. Check your connection and try again.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password must be at least 8 characters.",
  "auth/expired-action-code": "This link has expired.",
  "auth/invalid-action-code": "This link is invalid or has already been used.",
};

const BAD_CREDENTIAL_CODES = [
  "auth/invalid-credential",
  "auth/user-not-found",
  "auth/wrong-password",
];

export function isBadCredentials(error: unknown): boolean {
  return (
    error instanceof FirebaseError && BAD_CREDENTIAL_CODES.includes(error.code)
  );
}

export function authErrorMessage(error: unknown): string {
  const message = error instanceof FirebaseError ? MESSAGES[error.code] : null;
  return message ?? "Something went wrong. Please try again.";
}
