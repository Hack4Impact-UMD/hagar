import { EnvelopeIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";
import { AuthLayout } from "@frontend/components/auth/AuthLayout.tsx";
import { NoticeLayout } from "@frontend/components/auth/NoticeLayout.tsx";
import { FormField } from "@frontend/components/form/FormField.tsx";
import { SubmitButton } from "@frontend/components/form/SubmitButton.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import {
  RESEND_COOLDOWN_SECONDS,
  useCooldown,
} from "@frontend/hooks/use-cooldown.ts";
import { authErrorMessage } from "@frontend/lib/authErrors.ts";
import { auth } from "@frontend/lib/firebase.ts";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

/**
 * Sends a reset link. With email enumeration protection on, Firebase reports
 * success for unknown emails. Without it (as in the auth emulator), it reports
 * `auth/user-not-found`, which is treated as success too so the page never
 * reveals whether an account exists.
 */
async function sendResetLink(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "auth/user-not-found")
      return;
    throw error;
  }
}

function ForgotPassword() {
  const [email, setEmail] = useState("");
  // The address the last link went to. Kept apart from `email` so the
  // confirmation and resends use what was submitted, not later edits.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);

  const send = useMutation({
    mutationFn: sendResetLink,
    onSuccess: (_, to) => {
      setSentTo(to);
      cooldown.start();
    },
  });
  const error = send.error ? authErrorMessage(send.error) : undefined;

  if (sentTo !== null) {
    return (
      <NoticeLayout icon={EnvelopeIcon} title="Check your email">
        <p
          data-testid="reset-email-status"
          className="mt-6 max-w-122.5 text-base/5 text-[#1c1917]"
        >
          If an account exists for{" "}
          <span className="font-semibold">{sentTo}</span>, we sent it a link to
          reset the password. If you don’t see it, you may need to check your
          spam folder.
        </p>
        <Button
          type="button"
          data-testid="resend-reset"
          disabled={send.isPending || cooldown.secondsLeft > 0}
          onClick={() => send.mutate(sentTo)}
          className="mt-8 h-17.5 w-full max-w-82.25 rounded-[10px] text-base font-semibold"
        >
          {cooldown.secondsLeft > 0
            ? `Resend in ${cooldown.secondsLeft}s`
            : "Resend reset link"}
        </Button>
        {error ? <p role="alert">{error}</p> : null}
        <Button asChild variant="link" data-testid="back-to-login">
          <Link to="/login">Back to login</Link>
        </Button>
      </NoticeLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot password"
      prompt={
        <>
          Remembered it?{" "}
          <Link to="/login" className="underline text-primary">
            Login
          </Link>
        </>
      }
      onSubmit={() => send.mutate(email)}
      error={error}
    >
      <FormField
        label="Email"
        type="email"
        required
        value={email}
        disabled={send.isPending}
        data-testid="email"
        onChange={(event) => setEmail(event.target.value)}
      />
      <SubmitButton
        pending={send.isPending}
        data-testid="send-reset-link"
        className="mt-7.5"
      >
        Send reset link
      </SubmitButton>
    </AuthLayout>
  );
}
